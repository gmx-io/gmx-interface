import { Plural, Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import Modal from "components/Modal/Modal";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import Tooltip from "components/Tooltip/Tooltip";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { getContract } from "config/contracts";
import {
  BASIS_POINTS_DIVISOR,
  COLLATERAL_SPREAD_SHOW_AFTER_INITIAL_ZERO_THRESHOLD,
  HIGH_SPREAD_THRESHOLD,
} from "config/factors";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useUserReferralCode } from "domain/referrals/hooks";
import {
  ExecutionFee,
  estimateExecuteDecreaseOrderGasLimit,
  getBorrowingFactorPerPeriod,
  getExecutionFee,
  getFundingFactorPerPeriod,
  useGasLimits,
  useGasPrice,
} from "domain/synthetics/fees";
import {
  DecreasePositionSwapType,
  OrderType,
  PositionOrderInfo,
  createDecreaseOrderTxn,
  createIncreaseOrderTxn,
  createSwapOrderTxn,
  isLimitOrderType,
  isOrderForPosition,
  isTriggerDecreaseOrderType,
} from "domain/synthetics/orders";
import { cancelOrdersTxn } from "domain/synthetics/orders/cancelOrdersTxn";
import { createWrapOrUnwrapTxn } from "domain/synthetics/orders/createWrapOrUnwrapTxn";
import {
  PositionInfo,
  formatAcceptablePrice,
  formatLeverage,
  formatLiquidationPrice,
  getPositionKey,
  getTriggerNameByOrderType,
} from "domain/synthetics/positions";
import {
  convertToTokenAmount,
  formatTokensRatio,
  getNeedTokenApprove,
  useTokensAllowanceData,
} from "domain/synthetics/tokens";
import {
  DecreasePositionAmounts,
  TradeFees,
  TriggerThresholdType,
  applySlippageToMinOut,
  applySlippageToPrice,
  getExecutionPriceForDecrease,
} from "domain/synthetics/trade";
import { getIsEquivalentTokens, getSpread } from "domain/tokens";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { CHART_PERIODS, USD_DECIMALS } from "lib/legacy";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import { AlertInfo } from "components/AlertInfo/AlertInfo";
import { SubaccountNavigationButton } from "components/SubaccountNavigationButton/SubaccountNavigationButton";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  useIsLastSubaccountAction,
  useSubaccount,
  useSubaccountCancelOrdersDetailsMessage,
} from "context/SubaccountContext/SubaccountContext";
import { useOrdersInfoData, useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useTradeRatios } from "context/SyntheticsStateContext/hooks/tradeHooks";
import {
  useTradeboxDecreasePositionAmounts,
  useTradeboxIncreasePositionAmounts,
  useTradeboxNextPositionValuesForDecrease,
  useTradeboxNextPositionValuesForIncrease,
  useTradeboxState,
  useTradeboxSwapAmounts,
  useTradeboxTradeFlags,
} from "context/SyntheticsStateContext/hooks/tradeboxHooks";
import useSLTPEntries from "domain/synthetics/orders/useSLTPEntries";
import { AvailableMarketsOptions } from "domain/synthetics/trade/useAvailableMarketsOptions";
import { useHighExecutionFeeConsent } from "domain/synthetics/trade/useHighExecutionFeeConsent";
import { usePriceImpactWarningState } from "domain/synthetics/trade/usePriceImpactWarningState";
import { helperToast } from "lib/helperToast";
import {
  expandDecimals,
  formatAmount,
  formatDeltaUsd,
  formatPercentage,
  formatTokenAmount,
  formatTokenAmountWithUsd,
  formatUsd,
} from "lib/numbers";
import { getByKey } from "lib/objects";
import { usePrevious } from "lib/usePrevious";
import { getPlusOrMinusSymbol, getPositiveOrNegativeClass } from "lib/utils";
import useWallet from "lib/wallets/useWallet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaArrowRight } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import { useKey, useLatest } from "react-use";
import { AcceptablePriceImpactInputRow } from "../AcceptablePriceImpactInputRow/AcceptablePriceImpactInputRow";
import { HighPriceImpactWarning } from "../HighPriceImpactWarning/HighPriceImpactWarning";
import { TradeFeesRow } from "../TradeFeesRow/TradeFeesRow";
import SLTPEntries from "./SLTPEntries";
import { AllowedSlippageRow } from "./rows/AllowedSlippageRow";
import { NetworkFeeRow } from "../NetworkFeeRow/NetworkFeeRow";

import "./ConfirmationBox.scss";

export type Props = {
  isVisible: boolean;
  triggerPrice?: BigNumber;
  fixedTriggerThresholdType?: TriggerThresholdType;
  fixedTriggerOrderType?: OrderType.LimitDecrease | OrderType.StopLossDecrease;
  marketsOptions?: AvailableMarketsOptions;
  swapLiquidityUsd?: BigNumber;
  longLiquidityUsd?: BigNumber;
  shortLiquidityUsd?: BigNumber;
  fees?: TradeFees;
  executionFee?: ExecutionFee;
  error?: string;
  existingPosition?: PositionInfo;
  shouldDisableValidation: boolean;
  selectedTriggerAcceptablePriceImpactBps?: BigNumber;
  setSelectedTriggerAcceptablePriceImpactBps: (value: BigNumber) => void;
  onClose: () => void;
  onSubmitted: () => void;
  setPendingTxns: (txns: any) => void;
  triggerRatioValue: BigNumber | undefined;
  markPrice: BigNumber | undefined;
};

