// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.0;

import {GelatoRelayContext} from "@gelatonetwork/relay-context/contracts/GelatoRelayContext.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "../../data/DataStore.sol";
import "../../event/EventEmitter.sol";
import "../../exchange/IOrderHandler.sol";
import "../../external/IExternalHandler.sol";
import "../../feature/FeatureUtils.sol";
import "../../nonce/NonceUtils.sol";
import "../../oracle/OracleModule.sol";
import "../../order/IBaseOrderUtils.sol";
import "../../order/OrderStoreUtils.sol";
import "../../order/OrderVault.sol";
import "../../router/Router.sol";
import "../../swap/SwapUtils.sol";
import "../../token/TokenUtils.sol";

abstract contract BaseGelatoRelayRouter is GelatoRelayContext, ReentrancyGuard, OracleModule {
    using Order for Order.Props;

    struct TokenPermit {
        address owner;
        address spender;
        uint256 value;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
        address token;
    }

    struct ExternalCalls {
        address[] externalCallTargets;
        bytes[] externalCallDataList;
        address[] refundTokens;
        address[] refundReceivers;
    }

    struct FeeParams {
        address feeToken;
        uint256 feeAmount;
        address[] feeSwapPath;
    }

    struct RelayParams {
        OracleUtils.SetPricesParams oracleParams;
        ExternalCalls externalCalls;
        TokenPermit[] tokenPermits;
        FeeParams fee;
        uint256 userNonce;
        uint256 deadline;
        bytes signature;
    }

    // @note all params except account should be part of the corresponding struct hash
    struct UpdateOrderParams {
        uint256 sizeDeltaUsd;
        uint256 acceptablePrice;
        uint256 triggerPrice;
        uint256 minOutputAmount;
        uint256 validFromTime;
        bool autoCancel;
    }

    struct Contracts {
        DataStore dataStore;
        EventEmitter eventEmitter;
        OrderVault orderVault;
    }

    IOrderHandler public immutable orderHandler;
    OrderVault public immutable orderVault;
    Router public immutable router;
    DataStore public immutable dataStore;
    EventEmitter public immutable eventEmitter;
    IExternalHandler public immutable externalHandler;

    bytes32 public constant DOMAIN_SEPARATOR_TYPEHASH =
        keccak256(bytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"));

    bytes32 public constant DOMAIN_SEPARATOR_NAME_HASH = keccak256(bytes("GmxBaseGelatoRelayRouter"));
    bytes32 public constant DOMAIN_SEPARATOR_VERSION_HASH = keccak256(bytes("1"));

    mapping(address => uint256) public userNonces;

    constructor(
        Router _router,
        DataStore _dataStore,
        EventEmitter _eventEmitter,
        Oracle _oracle,
        IOrderHandler _orderHandler,
        OrderVault _orderVault,
        IExternalHandler _externalHandler
    ) OracleModule(_oracle) {
        orderHandler = _orderHandler;
        orderVault = _orderVault;
        router = _router;
        dataStore = _dataStore;
        eventEmitter = _eventEmitter;
        externalHandler = _externalHandler;
    }

    function _validateSignature(
        bytes32 digest,
        bytes calldata signature,
        address expectedSigner,
        string memory signatureType
    ) internal pure {
        (address recovered, ECDSA.RecoverError error) = ECDSA.tryRecover(digest, signature);
        if (error != ECDSA.RecoverError.NoError || recovered != expectedSigner) {
            revert Errors.InvalidSignature(signatureType);
        }
    }

    function _createOrder(
        RelayParams calldata relayParams,
        address account,
        uint256 collateralDeltaAmount,
        IBaseOrderUtils.CreateOrderParams memory params, // can't use calldata because need to modify params.numbers.executionFee
        bool isSubaccount
    ) internal returns (bytes32) {
        Contracts memory contracts = Contracts({
            dataStore: dataStore,
            eventEmitter: eventEmitter,
            orderVault: orderVault
        });

        params.numbers.executionFee = _handleRelay(contracts, relayParams, account, address(contracts.orderVault), isSubaccount);

        if (
            params.orderType == Order.OrderType.MarketSwap ||
            params.orderType == Order.OrderType.LimitSwap ||
            params.orderType == Order.OrderType.MarketIncrease ||
            params.orderType == Order.OrderType.LimitIncrease ||
            params.orderType == Order.OrderType.StopIncrease
        ) {
            _sendTokens(
                account,
                params.addresses.initialCollateralToken,
                address(contracts.orderVault),
                collateralDeltaAmount
            );
        }

        return
            orderHandler.createOrder(account, params, isSubaccount && params.addresses.callbackContract != address(0));
    }

    function _updateOrder(
        RelayParams calldata relayParams,
        address account,
        bytes32 key,
        UpdateOrderParams calldata params,
        bool increaseExecutionFee,
        bool isSubaccount
    ) internal {
        Contracts memory contracts = Contracts({
            dataStore: dataStore,
            eventEmitter: eventEmitter,
            orderVault: orderVault
        });

        Order.Props memory order = OrderStoreUtils.get(contracts.dataStore, key);

        if (order.account() == address(0)) {
            revert Errors.EmptyOrder();
        }

        if (order.account() != account) {
            revert Errors.Unauthorized(account, "account for updateOrder");
        }

        address residualFeeReceiver = increaseExecutionFee ? address(contracts.orderVault) : account;
        _handleRelay(contracts, relayParams, account, residualFeeReceiver, isSubaccount);

        orderHandler.updateOrder(
            key,
            params.sizeDeltaUsd,
            params.acceptablePrice,
            params.triggerPrice,
            params.minOutputAmount,
            params.validFromTime,
            params.autoCancel,
            order,

            // shouldCapMaxExecutionFee
            // see GasUtils.validateExecutionFee
            isSubaccount && order.callbackContract() != address(0) && increaseExecutionFee
        );
    }

    function _cancelOrder(RelayParams calldata relayParams, address account, bytes32 key, bool isSubaccount) internal {
        Contracts memory contracts = Contracts({
            dataStore: dataStore,
            eventEmitter: eventEmitter,
            orderVault: orderVault
        });

        Order.Props memory order = OrderStoreUtils.get(contracts.dataStore, key);
        if (order.account() == address(0)) {
            revert Errors.EmptyOrder();
        }

        if (order.account() != account) {
            revert Errors.Unauthorized(account, "account for cancelOrder");
        }

        _handleRelay(contracts, relayParams, account, account, isSubaccount);

        orderHandler.cancelOrder(key);
    }

    function _swapFeeTokens(
        Contracts memory contracts,
        address wnt,
        FeeParams calldata fee
    ) internal returns (uint256) {
        Oracle _oracle = oracle;
        _oracle.validateSequencerUp();

        // swap fee tokens to WNT
        MarketUtils.validateSwapPath(contracts.dataStore, fee.feeSwapPath);
        Market.Props[] memory swapPathMarkets = MarketUtils.getSwapPathMarkets(contracts.dataStore, fee.feeSwapPath);

        (address outputToken, uint256 outputAmount) = SwapUtils.swap(
            SwapUtils.SwapParams({
                dataStore: contracts.dataStore,
                eventEmitter: contracts.eventEmitter,
                oracle: _oracle,
                bank: contracts.orderVault,
                key: bytes32(0),
                tokenIn: fee.feeToken,
                amountIn: fee.feeAmount,
                swapPathMarkets: swapPathMarkets,
                minOutputAmount: 0,
                receiver: address(this),
                uiFeeReceiver: address(0),
                shouldUnwrapNativeToken: false,
                swapPricingType: ISwapPricingUtils.SwapPricingType.Atomic
            })
        );

        if (outputToken != wnt) {
            revert Errors.UnexpectedRelayFeeTokenAfterSwap(outputToken, wnt);
        }

        return outputAmount;
    }

    function _handleRelay(
        Contracts memory contracts,
        RelayParams calldata relayParams,
        address account,
        address residualFeeReceiver,
        bool isSubaccount
    ) internal returns (uint256) {
        if (relayParams.externalCalls.externalCallTargets.length != 0 && relayParams.fee.feeSwapPath.length != 0) {
            revert Errors.InvalidRelayParams();
        }

        if (relayParams.externalCalls.externalCallTargets.length != 0 && isSubaccount) {
            // malicious subaccount could steal main account funds through external calls
            revert Errors.NonEmptyExternalCallsForSubaccountOrder();
        }

        _handleTokenPermits(relayParams.tokenPermits);
        return _handleRelayFee(contracts, relayParams, account, residualFeeReceiver);
    }

    function _handleTokenPermits(TokenPermit[] calldata tokenPermits) internal {
        // not all tokens support ERC20Permit, for them separate transaction is needed

        if (tokenPermits.length == 0) {
            return;
        }

        address _router = address(router);

        for (uint256 i; i < tokenPermits.length; i++) {
            TokenPermit memory permit = tokenPermits[i];

            if (permit.spender != _router) {
                // to avoid permitting spending by an incorrect spender for extra safety
                revert Errors.InvalidPermitSpender(permit.spender, _router);
            }

            try
                IERC20Permit(permit.token).permit(
                    permit.owner,
                    permit.spender,
                    permit.value,
                    permit.deadline,
                    permit.v,
                    permit.r,
                    permit.s
                )
            {} catch {}
        }
    }

    function _handleRelayFee(
        Contracts memory contracts,
        RelayParams calldata relayParams,
        address account,
        address residualFeeReceiver
    ) internal returns (uint256) {
        address wnt = TokenUtils.wnt(contracts.dataStore);

        if (_getFeeToken() != wnt) {
            revert Errors.UnsupportedRelayFeeToken(_getFeeToken(), wnt);
        }

        uint256 outputAmount;
        if (relayParams.externalCalls.externalCallTargets.length > 0) {
            _sendTokens(account, relayParams.fee.feeToken, address(externalHandler), relayParams.fee.feeAmount);
            externalHandler.makeExternalCalls(
                relayParams.externalCalls.externalCallTargets,
                relayParams.externalCalls.externalCallDataList,
                relayParams.externalCalls.refundTokens,
                relayParams.externalCalls.refundReceivers
            );
            outputAmount = ERC20(_getFeeToken()).balanceOf(address(this));
        } else if (relayParams.fee.feeSwapPath.length != 0) {
            _sendTokens(account, relayParams.fee.feeToken, address(contracts.orderVault), relayParams.fee.feeAmount);
            outputAmount = _swapFeeTokens(contracts, wnt, relayParams.fee);
        } else if (relayParams.fee.feeToken == wnt) {
            _sendTokens(account, relayParams.fee.feeToken, address(this), relayParams.fee.feeAmount);
            outputAmount = relayParams.fee.feeAmount;
        } else {
            revert Errors.UnexpectedRelayFeeToken(relayParams.fee.feeToken, wnt);
        }

        _transferRelayFeeCapped(outputAmount);

        uint256 residualFee = outputAmount - _getFee();
        // for create orders the residual fee is sent to the order vault
        // for update orders the residual fee could be sent to the order vault if order's execution fee should be increased
        // otherwise the residual fee is sent back to the user
        // for other actions the residual fee is sent back to the user
        TokenUtils.transfer(contracts.dataStore, wnt, residualFeeReceiver, residualFee);

        return residualFee;
    }

    function _sendTokens(address account, address token, address receiver, uint256 amount) internal {
        AccountUtils.validateReceiver(receiver);
        router.pluginTransfer(token, account, receiver, amount);
    }

    function _getDomainSeparator(uint256 sourceChainId) internal view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    DOMAIN_SEPARATOR_TYPEHASH,
                    DOMAIN_SEPARATOR_NAME_HASH,
                    DOMAIN_SEPARATOR_VERSION_HASH,
                    sourceChainId,
                    address(this)
                )
            );
    }

    function _validateCall(RelayParams calldata relayParams, address account, bytes32 structHash) internal {
        bytes32 domainSeparator = _getDomainSeparator(block.chainid);
        bytes32 digest = ECDSA.toTypedDataHash(domainSeparator, structHash);
        _validateSignature(digest, relayParams.signature, account, "call");

        _validateNonce(account, relayParams.userNonce);
        _validateDeadline(relayParams.deadline);
    }

    function _validateDeadline(uint256 deadline) internal view {
        if (block.timestamp > deadline) {
            revert Errors.DeadlinePassed(block.timestamp, deadline);
        }
    }

    function _validateNonce(address account, uint256 userNonce) internal {
        if (userNonces[account] != userNonce) {
            revert Errors.InvalidUserNonce(userNonces[account], userNonce);
        }
        userNonces[account] = userNonce + 1;
    }

    function _getRelayParamsHash(RelayParams calldata relayParams) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    relayParams.oracleParams,
                    relayParams.externalCalls,
                    relayParams.tokenPermits,
                    relayParams.fee,
                    relayParams.userNonce,
                    relayParams.deadline
                )
            );
    }

    function _validateGaslessFeature() internal view {
        FeatureUtils.validateFeature(dataStore, Keys.gaslessFeatureDisabledKey(address(this)));
    }
}
