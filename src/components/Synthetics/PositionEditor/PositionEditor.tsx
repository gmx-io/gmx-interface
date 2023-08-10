import { Trans, t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import Token from "abis/Token.json";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import Modal from "components/Modal/Modal";
import Tab from "components/Tab/Tab";
import TokenSelector from "components/TokenSelector/TokenSelector";
import Tooltip from "components/Tooltip/Tooltip";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { getContract } from "config/contracts";
import { getSyntheticsCollateralEditAddressKey } from "config/localStorage";
import { NATIVE_TOKEN_ADDRESS, getToken } from "config/tokens";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useUserReferralInfo } from "domain/referrals/hooks";
import {
  estimateExecuteDecreaseOrderGasLimit,
  estimateExecuteIncreaseOrderGasLimit,
  getExecutionFee,
  getFeeItem,
  getTotalFeeItem,
  useGasLimits,
  useGasPrice,
} from "domain/synthetics/fees";
import {
  DecreasePositionSwapType,
  OrderType,
  createDecreaseOrderTxn,
  createIncreaseOrderTxn,
} from "domain/synthetics/orders";
import {
  PositionInfo,
  formatLeverage,
  formatLiquidationPrice,
  getLeverage,
  getLiquidationPrice,
  usePositionsConstants,
} from "domain/synthetics/positions";
import { TokensData, adaptToV1InfoTokens, convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { TradeFees, getMarkPrice, getMinCollateralUsdForLeverage } from "domain/synthetics/trade";
import { getCommonError, getEditCollateralError } from "domain/synthetics/trade/utils/validation";
import { BigNumber, ethers } from "ethers";
import { useChainId } from "lib/chains";
import { contractFetcher } from "lib/contracts";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatAmountFree, formatTokenAmount, formatTokenAmountWithUsd, formatUsd, parseValue } from "lib/numbers";
import { getByKey } from "lib/objects";
import { usePrevious } from "lib/usePrevious";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { TradeFeesRow } from "../TradeFeesRow/TradeFeesRow";
import "./PositionEditor.scss";
import { useHasOutdatedUi } from "domain/legacy";

export type Props = {
  position?: PositionInfo;
  tokensData?: TokensData;
  showPnlInLeverage: boolean;
  allowedSlippage: number;
  setPendingTxns: (txns: any) => void;
  onClose: () => void;
  onConnectWallet: () => void;
  shouldDisableValidation: boolean;
};

enum Operation {
  Deposit = "Deposit",
  Withdraw = "Withdraw",
}