export function ConfirmationBox(p: Props) {
  const {
    triggerPrice,
    fixedTriggerThresholdType,
    fixedTriggerOrderType,
    swapLiquidityUsd,
    longLiquidityUsd,
    shortLiquidityUsd,
    fees,
    executionFee,
    error,
    existingPosition,
    shouldDisableValidation,
    marketsOptions,
    selectedTriggerAcceptablePriceImpactBps,
    setSelectedTriggerAcceptablePriceImpactBps,
    onClose,
    onSubmitted,
    setPendingTxns,
    triggerRatioValue,
    markPrice,
  } = p;
  const {
    isWrapOrUnwrap,
    fromTokenAddress,
    toTokenAddress,
    defaultTriggerAcceptablePriceImpactBps,
    marketInfo,
    collateralToken,
    keepLeverage,
    setKeepLeverage,
    tradeMode,
    tradeType,
  } = useTradeboxState();

  const { element: highExecutionFeeAcknowledgement, isHighFeeConsentError } = useHighExecutionFeeConsent(
    executionFee?.feeUsd
  );

  const { markRatio, triggerRatio } = useTradeRatios({
    fromTokenAddress,
    toTokenAddress,
    tradeMode,
    tradeType,
    triggerRatioValue,
  });

  const tokensData = useTokensData();
  const ordersData = useOrdersInfoData();
  const swapAmounts = useTradeboxSwapAmounts();
  const increaseAmounts = useTradeboxIncreasePositionAmounts();
  const decreaseAmounts = useTradeboxDecreasePositionAmounts();
  const nextPositionValuesForIncrease = useTradeboxNextPositionValuesForIncrease();
  const nextPositionValuesForDecrease = useTradeboxNextPositionValuesForDecrease();
  const tradeFlags = useTradeboxTradeFlags();

  const nextPositionValues = useMemo(() => {
    return tradeFlags.isIncrease ? nextPositionValuesForIncrease : nextPositionValuesForDecrease;
  }, [nextPositionValuesForDecrease, nextPositionValuesForIncrease, tradeFlags.isIncrease]);

  const fromToken = getByKey(tokensData, fromTokenAddress);
  const toToken = getByKey(tokensData, toTokenAddress);

  const { isLong, isShort, isPosition, isSwap, isMarket, isLimit, isTrigger, isIncrease } = tradeFlags;
  const { indexToken } = marketInfo || {};

  const { signer, account } = useWallet();
  const { chainId } = useChainId();
  const { openConnectModal } = useConnectModal();
  const { setPendingPosition, setPendingOrder } = useSyntheticsEvents();
  const { savedAllowedSlippage } = useSettings();
  const { gasLimits } = useGasLimits(chainId);
  const { gasPrice } = useGasPrice(chainId);
  const prevIsVisible = usePrevious(p.isVisible);

  const { referralCodeForTxn } = useUserReferralCode(signer, chainId, account);

  const [isTriggerWarningAccepted, setIsTriggerWarningAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allowedSlippage, setAllowedSlippage] = useState(savedAllowedSlippage);
  const submitButtonRef = useRef<null | HTMLDivElement>(null);

  const { stopLoss, takeProfit } = useSLTPEntries({
    marketInfo,
    tradeFlags,
    collateralToken,
    increaseAmounts,
    nextPositionValues,
    triggerPrice,
  });

  const { sltpEntries, sltpAmounts } = useMemo(() => {
    const entries = (stopLoss?.entries || []).concat(takeProfit?.entries || []);
    const amounts = entries.map((entry) => entry.amounts).filter(Boolean) as DecreasePositionAmounts[];
    return { sltpEntries: entries, sltpAmounts: amounts };
  }, [stopLoss, takeProfit]);

  useEffect(() => {
    setAllowedSlippage(savedAllowedSlippage);
  }, [savedAllowedSlippage, p.isVisible]);

  const payAmount = useMemo(() => {
    if (isSwap && !isWrapOrUnwrap) {
      return swapAmounts?.amountIn;
    }
    if (isIncrease) {
      return increaseAmounts?.initialCollateralAmount;
    }
  }, [increaseAmounts?.initialCollateralAmount, isIncrease, isSwap, isWrapOrUnwrap, swapAmounts?.amountIn]);

  const { tokensAllowanceData } = useTokensAllowanceData(chainId, {
    spenderAddress: getContract(chainId, "SyntheticsRouter"),
    tokenAddresses: fromToken ? [fromToken.address] : [],
    skip: !p.isVisible,
  });

  const needPayTokenApproval =
    tokensAllowanceData &&
    fromToken &&
    payAmount &&
    getNeedTokenApprove(tokensAllowanceData, fromToken.address, payAmount);

  const positionKey = useMemo(() => {
    if (!account || !marketInfo || !collateralToken) {
      return undefined;
    }

    return getPositionKey(account, marketInfo.marketTokenAddress, collateralToken.address, isLong);
  }, [account, collateralToken, isLong, marketInfo]);

  const positionOrders = useMemo(() => {
    if (!positionKey || !ordersData) {
      return [];
    }

    return Object.values(ordersData).filter((order) => isOrderForPosition(order, positionKey)) as PositionOrderInfo[];
  }, [ordersData, positionKey]);

  const getDecreaseExecutionFee = useCallback(
    (decreaseAmounts?: DecreasePositionAmounts) => {
      if (!decreaseAmounts || !gasLimits || !tokensData || !gasPrice) return;
      const swapsCount = decreaseAmounts.decreaseSwapType === DecreasePositionSwapType.NoSwap ? 0 : 1;

      const estimatedGas = estimateExecuteDecreaseOrderGasLimit(gasLimits, {
        swapsCount,
      });

      return getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice);
    },
    [gasLimits, tokensData, gasPrice, chainId]
  );

  const existingLimitOrders = useMemo(
    () => positionOrders.filter((order) => isLimitOrderType(order.orderType)),
    [positionOrders]
  );

  const existingTriggerOrders = useMemo(
    () => positionOrders.filter((order) => isTriggerDecreaseOrderType(order.orderType)),
    [positionOrders]
  );

  const decreaseOrdersThatWillBeExecuted = useMemo(() => {
    if (!existingPosition || !markPrice) {
      return [];
    }

    return existingTriggerOrders.filter((order) => {
      return order.triggerThresholdType === TriggerThresholdType.Above
        ? markPrice.gt(order.triggerPrice)
        : markPrice.lt(order.triggerPrice);
    });
  }, [existingPosition, existingTriggerOrders, markPrice]);

  const swapSpreadInfo = useMemo(() => {
    let spread = BigNumber.from(0);

    if (isSwap && fromToken && toToken) {
      const fromSpread = getSpread(fromToken.prices);
      const toSpread = getSpread(toToken.prices);

      spread = fromSpread.add(toSpread);
    } else if (isIncrease && fromToken && indexToken) {
      const fromSpread = getSpread(fromToken.prices);
      const toSpread = getSpread(indexToken.prices);

      spread = fromSpread.add(toSpread);

      if (isLong) {
        spread = fromSpread;
      }
    }

    const isHigh = spread.gt(HIGH_SPREAD_THRESHOLD);

    const showSpread = isMarket;

    return { spread, showSpread, isHigh };
  }, [isSwap, fromToken, toToken, isIncrease, indexToken, isMarket, isLong]);

  const collateralSpreadInfo = useMemo(() => {
    if (!indexToken || !collateralToken) {
      return undefined;
    }

    let totalSpread = getSpread(indexToken.prices);

    if (getIsEquivalentTokens(collateralToken, indexToken)) {
      return {
        spread: totalSpread,
        isHigh: totalSpread.gt(HIGH_SPREAD_THRESHOLD),
      };
    }

    totalSpread = totalSpread.add(getSpread(collateralToken!.prices!));

    return {
      spread: totalSpread,
      isHigh: totalSpread.gt(HIGH_SPREAD_THRESHOLD),
    };
  }, [collateralToken, indexToken]);

  const title = useMemo(() => {
    if (isMarket) {
      if (isSwap) {
        return t`Confirm Swap`;
      }

      return isLong ? t`Confirm Long` : t`Confirm Short`;
    }

    if (isLimit) {
      return t`Confirm Limit Order`;
    }

    return t`Confirm ${getTriggerNameByOrderType(fixedTriggerOrderType)} Order`;
  }, [fixedTriggerOrderType, isLimit, isLong, isMarket, isSwap]);

  const priceImpactWarningState = usePriceImpactWarningState({
    positionPriceImpact: fees?.positionPriceImpact,
    swapPriceImpact: fees?.swapPriceImpact,
    place: "confirmationBox",
    tradeFlags,
  });

  const setIsHighPositionImpactAcceptedRef = useLatest(priceImpactWarningState.setIsHighPositionImpactAccepted);
  const setIsHighSwapImpactAcceptedRef = useLatest(priceImpactWarningState.setIsHighSwapImpactAccepted);

  useEffect(() => {
    setIsHighPositionImpactAcceptedRef.current(false);
    setIsHighSwapImpactAcceptedRef.current(false);
  }, [p.isVisible, setIsHighPositionImpactAcceptedRef, setIsHighSwapImpactAcceptedRef]);

  const submitButtonState = useMemo(() => {
    if (priceImpactWarningState.validationError) {
      return {
        text: t`Price Impact not yet acknowledged`,
        disabled: true,
      };
    }

    if (isHighFeeConsentError) {
      return {
        text: t`High Execution Fee not yet acknowledged`,
        disabled: true,
      };
    }

    if (isSubmitting) {
      return {
        text: t`Creating Order...`,
        disabled: true,
      };
    }

    if (error) {
      return {
        text: error,
        disabled: true,
      };
    }

    if (needPayTokenApproval) {
      return { text: t`Pending ${fromToken?.assetSymbol ?? fromToken?.symbol} approval`, disabled: true };
    }

    if (isIncrease && decreaseOrdersThatWillBeExecuted.length > 0 && !isTriggerWarningAccepted) {
      return {
        text: t`Accept confirmation of trigger orders`,
        disabled: true,
      };
    }

    let text = "";

    if (isMarket) {
      if (isSwap) {
        text = t`Swap`;
      } else {
        text = isLong ? t`Long` : t`Short`;
      }
    } else if (isLimit) {
      text = t`Confirm Limit Order`;
    } else {
      text = t`Confirm ${getTriggerNameByOrderType(fixedTriggerOrderType)} Order`;
    }

    if (sltpEntries.length > 0) {
      const isError = sltpEntries.some((entry) => entry.error);
      return {
        text,
        disabled: isError,
      };
    }

    return {
      text,
      disabled: false,
    };
  }, [
    priceImpactWarningState.validationError,
    isHighFeeConsentError,
    isSubmitting,
    error,
    needPayTokenApproval,
    isIncrease,
    decreaseOrdersThatWillBeExecuted.length,
    isTriggerWarningAccepted,
    isMarket,
    isLimit,
    fromToken?.assetSymbol,
    fromToken?.symbol,
    isSwap,
    isLong,
    fixedTriggerOrderType,
    sltpEntries,
  ]);

  useKey(
    "Enter",
    () => {
      if (p.isVisible && !submitButtonState.disabled) {
        submitButtonRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        onSubmit();
      }
    },
    {},
    [p.isVisible, submitButtonState.disabled]
  );

  const subaccountRequiredBalance =
    p.executionFee?.feeTokenAmount.add(
      sltpAmounts.reduce(
        (acc, amount) => acc.add(getDecreaseExecutionFee(amount)?.feeTokenAmount || 0),
        BigNumber.from(0)
      )
    ) ?? null;
  const subaccount = useSubaccount(subaccountRequiredBalance, 1 + sltpAmounts.length);
  const isLastSubaccountAction = useIsLastSubaccountAction(1 + sltpAmounts.length);
  const cancelOrdersDetailsMessage = useSubaccountCancelOrdersDetailsMessage(subaccountRequiredBalance ?? undefined, 1);

  function onCancelOrderClick(key: string): void {
    if (!signer) return;
    cancelOrdersTxn(chainId, signer, subaccount, {
      orderKeys: [key],
      setPendingTxns: p.setPendingTxns,
      isLastSubaccountAction,
      detailsMsg: cancelOrdersDetailsMessage,
    });
  }

  function onSubmitWrapOrUnwrap() {
    if (!account || !swapAmounts || !fromToken || !signer) {
      return Promise.resolve();
    }

    return createWrapOrUnwrapTxn(chainId, signer, {
      amount: swapAmounts.amountIn,
      isWrap: Boolean(fromToken.isNative),
      setPendingTxns,
    });
  }

  function onSubmitSwap() {
    if (
      !account ||
      !tokensData ||
      !swapAmounts?.swapPathStats ||
      !fromToken ||
      !toToken ||
      !executionFee ||
      !signer ||
      typeof allowedSlippage !== "number"
    ) {
      helperToast.error(t`Error submitting order`);
      return Promise.resolve();
    }

    return createSwapOrderTxn(chainId, signer, subaccount, {
      account,
      fromTokenAddress: fromToken.address,
      fromTokenAmount: swapAmounts.amountIn,
      swapPath: swapAmounts.swapPathStats?.swapPath,
      toTokenAddress: toToken.address,
      orderType: isLimit ? OrderType.LimitSwap : OrderType.MarketSwap,
      minOutputAmount: swapAmounts.minOutputAmount,
      referralCode: referralCodeForTxn,
      executionFee: executionFee.feeTokenAmount,
      allowedSlippage,
      tokensData,
      setPendingTxns,
      setPendingOrder,
    });
  }

  function onSubmitIncreaseOrder() {
    if (
      !tokensData ||
      !account ||
      !fromToken ||
      !collateralToken ||
      !increaseAmounts?.acceptablePrice ||
      !executionFee ||
      !marketInfo ||
      !signer ||
      typeof allowedSlippage !== "number"
    ) {
      helperToast.error(t`Error submitting order`);
      return Promise.resolve();
    }

    return createIncreaseOrderTxn(
      chainId,
      signer,
      subaccount,
      {
        account,
        marketAddress: marketInfo.marketTokenAddress,
        initialCollateralAddress: fromToken?.address,
        initialCollateralAmount: increaseAmounts.initialCollateralAmount,
        targetCollateralAddress: collateralToken.address,
        collateralDeltaAmount: increaseAmounts.collateralDeltaAmount,
        swapPath: increaseAmounts.swapPathStats?.swapPath || [],
        sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
        sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens,
        triggerPrice: isLimit ? triggerPrice : undefined,
        acceptablePrice: increaseAmounts.acceptablePrice,
        isLong,
        orderType: isLimit ? OrderType.LimitIncrease : OrderType.MarketIncrease,
        executionFee: executionFee.feeTokenAmount,
        allowedSlippage,
        referralCode: referralCodeForTxn,
        indexToken: marketInfo.indexToken,
        tokensData,
        skipSimulation: isLimit || shouldDisableValidation,
        setPendingTxns: p.setPendingTxns,
        setPendingOrder,
        setPendingPosition,
      },
      sltpAmounts.map((entry) => {
        return {
          account,
          marketAddress: marketInfo.marketTokenAddress,
          initialCollateralAddress: collateralToken?.address,
          initialCollateralDeltaAmount: entry.collateralDeltaAmount || BigNumber.from(0),
          receiveTokenAddress: collateralToken.address,
          swapPath: [],
          sizeDeltaUsd: entry.sizeDeltaUsd,
          sizeDeltaInTokens: entry.sizeDeltaInTokens,
          isLong,
          acceptablePrice: entry.acceptablePrice,
          triggerPrice: entry.triggerPrice,
          minOutputUsd: BigNumber.from(0),
          decreasePositionSwapType: entry.decreaseSwapType,
          orderType: entry.triggerOrderType!,
          referralCode: referralCodeForTxn,
          executionFee: getDecreaseExecutionFee(entry)?.feeTokenAmount || BigNumber.from(0),
          allowedSlippage,
          indexToken: marketInfo.indexToken,
          tokensData,
          skipSimulation: isLimit || shouldDisableValidation,
        };
      })
    );
  }

  function onSubmitDecreaseOrder() {
    if (
      !account ||
      !marketInfo ||
      !collateralToken ||
      fixedTriggerOrderType === undefined ||
      fixedTriggerThresholdType === undefined ||
      !decreaseAmounts?.acceptablePrice ||
      !decreaseAmounts?.triggerPrice ||
      !executionFee ||
      !tokensData ||
      !signer ||
      typeof allowedSlippage !== "number"
    ) {
      helperToast.error(t`Error submitting order`);
      return Promise.resolve();
    }

    return createDecreaseOrderTxn(
      chainId,
      signer,
      subaccount,
      {
        account,
        marketAddress: marketInfo.marketTokenAddress,
        swapPath: [],
        initialCollateralDeltaAmount: decreaseAmounts.collateralDeltaAmount,
        initialCollateralAddress: collateralToken.address,
        receiveTokenAddress: collateralToken.address,
        triggerPrice: decreaseAmounts.triggerPrice,
        acceptablePrice: decreaseAmounts.acceptablePrice,
        sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
        sizeDeltaInTokens: decreaseAmounts.sizeDeltaInTokens,
        minOutputUsd: BigNumber.from(0),
        isLong,
        decreasePositionSwapType: decreaseAmounts.decreaseSwapType,
        orderType: fixedTriggerOrderType,
        executionFee: executionFee.feeTokenAmount,
        allowedSlippage,
        referralCode: referralCodeForTxn,
        // Skip simulation to avoid EmptyPosition error
        // skipSimulation: !existingPosition || shouldDisableValidation,
        skipSimulation: true,
        indexToken: marketInfo.indexToken,
        tokensData,
      },
      {
        setPendingTxns,
        setPendingOrder,
        setPendingPosition,
      }
    );
  }

  function onSubmit() {
    setIsSubmitting(true);

    let txnPromise: Promise<any>;

    if (!account) {
      openConnectModal?.();
      return;
    } else if (isWrapOrUnwrap) {
      txnPromise = onSubmitWrapOrUnwrap();
    } else if (isSwap) {
      txnPromise = onSubmitSwap();
    } else if (isIncrease) {
      txnPromise = onSubmitIncreaseOrder();
    } else {
      txnPromise = onSubmitDecreaseOrder();
    }

    txnPromise
      .then(() => {
        onSubmitted();
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  useEffect(
    function reset() {
      if (p.isVisible !== prevIsVisible) {
        setIsTriggerWarningAccepted(false);
        stopLoss?.reset();
        takeProfit?.reset();
      }
    },
    [p.isVisible, prevIsVisible, takeProfit, stopLoss]
  );

  function renderSubaccountNavigationButton() {
    return (
      <SubaccountNavigationButton
        executionFee={p.executionFee?.feeTokenAmount}
        closeConfirmationBox={onClose}
        isNativeToken={fromToken?.isNative || toToken?.isNative}
        isWrapOrUnwrap={isWrapOrUnwrap}
        tradeFlags={tradeFlags}
        requiredActions={1 + sltpAmounts.length}
      />
    );
  }

  function renderMain() {
    if (isSwap) {
      return (
        <>
          <div className="Confirmation-box-main trade-info-wrapper">
            <div className="trade-info">
              <div className="trade-token-amount">
                <Trans>Pay</Trans>{" "}
                <span>
                  {formatTokenAmount(swapAmounts?.amountIn, fromToken?.decimals, fromToken?.symbol, {
                    useCommas: true,
                  })}
                </span>
              </div>
              <div className="trade-amount-usd">{formatUsd(swapAmounts?.usdIn)}</div>
            </div>
            <FaArrowRight className="arrow-icon" fontSize={12} color="#ffffffb3" />
            <div className="trade-info">
              <div className="trade-token-amount">
                <Trans>Receive</Trans>{" "}
                <span>
                  {formatTokenAmount(swapAmounts?.amountOut, toToken?.decimals, toToken?.symbol, { useCommas: true })}
                </span>
              </div>
              <div className="trade-amount-usd">{formatUsd(swapAmounts?.usdOut)}</div>
            </div>
          </div>
          <div>{renderSubaccountNavigationButton()}</div>
        </>
      );
    }

    if (isIncrease) {
      return (
        <>
          <div className="Confirmation-box-main trade-info-wrapper">
            <div className="trade-info">
              <div className="trade-token-amount">
                <Trans>Pay</Trans>{" "}
                <span>
                  {formatTokenAmount(increaseAmounts?.initialCollateralAmount, fromToken?.decimals, fromToken?.symbol, {
                    useCommas: true,
                  })}
                </span>
              </div>
              <div className="trade-amount-usd">{formatUsd(increaseAmounts?.initialCollateralUsd)}</div>
            </div>
            <FaArrowRight className="arrow-icon" fontSize={12} color="#ffffffb3" />
            <div className="trade-info">
              <div className="trade-token-amount">
                {isLong ? t`Long` : t`Short`}{" "}
                <span>
                  {formatTokenAmount(increaseAmounts?.sizeDeltaInTokens, toToken?.decimals, toToken?.symbol, {
                    useCommas: true,
                  })}
                </span>
              </div>
              <div className="trade-amount-usd">{formatUsd(increaseAmounts?.sizeDeltaUsd)}</div>
            </div>
          </div>
          <div>{renderSubaccountNavigationButton()}</div>
        </>
      );
    }

    return (
      <>
        <div className={cx("Confirmation-box-main ConfirmationBox-main")}>
          <Trans>Decrease</Trans>&nbsp;{indexToken?.symbol} {isLong ? t`Long` : t`Short`}
        </div>
        {renderSubaccountNavigationButton()}
      </>
    );
  }

  function renderOrderItem(order: PositionOrderInfo) {
    return (
      <li key={order.key}>
        <p>
          {order.isLong ? t`Long` : t`Short`} {order.indexToken?.symbol} ({order.targetCollateralToken.symbol}):{" "}
          {formatUsd(order.sizeDeltaUsd)} at price &nbsp;
          {order.triggerThresholdType}
          {formatUsd(order.triggerPrice, {
            displayDecimals: toToken?.priceDecimals,
          })}{" "}
        </p>
        <button type="button" onClick={() => onCancelOrderClick(order.key)}>
          <IoClose fontSize={20} className="Modal-close-icon" />
        </button>
      </li>
    );
  }

  function renderDifferentTokensWarning() {
    if (!isPosition || !fromToken || !toToken) {
      return null;
    }
    const isCollateralTokenNonStable = !collateralToken?.isStable;
    const collateralTokenSymbol = collateralToken?.[collateralToken?.isWrapped ? "baseSymbol" : "symbol"];
    const indexTokenSymbol = indexToken?.[indexToken?.isWrapped ? "baseSymbol" : "symbol"];

    if (isCollateralTokenNonStable && collateralTokenSymbol !== indexTokenSymbol) {
      return (
        <AlertInfo compact type="warning">
          <Trans>
            You have selected {collateralTokenSymbol} as Collateral, the Liquidation Price will vary based on the price
            of {collateralTokenSymbol}.
          </Trans>
        </AlertInfo>
      );
    }

    if (isLong && isCollateralTokenNonStable && collateralTokenSymbol === indexTokenSymbol) {
      return (
        <AlertInfo compact type="warning">
          <Trans>
            You have selected {collateralTokenSymbol} as collateral, the Liquidation Price is higher compared to using a
            stablecoin as collateral since the worth of the collateral will change with its price. If required, you can
            change the collateral type using the Collateral In option in the trade box.
          </Trans>
        </AlertInfo>
      );
    }

    if (isShort && isCollateralTokenNonStable && collateralTokenSymbol === indexTokenSymbol) {
      return (
        <AlertInfo compact type="warning">
          <Trans>
            You have selected {collateralTokenSymbol} as collateral to short {indexTokenSymbol}.
          </Trans>
        </AlertInfo>
      );
    }
  }

  const isOrphanOrder =
    marketsOptions?.collateralWithPosition &&
    collateralToken &&
    !getIsEquivalentTokens(marketsOptions.collateralWithPosition, collateralToken);

  const executionPriceUsd = useMemo(() => {
    if (!marketInfo) return null;
    if (!fees?.positionPriceImpact?.deltaUsd) return null;
    if (!decreaseAmounts) return null;
    if (!triggerPrice) return null;

    return getExecutionPriceForDecrease(
      triggerPrice,
      fees.positionPriceImpact.deltaUsd,
      decreaseAmounts.sizeDeltaUsd,
      isLong
    );
  }, [decreaseAmounts, fees?.positionPriceImpact?.deltaUsd, isLong, marketInfo, triggerPrice]);

  function renderDifferentCollateralWarning() {
    if (!isOrphanOrder) {
      return null;
    }

    if (isMarket) {
      return (
        <AlertInfo compact type="warning">
          <Trans>
            You have an existing position with {marketsOptions?.collateralWithPosition?.symbol} as collateral. This
            action will not apply for that position.
          </Trans>
        </AlertInfo>
      );
    }

    return (
      <AlertInfo compact type="warning">
        <Trans>
          You have an existing position with {marketsOptions?.collateralWithPosition?.symbol} as collateral. This Order
          will not be valid for that Position.
        </Trans>
      </AlertInfo>
    );
  }

  function renderExistingLimitOrdersWarning() {
    if (!existingLimitOrders?.length || !toToken) {
      return;
    }
    return (
      <div className="Existing-limit-order">
        <AlertInfo compact type="warning">
          <Plural
            value={existingLimitOrders.length}
            one="You have an active Limit Order to Increase"
            other="You have multiple active Limit Orders to Increase"
          />
        </AlertInfo>
        <ul className="order-list">{existingLimitOrders.map(renderOrderItem)}</ul>
      </div>
    );
  }
  function renderExistingTriggerErrors() {
    if (!decreaseOrdersThatWillBeExecuted?.length) {
      return;
    }

    const existingTriggerOrderLength = decreaseOrdersThatWillBeExecuted.length;
    return (
      <>
        <AlertInfo compact type="warning">
          <Plural
            value={existingTriggerOrderLength}
            one="You have an active trigger order that might execute immediately after you open this position. Please cancel the order or accept the confirmation to continue."
            other="You have # active trigger orders that might execute immediately after you open this position. Please cancel the orders or accept the confirmation to continue."
          />
        </AlertInfo>
        <ul className="order-list">{decreaseOrdersThatWillBeExecuted.map(renderOrderItem)}</ul>
      </>
    );
  }

  function renderExistingTriggerWarning() {
    if (
      !existingTriggerOrders?.length ||
      decreaseOrdersThatWillBeExecuted.length > 0 ||
      renderExistingLimitOrdersWarning()
    ) {
      return;
    }

    const existingTriggerOrderLength = existingTriggerOrders.length;

    return (
      <AlertInfo compact type="info">
        <Plural
          value={existingTriggerOrderLength}
          one="You have an active trigger order that could impact this position."
          other="You have # active trigger orders that could impact this position."
        />
      </AlertInfo>
    );
  }

  function renderAvailableLiquidity() {
    const riskThresholdBps = 5000;
    let availableLiquidityUsd: BigNumber | undefined = undefined;
    let availableLiquidityAmount: BigNumber | undefined = undefined;
    let isLiquidityRisk = false;

    let tooltipContent = "";

    if (isSwap && swapAmounts) {
      availableLiquidityUsd = swapLiquidityUsd;

      availableLiquidityAmount = convertToTokenAmount(
        availableLiquidityUsd,
        toToken?.decimals,
        toToken?.prices.maxPrice
      );

      isLiquidityRisk = availableLiquidityUsd!.mul(riskThresholdBps).div(BASIS_POINTS_DIVISOR).lt(swapAmounts.usdOut);

      tooltipContent = isLiquidityRisk
        ? t`There may not be sufficient liquidity to execute your order when the Min. Receive are met.`
        : t`The order will only execute if the Min. Receive is met and there is sufficient liquidity.`;
    }

    if (isIncrease && increaseAmounts) {
      availableLiquidityUsd = isLong ? longLiquidityUsd : shortLiquidityUsd;

      isLiquidityRisk = availableLiquidityUsd!
        .mul(riskThresholdBps)
        .div(BASIS_POINTS_DIVISOR)
        .lt(increaseAmounts.sizeDeltaUsd);

      tooltipContent = isLiquidityRisk
        ? t`There may not be sufficient liquidity to execute your order when the price conditions are met.`
        : t`The order will only execute if the price conditions are met and there is sufficient liquidity.`;
    }

    return (
      <ExchangeInfoRow label={t`Available Liquidity`}>
        <Tooltip
          position="bottom-end"
          handleClassName={isLiquidityRisk ? "negative" : ""}
          handle={
            isSwap
              ? formatTokenAmount(availableLiquidityAmount, toToken?.decimals, toToken?.symbol)
              : formatUsd(availableLiquidityUsd)
          }
          renderContent={() => tooltipContent}
        />
      </ExchangeInfoRow>
    );
  }

  function renderSwapSpreadWarining() {
    if (!isMarket) {
      return null;
    }

    if (swapSpreadInfo.spread && swapSpreadInfo.isHigh) {
      return (
        <div className="mb-sm">
          <AlertInfo compact type="warning">
            <Trans>The spread is {`>`} 1%, please ensure the trade details are acceptable before comfirming</Trans>
          </AlertInfo>
        </div>
      );
    }
  }

  const renderCollateralSpreadWarning = useCallback(() => {
    if (collateralSpreadInfo && collateralSpreadInfo.isHigh) {
      return (
        <AlertInfo compact type="warning">
          <Trans>
            Transacting with a depegged stable coin is subject to spreads reflecting the worse of current market price
            or $1.00, with transactions involving multiple stablecoins may have multiple spreads.
          </Trans>
        </AlertInfo>
      );
    }
  }, [collateralSpreadInfo]);

  function renderSLTP(type: "stopLoss" | "takeProfit") {
    const isStopLoss = type === "stopLoss";
    const entriesInfo = isStopLoss ? stopLoss : takeProfit;

    if (existingPosition || !entriesInfo) return;

    const label = isStopLoss ? t`Stop-Loss` : t`Take-Profit`;
    const labelPnl = isStopLoss ? t`Stop-Loss PnL` : t`Take-Profit PnL`;

    return (
      <div>
        <ExchangeInfoRow
          className="swap-box-info-row"
          label={label}
          value={
            <div className="profit-loss-wrapper">
              <SLTPEntries entriesInfo={entriesInfo} marketInfo={marketInfo} />
            </div>
          }
        />
        <ExchangeInfoRow className="swap-box-info-row" label={labelPnl}>
          {entriesInfo?.totalPnL?.isZero() ? (
            "-"
          ) : (
            <Tooltip
              handle={`${formatUsd(entriesInfo?.totalPnL)} (${formatPercentage(entriesInfo?.totalPnLPercentage, {
                signed: true,
              })})`}
              position="bottom-end"
              handleClassName={entriesInfo.totalPnL?.isNegative() ? "text-red" : "text-green"}
              className="SLTP-pnl-tooltip"
              renderContent={() =>
                entriesInfo?.entries?.map((entry, index) => {
                  if (!entry || !entry.amounts) return;
                  return (
                    <div className="space-between mb-xs" key={index}>
                      <span className="mr-md">
                        At ${entry.price}, SL {entry?.percentage}%:
                      </span>
                      <span className={entry.amounts?.realizedPnl.isNegative() ? "text-red" : "text-green"}>
                        {formatUsd(entry.amounts?.realizedPnl)} (
                        {formatPercentage(entry.amounts?.realizedPnlPercentage, {
                          signed: true,
                        })}
                        )
                      </span>
                    </div>
                  );
                })
              }
            />
          )}
        </ExchangeInfoRow>
      </div>
    );
  }

  function renderAcceptablePriceImpactInput() {
    return (
      <AcceptablePriceImpactInputRow
        acceptablePriceImpactBps={selectedTriggerAcceptablePriceImpactBps}
        recommendedAcceptablePriceImpactBps={defaultTriggerAcceptablePriceImpactBps}
        priceImpactFeeBps={fees?.positionPriceImpact?.bps}
        setAcceptablePriceImpactBps={setSelectedTriggerAcceptablePriceImpactBps}
      />
    );
  }

  function renderHighPriceImpactWarning() {
    if (!priceImpactWarningState.shouldShowWarning) return null;
    return <HighPriceImpactWarning priceImpactWarinigState={priceImpactWarningState} />;
  }

  const [initialCollateralSpread, setInitialCollateralSpread] = useState<BigNumber | undefined>();

  const collateralSpreadPercent = collateralSpreadInfo?.spread
    ?.mul(BASIS_POINTS_DIVISOR)
    ?.div(expandDecimals(1, USD_DECIMALS));

  useEffect(() => {
    if (collateralSpreadPercent && !initialCollateralSpread) {
      setInitialCollateralSpread(collateralSpreadPercent);
    }
  }, [collateralSpreadPercent, initialCollateralSpread]);

  function renderIncreaseOrderSection() {
    if (!marketInfo || !fromToken || !collateralToken || !toToken) {
      return null;
    }

    const borrowingRate = getBorrowingFactorPerPeriod(marketInfo, isLong, CHART_PERIODS["1h"]).mul(100);
    const fundigRate = getFundingFactorPerPeriod(marketInfo, isLong, CHART_PERIODS["1h"]).mul(100);
    const isCollateralSwap = !getIsEquivalentTokens(fromToken, collateralToken);
    const existingPriceDecimals = p.existingPosition?.indexToken?.priceDecimals;
    const toTokenPriceDecimals = toToken?.priceDecimals;

    const shouldApplySlippage = isMarket;
    const acceptablePrice =
      shouldApplySlippage && increaseAmounts?.acceptablePrice
        ? applySlippageToPrice(allowedSlippage, increaseAmounts.acceptablePrice, true, isLong)
        : increaseAmounts?.acceptablePrice;

    const isNearZeroFromStart =
      initialCollateralSpread?.eq(0) &&
      collateralSpreadPercent?.lt(COLLATERAL_SPREAD_SHOW_AFTER_INITIAL_ZERO_THRESHOLD);

    const showCollateralSpread = isMarket && !isNearZeroFromStart;

    return (
      <ExchangeInfo>
        <ExchangeInfo.Group>{renderMain()}</ExchangeInfo.Group>

        <ExchangeInfo.Group>
          {renderDifferentCollateralWarning()}
          {renderCollateralSpreadWarning()}
          {renderExistingLimitOrdersWarning()}
          {renderExistingTriggerErrors()}
          {renderExistingTriggerWarning()}
          {renderDifferentTokensWarning()}
        </ExchangeInfo.Group>

        <ExchangeInfo.Group>{renderSLTP("takeProfit")}</ExchangeInfo.Group>

        <ExchangeInfo.Group>{renderSLTP("stopLoss")}</ExchangeInfo.Group>

        <ExchangeInfo.Group>
          {renderLeverage(existingPosition?.leverage, nextPositionValues?.nextLeverage)}
        </ExchangeInfo.Group>

        <ExchangeInfo.Group>
          {isLimit && renderAvailableLiquidity()}
          {showCollateralSpread && (
            <ExchangeInfoRow label={t`Collateral Spread`} isWarning={collateralSpreadInfo?.isHigh}>
              {formatPercentage(collateralSpreadPercent)}
            </ExchangeInfoRow>
          )}
          {isMarket && (
            <AllowedSlippageRow
              defaultSlippage={savedAllowedSlippage}
              allowedSlippage={allowedSlippage}
              setSlippage={setAllowedSlippage}
            />
          )}
          {isLimit && increaseAmounts && renderAcceptablePriceImpactInput()}
        </ExchangeInfo.Group>

        <ExchangeInfo.Group>
          {isLimit && (
            <ExchangeInfoRow
              className="SwapBox-info-row"
              label={t`Limit Price`}
              value={
                formatUsd(triggerPrice, {
                  displayDecimals: toTokenPriceDecimals,
                }) || "-"
              }
            />
          )}

          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Entry Price`}
            value={
              <ValueTransition
                from={formatUsd(p.existingPosition?.entryPrice, {
                  displayDecimals: existingPriceDecimals,
                })}
                to={formatUsd(nextPositionValues?.nextEntryPrice, {
                  displayDecimals: toTokenPriceDecimals,
                })}
              />
            }
          />

          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Acceptable Price`}
            value={
              formatAcceptablePrice(acceptablePrice, {
                displayDecimals: toTokenPriceDecimals,
              }) || "-"
            }
          />

          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Mark Price`}
            value={
              formatUsd(markPrice, {
                displayDecimals: toTokenPriceDecimals,
              }) || "-"
            }
          />

          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Liq. Price`}
            value={
              <ValueTransition
                from={
                  p.existingPosition
                    ? formatLiquidationPrice(p.existingPosition?.liquidationPrice, {
                        displayDecimals: existingPriceDecimals,
                      })
                    : undefined
                }
                to={
                  formatLiquidationPrice(nextPositionValues?.nextLiqPrice, {
                    displayDecimals: toTokenPriceDecimals,
                  }) || "-"
                }
              />
            }
          />
        </ExchangeInfo.Group>

        <ExchangeInfo.Group>
          {p.existingPosition?.sizeInUsd.gt(0) && (
            <ExchangeInfoRow
              label={t`Size`}
              value={
                <ValueTransition
                  from={formatUsd(p.existingPosition.sizeInUsd)!}
                  to={formatUsd(nextPositionValues?.nextSizeUsd)}
                />
              }
            />
          )}
          <div className="Exchange-info-row">
            <div>
              {isCollateralSwap ? (
                <Tooltip
                  handle={
                    <span className="Exchange-info-label">
                      <Trans>Collateral ({collateralToken?.symbol})</Trans>
                    </span>
                  }
                  position="top-start"
                  renderContent={() => {
                    return (
                      <div>
                        <Trans>
                          {fromToken?.symbol} will be swapped to {collateralToken?.symbol} on order execution.{" "}
                        </Trans>{" "}
                        {isLimit && (
                          <Trans>
                            Collateral value may differ due to different Price Impact at the time of execution.
                          </Trans>
                        )}
                      </div>
                    );
                  }}
                />
              ) : (
                <span className="Exchange-info-label">
                  <Trans>Collateral ({collateralToken?.symbol})</Trans>
                </span>
              )}
            </div>
            <div className="align-right">
              <Tooltip
                handle={
                  <ValueTransition
                    from={formatUsd(existingPosition?.collateralUsd)}
                    to={formatUsd(nextPositionValues?.nextCollateralUsd)}
                  />
                }
                position="top-end"
                renderContent={() => {
                  return (
                    <>
                      <Trans>Your position's collateral after deducting fees:</Trans>
                      <br />
                      <br />
                      {existingPosition && (
                        <StatsTooltipRow
                          label={t`Old Collateral`}
                          value={formatUsd(existingPosition.collateralUsd) || "-"}
                          showDollar={false}
                        />
                      )}
                      <StatsTooltipRow
                        label={t`Pay Amount`}
                        value={formatUsd(increaseAmounts?.initialCollateralUsd) || "-"}
                        showDollar={false}
                      />
                      <StatsTooltipRow
                        label={t`Fees`}
                        value={
                          fees?.payTotalFees?.deltaUsd && !fees.payTotalFees.deltaUsd.eq(0)
                            ? formatDeltaUsd(fees.payTotalFees.deltaUsd)
                            : "0.00$"
                        }
                        showDollar={false}
                        className={getPositiveOrNegativeClass(fees?.payTotalFees?.deltaUsd)}
                      />
                      <div className="Tooltip-divider" />
                      <StatsTooltipRow
                        label={existingPosition ? t`New Collateral` : t`Collateral`}
                        value={formatUsd(nextPositionValues?.nextCollateralUsd) || "-"}
                        showDollar={false}
                      />
                    </>
                  );
                }}
              />
            </div>
          </div>
          <TradeFeesRow
            {...fees}
            fundingFeeRateStr={
              fundigRate && `${getPlusOrMinusSymbol(fundigRate)}${formatAmount(fundigRate.abs(), 30, 4)}% / 1h`
            }
            borrowFeeRateStr={borrowingRate && `-${formatAmount(borrowingRate, 30, 4)}% / 1h`}
            feesType="increase"
          />
          <NetworkFeeRow executionFee={p.executionFee} />
        </ExchangeInfo.Group>

        <ExchangeInfo.Group>
          {decreaseOrdersThatWillBeExecuted?.length > 0 && (
            <div className="PositionEditor-allow-higher-slippage">
              <Checkbox isChecked={isTriggerWarningAccepted} setIsChecked={setIsTriggerWarningAccepted}>
                <span className="text-warning font-sm">
                  <Trans>I am aware of the trigger orders</Trans>
                </span>
              </Checkbox>
            </div>
          )}
        </ExchangeInfo.Group>
      </ExchangeInfo>
    );
  }

  function renderSwapSection() {
    return (
      <ExchangeInfo>
        {renderMain()}

        <ExchangeInfo.Group>
          {renderSwapSpreadWarining()}
          {isLimit && renderLimitPriceWarning()}
        </ExchangeInfo.Group>

        <ExchangeInfo.Group>
          {isLimit && renderAvailableLiquidity()}
          {swapSpreadInfo.showSpread && swapSpreadInfo.spread && (
            <ExchangeInfoRow label={t`Spread`} isWarning={swapSpreadInfo.isHigh}>
              {formatAmount(swapSpreadInfo.spread.mul(100), USD_DECIMALS, 2, true)}%
            </ExchangeInfoRow>
          )}

          {isMarket && (
            <AllowedSlippageRow
              defaultSlippage={savedAllowedSlippage}
              allowedSlippage={allowedSlippage}
              setSlippage={setAllowedSlippage}
            />
          )}
        </ExchangeInfo.Group>

        <ExchangeInfo.Group>
          {isLimit && (
            <ExchangeInfoRow label={t`Limit Price`}>
              <Tooltip
                position="bottom-end"
                handle={formatTokensRatio(fromToken, toToken, triggerRatio)}
                renderContent={() =>
                  t`Limit Order Price to guarantee Min. Receive amount is updated in real time in the Orders tab after the order has been created.`
                }
              />
            </ExchangeInfoRow>
          )}
          <ExchangeInfoRow label={t`Mark Price`}>{formatTokensRatio(fromToken, toToken, markRatio)}</ExchangeInfoRow>
          <ExchangeInfoRow label={t`${fromToken?.symbol} Price`}>
            {formatUsd(swapAmounts?.priceIn, {
              displayDecimals: fromToken?.priceDecimals,
            })}
          </ExchangeInfoRow>
          <ExchangeInfoRow label={t`${toToken?.symbol} Price`}>
            {formatUsd(swapAmounts?.priceOut, {
              displayDecimals: toToken?.priceDecimals,
            })}
          </ExchangeInfoRow>
        </ExchangeInfo.Group>

        <ExchangeInfo.Group>
          {!isWrapOrUnwrap && (
            <>
              <TradeFeesRow {...fees} feesType="swap" />
              <NetworkFeeRow executionFee={p.executionFee} />
            </>
          )}
        </ExchangeInfo.Group>

        <ExchangeInfo.Group>
          <ExchangeInfoRow label={t`Min. Receive`}>
            {isMarket && swapAmounts?.minOutputAmount
              ? formatTokenAmount(
                  applySlippageToMinOut(allowedSlippage, swapAmounts.minOutputAmount),
                  toToken?.decimals,
                  toToken?.symbol
                )
              : formatTokenAmount(swapAmounts?.minOutputAmount, toToken?.decimals, toToken?.symbol)}
          </ExchangeInfoRow>
        </ExchangeInfo.Group>
      </ExchangeInfo>
    );
  }

  function renderTriggerDecreaseSection() {
    const existingPriceDecimals = p.existingPosition?.indexToken?.priceDecimals;
    const toTokenPriceDecimals = toToken?.priceDecimals;
    return (
      <ExchangeInfo>
        {renderMain()}
        {renderDifferentCollateralWarning()}

        {existingPosition?.leverage && !decreaseAmounts?.isFullClose && (
          <ExchangeInfo.Group>
            {renderLeverage(
              existingPosition?.leverage,
              nextPositionValues?.nextLeverage,
              nextPositionValues?.nextSizeUsd?.lte(0)
            )}
            {isTrigger && (
              <ToggleSwitch isChecked={keepLeverage ?? false} setIsChecked={setKeepLeverage}>
                <span className="text-gray font-sm">
                  <Trans>Keep leverage at {formatLeverage(existingPosition.leverage)}</Trans>
                </span>
              </ToggleSwitch>
            )}
          </ExchangeInfo.Group>
        )}

        {decreaseAmounts && decreaseAmounts.triggerOrderType !== OrderType.StopLossDecrease && (
          <ExchangeInfo.Group>{renderAcceptablePriceImpactInput()}</ExchangeInfo.Group>
        )}

        <ExchangeInfo.Group>
          <ExchangeInfoRow
            label={t`Trigger Price`}
            value={
              triggerPrice
                ? `${fixedTriggerThresholdType} ${formatUsd(triggerPrice, {
                    displayDecimals: toTokenPriceDecimals,
                  })}`
                : "..."
            }
          />

          {existingPosition && (
            <ExchangeInfoRow
              label={t`Entry Price`}
              value={
                formatUsd(existingPosition?.entryPrice, {
                  displayDecimals: indexToken?.priceDecimals,
                }) || "-"
              }
            />
          )}

          <ExchangeInfoRow
            label={t`Execution Price`}
            value={
              executionPriceUsd
                ? formatUsd(executionPriceUsd, {
                    displayDecimals: indexToken?.priceDecimals,
                  })
                : "-"
            }
          />

          {decreaseAmounts && decreaseAmounts.triggerOrderType !== OrderType.StopLossDecrease && (
            <>
              <ExchangeInfoRow
                className="SwapBox-info-row"
                label={t`Acceptable Price`}
                value={
                  formatAcceptablePrice(decreaseAmounts?.acceptablePrice, {
                    displayDecimals: toTokenPriceDecimals,
                  }) || "-"
                }
              />
            </>
          )}

          <ExchangeInfoRow
            label={t`Mark Price`}
            value={
              p.markPrice
                ? formatUsd(p.markPrice, {
                    displayDecimals: toTokenPriceDecimals,
                  })
                : "..."
            }
          />

          {p.existingPosition && (
            <ExchangeInfoRow
              label={t`Liq. Price`}
              value={
                nextPositionValues?.nextSizeUsd?.gt(0) ? (
                  <ValueTransition
                    from={
                      formatUsd(existingPosition?.liquidationPrice, {
                        displayDecimals: existingPriceDecimals,
                      })!
                    }
                    to={formatUsd(nextPositionValues.nextLiqPrice, {
                      displayDecimals: existingPriceDecimals,
                    })}
                  />
                ) : (
                  "-"
                )
              }
            />
          )}
        </ExchangeInfo.Group>

        <ExchangeInfo.Group>
          <ExchangeInfoRow
            label={p.existingPosition?.sizeInUsd ? t`Size` : t`Decrease size`}
            value={
              p.existingPosition?.sizeInUsd ? (
                <ValueTransition
                  from={formatUsd(p.existingPosition.sizeInUsd)!}
                  to={formatUsd(nextPositionValues?.nextSizeUsd)}
                />
              ) : decreaseAmounts?.sizeDeltaUsd ? (
                formatUsd(decreaseAmounts.sizeDeltaUsd)
              ) : (
                "-"
              )
            }
          />

          {existingPosition && (
            <ExchangeInfoRow
              label={t`PnL`}
              value={
                <ValueTransition
                  from={
                    <>
                      {formatDeltaUsd(decreaseAmounts?.estimatedPnl)} (
                      {formatPercentage(decreaseAmounts?.estimatedPnlPercentage, { signed: true })})
                    </>
                  }
                  to={
                    <>
                      {formatDeltaUsd(nextPositionValues?.nextPnl)} (
                      {formatPercentage(nextPositionValues?.nextPnlPercentage, { signed: true })})
                    </>
                  }
                />
              }
            />
          )}

          {!p.existingPosition && <ExchangeInfoRow label={t`Collateral`} value={collateralToken?.symbol} />}

          {p.existingPosition && (
            <ExchangeInfoRow
              label={t`Collateral (${p.existingPosition?.collateralToken?.symbol})`}
              value={
                <ValueTransition
                  from={formatUsd(existingPosition?.remainingCollateralUsd)!}
                  to={formatUsd(nextPositionValues?.nextCollateralUsd)}
                />
              }
            />
          )}

          <TradeFeesRow {...fees} feesType="decrease" />
          <NetworkFeeRow executionFee={p.executionFee} />
        </ExchangeInfo.Group>

        <ExchangeInfo.Group>
          {existingPosition && decreaseAmounts?.receiveUsd && (
            <ExchangeInfoRow
              label={t`Receive`}
              value={formatTokenAmountWithUsd(
                decreaseAmounts.receiveTokenAmount,
                decreaseAmounts.receiveUsd,
                collateralToken?.symbol,
                collateralToken?.decimals
              )}
            />
          )}
        </ExchangeInfo.Group>
      </ExchangeInfo>
    );
  }

  return (
    <div className="Confirmation-box">
      <Modal isVisible={p.isVisible} setIsVisible={onClose} label={title}>
        <ExchangeInfo>
          <ExchangeInfo.Group>
            {isSwap && renderSwapSection()}
            {isIncrease && renderIncreaseOrderSection()}
            {isTrigger && renderTriggerDecreaseSection()}
          </ExchangeInfo.Group>

          <ExchangeInfo.Group>
            {renderHighPriceImpactWarning()}

            {highExecutionFeeAcknowledgement}

            {needPayTokenApproval && fromToken && (
              <ApproveTokenButton
                tokenAddress={fromToken.address}
                tokenSymbol={fromToken.assetSymbol ?? fromToken.symbol}
                spenderAddress={getContract(chainId, "SyntheticsRouter")}
              />
            )}
          </ExchangeInfo.Group>
        </ExchangeInfo>

        <div className="Confirmation-box-row" ref={submitButtonRef}>
          <Button
            variant="primary-action"
            className="w-full"
            type="submit"
            onClick={onSubmit}
            disabled={submitButtonState.disabled && !shouldDisableValidation}
          >
            {submitButtonState.text}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function renderLeverage(from: BigNumber | undefined, to: BigNumber | undefined, emptyValue = false) {
  return (
    <ExchangeInfoRow
      label={t`Leverage`}
      value={emptyValue ? "-" : <ValueTransition from={formatLeverage(from)} to={formatLeverage(to) ?? "-"} />}
    />
  );
}

function renderLimitPriceWarning() {
  return (
    <AlertInfo compact type="info">
      <Trans>Limit Order Price will vary based on Fees and Price Impact to guarantee the Min. Receive amount.</Trans>
    </AlertInfo>
  );
}
