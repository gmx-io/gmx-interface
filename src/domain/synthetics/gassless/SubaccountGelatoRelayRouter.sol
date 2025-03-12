// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.0;

import "../../order/IBaseOrderUtils.sol";
import "../../router/Router.sol";
import "../../feature/FeatureUtils.sol";
import "../../subaccount/SubaccountUtils.sol";
import "./BaseGelatoRelayRouter.sol";

contract SubaccountGelatoRelayRouter is BaseGelatoRelayRouter {
    struct SubaccountApproval {
        address subaccount;
        bool shouldAdd;
        uint256 expiresAt;
        uint256 maxAllowedCount;
        bytes32 actionType;
        uint256 nonce; // for replay attack protection
        uint256 deadline;
        bytes signature;
    }

    bytes32 public constant UPDATE_ORDER_TYPEHASH =
        keccak256(
            bytes(
                "UpdateOrder(address account,bytes32 key,UpdateOrderParams params,bool increaseExecutionFee,bytes32 relayParams,bytes32 subaccountApproval)UpdateOrderParams(uint256 sizeDeltaUsd,uint256 acceptablePrice,uint256 triggerPrice,uint256 minOutputAmount,uint256 validFromTime,bool autoCancel)"
            )
        );
    bytes32 public constant UPDATE_ORDER_PARAMS_TYPEHASH =
        keccak256(
            bytes(
                "UpdateOrderParams(uint256 sizeDeltaUsd,uint256 acceptablePrice,uint256 triggerPrice,uint256 minOutputAmount,uint256 validFromTime,bool autoCancel)"
            )
        );

    bytes32 public constant CANCEL_ORDER_TYPEHASH =
        keccak256(bytes("CancelOrder(address account,bytes32 key,bytes32 relayParams,bytes32 subaccountApproval)"));

    bytes32 public constant CREATE_ORDER_TYPEHASH =
        keccak256(
            bytes(
                "CreateOrder(uint256 collateralDeltaAmount,address account,CreateOrderAddresses addresses,CreateOrderNumbers numbers,uint256 orderType,uint256 decreasePositionSwapType,bool isLong,bool shouldUnwrapNativeToken,bool autoCancel,bytes32 referralCode,bytes32 relayParams,bytes32 subaccountApproval)CreateOrderAddresses(address receiver,address cancellationReceiver,address callbackContract,address uiFeeReceiver,address market,address initialCollateralToken,address[] swapPath)CreateOrderNumbers(uint256 sizeDeltaUsd,uint256 initialCollateralDeltaAmount,uint256 triggerPrice,uint256 acceptablePrice,uint256 executionFee,uint256 callbackGasLimit,uint256 minOutputAmount,uint256 validFromTime)"
            )
        );
    bytes32 public constant CREATE_ORDER_NUMBERS_TYPEHASH =
        keccak256(
            bytes(
                "CreateOrderNumbers(uint256 sizeDeltaUsd,uint256 initialCollateralDeltaAmount,uint256 triggerPrice,uint256 acceptablePrice,uint256 executionFee,uint256 callbackGasLimit,uint256 minOutputAmount,uint256 validFromTime)"
            )
        );
    bytes32 public constant CREATE_ORDER_ADDRESSES_TYPEHASH =
        keccak256(
            bytes(
                "CreateOrderAddresses(address receiver,address cancellationReceiver,address callbackContract,address uiFeeReceiver,address market,address initialCollateralToken,address[] swapPath)"
            )
        );

    bytes32 public constant SUBACCOUNT_APPROVAL_TYPEHASH =
        keccak256(
            bytes(
                "SubaccountApproval(address subaccount,bool shouldAdd,uint256 expiresAt,uint256 maxAllowedCount,bytes32 actionType,uint256 nonce,uint256 deadline)"
            )
        );

    bytes32 public constant REMOVE_SUBACCOUNT_TYPEHASH =
        keccak256(bytes("RemoveSubaccount(address subaccount,bytes32 relayParams)"));

    mapping(address => uint256) public subaccountApprovalNonces;

    constructor(
        Router _router,
        DataStore _dataStore,
        EventEmitter _eventEmitter,
        Oracle _oracle,
        IOrderHandler _orderHandler,
        OrderVault _orderVault,
        IExternalHandler _externalHandler
    )
        BaseGelatoRelayRouter(_router, _dataStore, _eventEmitter, _oracle, _orderHandler, _orderVault, _externalHandler)
    {}

    // @note all params except subaccount should be part of the corresponding struct hash
    function createOrder(
        RelayParams calldata relayParams,
        SubaccountApproval calldata subaccountApproval,
        address account, // main account
        address subaccount,
        uint256 collateralDeltaAmount,
        IBaseOrderUtils.CreateOrderParams memory params // can't use calldata because need to modify params.numbers.executionFee
    )
        external
        nonReentrant
        withOraclePricesForAtomicAction(relayParams.oracleParams)
        onlyGelatoRelay
        returns (bytes32)
    {
        _validateGaslessFeature();
        bytes32 structHash = _getCreateOrderStructHash(
            relayParams,
            subaccountApproval,
            account,
            collateralDeltaAmount,
            params
        );
        _validateCall(relayParams, subaccount, structHash);
        _handleSubaccountAction(account, subaccount, Keys.SUBACCOUNT_ORDER_ACTION, subaccountApproval);

        if (params.addresses.receiver != account) {
            revert Errors.InvalidReceiver(params.addresses.receiver);
        }

        if (params.addresses.cancellationReceiver != address(0) && params.addresses.cancellationReceiver != account) {
            revert Errors.InvalidCancellationReceiverForSubaccountOrder(params.addresses.cancellationReceiver, account);
        }

        return
            _createOrder(
                relayParams,
                account,
                collateralDeltaAmount,
                params,
                true // isSubaccount
            );
    }

    // @note all params except subaccount should be part of the corresponding struct hash
    function updateOrder(
        RelayParams calldata relayParams,
        SubaccountApproval calldata subaccountApproval,
        address account, // main account
        address subaccount,
        bytes32 key,
        UpdateOrderParams calldata params,
        bool increaseExecutionFee
    ) external nonReentrant withOraclePricesForAtomicAction(relayParams.oracleParams) onlyGelatoRelay {
        _validateGaslessFeature();
        bytes32 structHash = _getUpdateOrderStructHash(
            relayParams,
            subaccountApproval,
            account,
            key,
            params,
            increaseExecutionFee
        );
        _validateCall(relayParams, subaccount, structHash);
        _handleSubaccountAction(account, subaccount, Keys.SUBACCOUNT_ORDER_ACTION, subaccountApproval);
        _updateOrder(
            relayParams,
            account,
            key,
            params,
            increaseExecutionFee,
            true // isSubaccount
        );
    }

    // @note all params except subaccount should be part of the corresponding struct hash
    function cancelOrder(
        RelayParams calldata relayParams,
        SubaccountApproval calldata subaccountApproval,
        address account, // main account
        address subaccount,
        bytes32 key
    ) external nonReentrant withOraclePricesForAtomicAction(relayParams.oracleParams) onlyGelatoRelay {
        _validateGaslessFeature();
        bytes32 structHash = _getCancelOrderStructHash(relayParams, subaccountApproval, account, key);
        _validateCall(relayParams, subaccount, structHash);
        _handleSubaccountAction(account, subaccount, Keys.SUBACCOUNT_ORDER_ACTION, subaccountApproval);
        _cancelOrder(
            relayParams,
            account,
            key,
            true // isSubaccount
        );
    }

    // @note all params except account should be part of the corresponding struct hash
    function removeSubaccount(
        RelayParams calldata relayParams,
        address account,
        address subaccount
    ) external nonReentrant withOraclePricesForAtomicAction(relayParams.oracleParams) onlyGelatoRelay {
        _validateGaslessFeature();
        bytes32 structHash = _getRemoveSubaccountStructHash(relayParams, subaccount);
        _validateCall(relayParams, account, structHash);

        Contracts memory contracts = Contracts({
            dataStore: dataStore,
            eventEmitter: eventEmitter,
            orderVault: orderVault
        });
        _handleRelay(
            contracts,
            relayParams,
            account,
            account,
            false // isSubaccount is false because the `removeSubaccount` call is signed by the main account
        );

        SubaccountUtils.removeSubaccount(dataStore, eventEmitter, account, subaccount);
    }

    function _handleSubaccountAction(
        address account,
        address subaccount,
        bytes32 actionType,
        SubaccountApproval calldata subaccountApproval
    ) internal {
        FeatureUtils.validateFeature(dataStore, Keys.subaccountFeatureDisabledKey(address(this)));

        _handleSubaccountApproval(account, subaccountApproval);

        SubaccountUtils.handleSubaccountAction(dataStore, eventEmitter, account, subaccount, actionType);
    }

    function _handleSubaccountApproval(address account, SubaccountApproval calldata subaccountApproval) internal {
        if (subaccountApproval.signature.length == 0) {
            return;
        }

        if (subaccountApproval.subaccount == address(0)) {
            revert Errors.InvalidSubaccountApprovalSubaccount();
        }

        if (block.timestamp > subaccountApproval.deadline) {
            revert Errors.SubaccountApprovalDeadlinePassed(block.timestamp, subaccountApproval.deadline);
        }

        uint256 storedNonce = subaccountApprovalNonces[account];
        if (storedNonce != subaccountApproval.nonce) {
            revert Errors.InvalidSubaccountApprovalNonce(storedNonce, subaccountApproval.nonce);
        }
        subaccountApprovalNonces[account] = storedNonce + 1;

        bytes32 domainSeparator = _getDomainSeparator(block.chainid);
        bytes32 structHash = _getSubaccountApprovalStructHash(subaccountApproval);
        bytes32 digest = ECDSA.toTypedDataHash(domainSeparator, structHash);
        _validateSignature(digest, subaccountApproval.signature, account, "subaccount approval");

        if (subaccountApproval.maxAllowedCount > 0) {
            SubaccountUtils.setMaxAllowedSubaccountActionCount(
                dataStore,
                eventEmitter,
                account,
                subaccountApproval.subaccount,
                subaccountApproval.actionType,
                subaccountApproval.maxAllowedCount
            );
        }

        if (subaccountApproval.expiresAt > 0) {
            SubaccountUtils.setSubaccountExpiresAt(
                dataStore,
                eventEmitter,
                account,
                subaccountApproval.subaccount,
                subaccountApproval.actionType,
                subaccountApproval.expiresAt
            );
        }

        if (subaccountApproval.shouldAdd) {
            SubaccountUtils.addSubaccount(dataStore, eventEmitter, account, subaccountApproval.subaccount);
        }
    }

    function _getRemoveSubaccountStructHash(
        RelayParams calldata relayParams,
        address subaccount
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(REMOVE_SUBACCOUNT_TYPEHASH, subaccount, _getRelayParamsHash(relayParams)));
    }

    function _getSubaccountApprovalStructHash(
        SubaccountApproval calldata subaccountApproval
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    SUBACCOUNT_APPROVAL_TYPEHASH,
                    subaccountApproval.subaccount,
                    subaccountApproval.shouldAdd,
                    subaccountApproval.expiresAt,
                    subaccountApproval.maxAllowedCount,
                    subaccountApproval.actionType,
                    subaccountApproval.nonce,
                    subaccountApproval.deadline
                )
            );
    }

    function _getCreateOrderStructHash(
        RelayParams calldata relayParams,
        SubaccountApproval calldata subaccountApproval,
        address account,
        uint256 collateralDeltaAmount,
        IBaseOrderUtils.CreateOrderParams memory params
    ) internal pure returns (bytes32) {
        bytes32 relayParamsHash = _getRelayParamsHash(relayParams);
        bytes32 subaccountApprovalHash = keccak256(abi.encode(subaccountApproval));

        return
            keccak256(
                abi.encode(
                    CREATE_ORDER_TYPEHASH,
                    collateralDeltaAmount,
                    account,
                    _getCreateOrderAddressesStructHash(params.addresses),
                    _getCreateOrderNumbersStructHash(params.numbers),
                    uint256(params.orderType),
                    uint256(params.decreasePositionSwapType),
                    params.isLong,
                    params.shouldUnwrapNativeToken,
                    params.autoCancel,
                    params.referralCode,
                    relayParamsHash,
                    subaccountApprovalHash
                )
            );
    }

    function _getCreateOrderAddressesStructHash(
        IBaseOrderUtils.CreateOrderParamsAddresses memory addresses
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    CREATE_ORDER_ADDRESSES_TYPEHASH,
                    addresses.receiver,
                    addresses.cancellationReceiver,
                    addresses.callbackContract,
                    addresses.uiFeeReceiver,
                    addresses.market,
                    addresses.initialCollateralToken,
                    keccak256(abi.encodePacked(addresses.swapPath))
                )
            );
    }

    function _getCreateOrderNumbersStructHash(
        IBaseOrderUtils.CreateOrderParamsNumbers memory numbers
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    CREATE_ORDER_NUMBERS_TYPEHASH,
                    numbers.sizeDeltaUsd,
                    numbers.initialCollateralDeltaAmount,
                    numbers.triggerPrice,
                    numbers.acceptablePrice,
                    numbers.executionFee,
                    numbers.callbackGasLimit,
                    numbers.minOutputAmount,
                    numbers.validFromTime
                )
            );
    }

    function _getUpdateOrderStructHash(
        RelayParams calldata relayParams,
        SubaccountApproval calldata subaccountApproval,
        address account,
        bytes32 key,
        UpdateOrderParams calldata params,
        bool increaseExecutionFee
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    UPDATE_ORDER_TYPEHASH,
                    account,
                    key,
                    _getUpdateOrderParamsStructHash(params),
                    increaseExecutionFee,
                    _getRelayParamsHash(relayParams),
                    keccak256(abi.encode(subaccountApproval))
                )
            );
    }

    function _getUpdateOrderParamsStructHash(UpdateOrderParams calldata params) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    UPDATE_ORDER_PARAMS_TYPEHASH,
                    params.sizeDeltaUsd,
                    params.acceptablePrice,
                    params.triggerPrice,
                    params.minOutputAmount,
                    params.validFromTime,
                    params.autoCancel
                )
            );
    }

    function _getCancelOrderStructHash(
        RelayParams calldata relayParams,
        SubaccountApproval calldata subaccountApproval,
        address account,
        bytes32 key
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    CANCEL_ORDER_TYPEHASH,
                    account,
                    key,
                    _getRelayParamsHash(relayParams),
                    keccak256(abi.encode(subaccountApproval))
                )
            );
    }
}