export function PositionEditor(p: Props) {
  const { position, tokensData, showPnlInLeverage, setPendingTxns, onClose, onConnectWallet, allowedSlippage } = p;
  const { chainId } = useChainId();
  const { account, library, active } = useWeb3React();
  const { setPendingPosition, setPendingOrder } = useSyntheticsEvents();
  const { gasPrice } = useGasPrice(chainId);
  const { gasLimits } = useGasLimits(chainId);
  const { minCollateralUsd } = usePositionsConstants(chainId);
  const routerAddress = getContract(chainId, "SyntheticsRouter");
  const userReferralInfo = useUserReferralInfo(library, chainId, account);
  const { data: hasOutdatedUi } = useHasOutdatedUi();

  const isVisible = Boolean(position);
  const prevIsVisible = usePrevious(isVisible);

  const infoTokens = useMemo(() => {
    if (!tokensData) {
      return undefined;
    }
    return adaptToV1InfoTokens(tokensData);
  }, [tokensData]);

  const { data: tokenAllowance } = useSWR<BigNumber>(
    position ? [active, chainId, position.collateralTokenAddress, "allowance", account, routerAddress] : null,
    {
      fetcher: contractFetcher(library, Token),
    }
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [operation, setOperation] = useState(Operation.Deposit);
  const isDeposit = operation === Operation.Deposit;

  const indexPriceDecimals = position?.indexToken.priceDecimals || 2;

  const [selectedCollateralAddress, setSelectedCollateralAddress] = useLocalStorageSerializeKey(
    getSyntheticsCollateralEditAddressKey(chainId, position?.collateralTokenAddress),
    position?.collateralTokenAddress
  );

  const collateralToken = getByKey(tokensData, selectedCollateralAddress);

  const availableSwapTokens = useMemo(() => {
    return position?.collateralToken.isWrapped
      ? [getToken(chainId, position.collateralTokenAddress), getToken(chainId, NATIVE_TOKEN_ADDRESS)]
      : undefined;
  }, [chainId, position?.collateralToken.isWrapped, position?.collateralTokenAddress]);

  const collateralPrice = collateralToken?.prices.minPrice;

  const markPrice = position
    ? getMarkPrice({
        prices: position.indexToken.prices,
        isLong: position.isLong,
        isIncrease: isDeposit,
      })
    : undefined;

  const [collateralInputValue, setCollateralInputValue] = useState("");
  const collateralDeltaAmount = parseValue(collateralInputValue || "0", collateralToken?.decimals || 0);
  const collateralDeltaUsd = convertToUsd(collateralDeltaAmount, collateralToken?.decimals, collateralPrice);

  const needCollateralApproval =
    isDeposit &&
    tokenAllowance &&
    collateralDeltaAmount &&
    selectedCollateralAddress !== ethers.constants.AddressZero &&
    collateralDeltaAmount.gt(tokenAllowance);

  const minCollateralUsdForLeverage = position ? getMinCollateralUsdForLeverage(position) : BigNumber.from(0);
  let _minCollateralUsd = minCollateralUsdForLeverage;
  if (minCollateralUsd?.gt(_minCollateralUsd)) {
    _minCollateralUsd = minCollateralUsd;
  }
  _minCollateralUsd = _minCollateralUsd
    .add(position?.pendingBorrowingFeesUsd || 0)
    .add(position?.pendingFundingFeesUsd || 0);

  const maxWithdrawUsd = position ? position.collateralUsd.sub(_minCollateralUsd) : BigNumber.from(0);

  const maxWithdrawAmount = convertToTokenAmount(maxWithdrawUsd, collateralToken?.decimals, collateralPrice);

  const { fees, executionFee } = useMemo(() => {
    if (!position || !gasLimits || !tokensData || !gasPrice) {
      return {};
    }

    const collateralBasisUsd = isDeposit
      ? position.collateralUsd.add(collateralDeltaUsd || BigNumber.from(0))
      : position.collateralUsd;

    const fundingFee = getFeeItem(position.pendingFundingFeesUsd.mul(-1), collateralBasisUsd);
    const borrowFee = getFeeItem(position.pendingBorrowingFeesUsd.mul(-1), collateralBasisUsd);
    const totalFees = getTotalFeeItem([fundingFee, borrowFee]);

    const fees: TradeFees = {
      totalFees,
      fundingFee,
      borrowFee,
    };

    const estimatedGas = isDeposit
      ? estimateExecuteIncreaseOrderGasLimit(gasLimits, {})
      : estimateExecuteDecreaseOrderGasLimit(gasLimits, {});
    const executionFee = getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice);

    return {
      fees,
      executionFee,
    };
  }, [chainId, collateralDeltaUsd, gasLimits, gasPrice, isDeposit, position, tokensData]);

  const { nextCollateralUsd, nextLeverage, nextLiqPrice, receiveUsd, receiveAmount } = useMemo(() => {
    if (!position || !collateralDeltaUsd?.gt(0) || !minCollateralUsd || !fees?.totalFees) {
      return {};
    }

    const totalFeesUsd = fees.totalFees.deltaUsd.abs();

    const nextCollateralUsd = isDeposit
      ? position.collateralUsd.sub(totalFeesUsd).add(collateralDeltaUsd)
      : position.collateralUsd.sub(totalFeesUsd).sub(collateralDeltaUsd);

    const nextCollateralAmount = convertToTokenAmount(nextCollateralUsd, collateralToken?.decimals, collateralPrice)!;

    const receiveUsd = isDeposit ? BigNumber.from(0) : collateralDeltaUsd;
    const receiveAmount = convertToTokenAmount(receiveUsd, collateralToken?.decimals, collateralPrice)!;

    const nextLeverage = getLeverage({
      sizeInUsd: position.sizeInUsd,
      collateralUsd: nextCollateralUsd,
      pendingBorrowingFeesUsd: BigNumber.from(0),
      pendingFundingFeesUsd: BigNumber.from(0),
      pnl: showPnlInLeverage ? position.pnl : BigNumber.from(0),
    });

    const nextLiqPrice = getLiquidationPrice({
      sizeInUsd: position.sizeInUsd,
      sizeInTokens: position.sizeInTokens,
      collateralUsd: nextCollateralUsd,
      collateralAmount: nextCollateralAmount,
      collateralToken: position.collateralToken,
      marketInfo: position.marketInfo,
      userReferralInfo,
      pendingFundingFeesUsd: BigNumber.from(0),
      pendingBorrowingFeesUsd: BigNumber.from(0),
      isLong: position.isLong,
      minCollateralUsd,
    });

    return {
      nextCollateralUsd,
      nextLeverage,
      nextLiqPrice,
      receiveUsd,
      receiveAmount,
    };
  }, [
    collateralDeltaUsd,
    collateralPrice,
    collateralToken,
    fees,
    isDeposit,
    minCollateralUsd,
    position,
    showPnlInLeverage,
    userReferralInfo,
  ]);

  const error = useMemo(() => {
    const commonError = getCommonError({
      chainId,
      isConnected: Boolean(account),
      hasOutdatedUi,
    });

    const editCollateralError = getEditCollateralError({
      collateralDeltaAmount,
      collateralDeltaUsd,
      nextCollateralUsd,
      nextLeverage,
      nextLiqPrice,
      minCollateralUsd,
      isDeposit,
      position,
      depositToken: collateralToken,
      depositAmount: collateralDeltaAmount,
    });

    const error = commonError[0] || editCollateralError[0];

    if (error) {
      return error;
    }

    if (needCollateralApproval) {
      return t`Pending ${collateralToken?.symbol} approval`;
    }

    if (isSubmitting) {
      return t`Creating Order...`;
    }
  }, [
    account,
    chainId,
    collateralDeltaAmount,
    collateralDeltaUsd,
    collateralToken,
    hasOutdatedUi,
    isDeposit,
    isSubmitting,
    minCollateralUsd,
    needCollateralApproval,
    nextCollateralUsd,
    nextLeverage,
    nextLiqPrice,
    position,
  ]);

  function onSubmit() {
    if (!account) {
      onConnectWallet();
      return;
    }

    if (
      !executionFee?.feeTokenAmount ||
      !tokensData ||
      !markPrice ||
      !position?.indexToken ||
      !collateralDeltaAmount ||
      !selectedCollateralAddress
    ) {
      return;
    }

    if (isDeposit) {
      setIsSubmitting(true);

      createIncreaseOrderTxn(chainId, library, {
        account,
        marketAddress: position.marketAddress,
        initialCollateralAddress: selectedCollateralAddress,
        initialCollateralAmount: collateralDeltaAmount,
        targetCollateralAddress: position.collateralTokenAddress,
        collateralDeltaAmount,
        swapPath: [],
        sizeDeltaUsd: BigNumber.from(0),
        sizeDeltaInTokens: BigNumber.from(0),
        acceptablePrice: markPrice,
        triggerPrice: undefined,
        orderType: OrderType.MarketIncrease,
        isLong: position.isLong,
        executionFee: executionFee.feeTokenAmount,
        allowedSlippage,
        referralCode: userReferralInfo?.referralCodeForTxn,
        indexToken: position.indexToken,
        tokensData,
        skipSimulation: p.shouldDisableValidation,
        setPendingTxns,
        setPendingOrder,
        setPendingPosition,
      })
        .then(onClose)
        .finally(() => {
          setIsSubmitting(false);
        });
    } else {
      if (!receiveUsd) {
        return;
      }

      setIsSubmitting(true);

      createDecreaseOrderTxn(chainId, library, {
        account,
        marketAddress: position.marketAddress,
        initialCollateralAddress: position.collateralTokenAddress,
        initialCollateralDeltaAmount: collateralDeltaAmount,
        receiveTokenAddress: selectedCollateralAddress,
        swapPath: [],
        sizeDeltaUsd: BigNumber.from(0),
        sizeDeltaInTokens: BigNumber.from(0),
        acceptablePrice: markPrice,
        triggerPrice: undefined,
        decreasePositionSwapType: DecreasePositionSwapType.NoSwap,
        orderType: OrderType.MarketDecrease,
        isLong: position.isLong,
        minOutputUsd: receiveUsd,
        executionFee: executionFee.feeTokenAmount,
        allowedSlippage,
        referralCode: userReferralInfo?.referralCodeForTxn,
        indexToken: position.indexToken,
        tokensData,
        skipSimulation: p.shouldDisableValidation,
        setPendingTxns,
        setPendingOrder,
        setPendingPosition,
      })
        .then(onClose)
        .finally(() => {
          setIsSubmitting(false);
        });
    }
  }

  useEffect(
    function initCollateral() {
      if (!position) {
        return;
      }

      if (
        !selectedCollateralAddress ||
        !availableSwapTokens?.find((token) => token.address === selectedCollateralAddress)
      ) {
        setSelectedCollateralAddress(position.collateralTokenAddress);
      }
    },
    [availableSwapTokens, position, selectedCollateralAddress, setSelectedCollateralAddress]
  );

  useEffect(
    function resetForm() {
      if (isVisible !== prevIsVisible) {
        setCollateralInputValue("");
      }
    },
    [isVisible, prevIsVisible]
  );

  const operationLabels = {
    [Operation.Deposit]: t`Deposit`,
    [Operation.Withdraw]: t`Withdraw`,
  };

  return (
    <div className="PositionEditor">
      <Modal
        className="PositionEditor-modal"
        isVisible={position}
        setIsVisible={onClose}
        label={
          <Trans>
            Edit {position?.isLong ? t`Long` : t`Short`} {position?.indexToken?.symbol}
          </Trans>
        }
        allowContentTouchMove
      >
        {position && (
          <>
            <Tab
              onChange={setOperation}
              option={operation}
              options={Object.values(Operation)}
              optionLabels={operationLabels}
              className="PositionEditor-tabs SwapBox-option-tabs"
            />

            <BuyInputSection
              topLeftLabel={operationLabels[operation]}
              topLeftValue={formatUsd(collateralDeltaUsd)}
              topRightLabel={t`Max`}
              topRightValue={
                isDeposit
                  ? formatTokenAmount(collateralToken?.balance, collateralToken?.decimals, "", {
                      useCommas: true,
                    })
                  : formatTokenAmount(maxWithdrawAmount, position?.collateralToken?.decimals, "", {
                      useCommas: true,
                    })
              }
              inputValue={collateralInputValue}
              onInputValueChange={(e) => setCollateralInputValue(e.target.value)}
              showMaxButton={
                isDeposit
                  ? collateralToken?.balance && !collateralDeltaAmount?.eq(collateralToken?.balance)
                  : maxWithdrawAmount && !collateralDeltaAmount?.eq(maxWithdrawAmount)
              }
              onClickMax={() =>
                isDeposit
                  ? setCollateralInputValue(formatAmountFree(collateralToken!.balance!, collateralToken!.decimals))
                  : setCollateralInputValue(
                      formatAmountFree(maxWithdrawAmount!, position?.collateralToken?.decimals || 0)
                    )
              }
            >
              {availableSwapTokens ? (
                <TokenSelector
                  label={operationLabels[operation]}
                  chainId={chainId}
                  tokenAddress={selectedCollateralAddress!}
                  onSelectToken={(token) => setSelectedCollateralAddress(token.address)}
                  tokens={availableSwapTokens}
                  infoTokens={infoTokens}
                  className="Edit-collateral-token-selector"
                  showSymbolImage={true}
                  showTokenImgInDropdown={true}
                  showBalances={false}
                />
              ) : (
                collateralToken?.symbol
              )}
            </BuyInputSection>

            <div className="PositionEditor-info-box">
              <ExchangeInfoRow
                label={t`Leverage`}
                value={<ValueTransition from={formatLeverage(position?.leverage)} to={formatLeverage(nextLeverage)} />}
              />

              <ExchangeInfoRow
                isTop
                label={t`Entry Price`}
                value={formatUsd(position.entryPrice, { displayDecimals: indexPriceDecimals })}
              />
              <ExchangeInfoRow
                label={t`Mark Price`}
                value={formatUsd(position.markPrice, { displayDecimals: indexPriceDecimals })}
              />

              <ExchangeInfoRow
                label={t`Liq Price`}
                value={
                  <ValueTransition
                    from={formatLiquidationPrice(position.liquidationPrice, { displayDecimals: indexPriceDecimals })}
                    to={
                      collateralDeltaAmount?.gt(0)
                        ? formatLiquidationPrice(nextLiqPrice, { displayDecimals: indexPriceDecimals })
                        : undefined
                    }
                  />
                }
              />

              <ExchangeInfoRow isTop label={t`Size`} value={formatUsd(position.sizeInUsd)} />

              <div className="Exchange-info-row">
                <div>
                  <Tooltip
                    handle={
                      <span className="Exchange-info-label">
                        <Trans>Collateral ({position?.collateralToken?.symbol})</Trans>
                      </span>
                    }
                    position="left-top"
                    renderContent={() => {
                      return <Trans>Initial Collateral (Collateral excluding Borrow and Funding Fee).</Trans>;
                    }}
                  />
                </div>
                <div className="align-right">
                  <ValueTransition
                    from={formatUsd(position?.collateralUsd)!}
                    to={collateralDeltaUsd?.gt(0) ? formatUsd(nextCollateralUsd) : undefined}
                  />
                </div>
              </div>

              <TradeFeesRow {...fees} executionFee={executionFee} feesType={"edit"} warning={executionFee?.warning} />

              {!isDeposit && (
                <ExchangeInfoRow
                  label={t`Receive`}
                  value={formatTokenAmountWithUsd(
                    receiveAmount,
                    receiveUsd,
                    collateralToken?.symbol,
                    collateralToken?.decimals,
                    { fallbackToZero: true }
                  )}
                />
              )}
            </div>

            {needCollateralApproval && collateralToken && (
              <>
                <div className="App-card-divider" />

                <ApproveTokenButton
                  tokenAddress={collateralToken.address}
                  tokenSymbol={collateralToken.symbol}
                  spenderAddress={routerAddress}
                />
              </>
            )}

            <div className="Exchange-swap-button-container Confirmation-box-row">
              <Button
                className="w-full"
                variant="primary-action"
                onClick={onSubmit}
                disabled={Boolean(error) && !p.shouldDisableValidation}
              >
                {error || operationLabels[operation]}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
