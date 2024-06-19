import { Plural, Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import Modal from "components/Modal/Modal";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import Tooltip from "components/Tooltip/Tooltip";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { getContract } from "config/contracts";
import {
  BASIS_POINTS_DIVISOR_BIGINT,
  COLLATERAL_SPREAD_SHOW_AFTER_INITIAL_ZERO_THRESHOLD,
  HIGH_SPREAD_THRESHOLD,
} from "config/factors";
import { useSyntheticsEvents } from "context/SyntheticsEvents";
import { useUserReferralCode } from "domain/referrals/hooks";
import {
  estimateExecuteDecreaseOrderGasLimit,
  getBorrowingFactorPerPeriod,
  getExecutionFee,
  getFundingFactorPerPeriod,
} from "domain/synthetics/fees";
import {
  DecreasePositionSwapType,
  OrderType,
  PositionOrderInfo,
  createDecreaseOrderTxn,
  createIncreaseOrderTxn,
  createSwapOrderTxn,
  isTriggerDecreaseOrderType,
} from "domain/synthetics/orders";
import { cancelOrdersTxn } from "domain/synthetics/orders/cancelOrdersTxn";
import { createWrapOrUnwrapTxn } from "domain/synthetics/orders/createWrapOrUnwrapTxn";
import {
  formatAcceptablePrice,
  formatLeverage,
  formatLiquidationPrice,
  getTriggerNameByOrderType,
} from "domain/synthetics/positions";
import {
  convertToTokenAmount,
  formatTokensRatio,
  getNeedTokenApprove,
  useTokensAllowanceData,
  convertToUsd,
} from "domain/synthetics/tokens";
import {
  TriggerThresholdType,
  applySlippageToMinOut,
  applySlippageToPrice,
  getExecutionPriceForDecrease,
} from "domain/synthetics/trade";
import { getIsEquivalentTokens, getSpread } from "domain/tokens";
import { useChainId } from "lib/chains";
import { CHART_PERIODS, USD_DECIMALS } from "lib/legacy";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import { AlertInfo } from "components/AlertInfo/AlertInfo";
import { SubaccountNavigationButton } from "components/SubaccountNavigationButton/SubaccountNavigationButton";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccount, useSubaccountCancelOrdersDetailsMessage } from "context/SubaccountContext/SubaccountContext";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  useSidecarOrders,
  SidecarOrderEntryGroup,
  SidecarSlTpOrderEntryValid,
  SidecarLimitOrderEntryValid,
  SidecarLimitOrderEntry,
  SidecarSlTpOrderEntry,
} from "domain/synthetics/sidecarOrders/useSidecarOrders";
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
import { NetworkFeeRow } from "../NetworkFeeRow/NetworkFeeRow";
import { TradeFeesRow } from "../TradeFeesRow/TradeFeesRow";
import { SideOrderEntries } from "./SideOrderEntries";
import { PERCENTAGE_DECEMALS } from "domain/synthetics/sidecarOrders/utils";
import { AllowedSlippageRow } from "./rows/AllowedSlippageRow";
import { useTradeboxPoolWarnings } from "../TradeboxPoolWarnings/TradeboxPoolWarnings";

import { selectGasLimits, selectGasPrice } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { makeSelectOrdersByPositionKey } from "context/SyntheticsStateContext/selectors/orderSelectors";
import {
  selectTradeboxAvailableMarketsOptions,
  selectTradeboxCollateralToken,
  selectTradeboxDecreasePositionAmounts,
  selectTradeboxDefaultTriggerAcceptablePriceImpactBps,
  selectTradeboxExecutionFee,
  selectTradeboxFees,
  selectTradeboxFixedTriggerOrderType,
  selectTradeboxFixedTriggerThresholdType,
  selectTradeboxFromTokenAddress,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxIsWrapOrUnwrap,
  selectTradeboxKeepLeverage,
  selectTradeboxLiquidity,
  selectTradeboxMarkPrice,
  selectTradeboxMarketInfo,
  selectTradeboxNextPositionValues,
  selectTradeboxSelectedPosition,
  selectTradeboxSelectedTriggerAcceptablePriceImpactBps,
  selectTradeboxSetKeepLeverage,
  selectTradeboxSetSelectedAcceptablePriceImpactBps,
  selectTradeboxSwapAmounts,
  selectTradeboxToTokenAddress,
  selectTradeboxTradeFlags,
  selectTradeboxTradeRatios,
  selectTradeboxTriggerPrice,
  selectTradeboxSelectedPositionKey,
  selectTradeboxMaxLiquidityPath,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import "./ConfirmationBox.scss";
import { bigMath } from "lib/bigmath";

export type Props = {
  isVisible: boolean;
  error: string | undefined;
  onClose: () => void;
  onSubmitted: () => void;
  setPendingTxns: (txns: any) => void;
};

export function ConfirmationBox(p: Props) {
  const { error, onClose, onSubmitted, setPendingTxns } = p;
  const tokensData = useTokensData();

  const setSelectedTriggerAcceptablePriceImpactBps = useSelector(selectTradeboxSetSelectedAcceptablePriceImpactBps);
  const selectedTriggerAcceptablePriceImpactBps = useSelector(selectTradeboxSelectedTriggerAcceptablePriceImpactBps);
  const isWrapOrUnwrap = useSelector(selectTradeboxIsWrapOrUnwrap);
  const fromTokenAddress = useSelector(selectTradeboxFromTokenAddress);
  const toTokenAddress = useSelector(selectTradeboxToTokenAddress);
  const defaultTriggerAcceptablePriceImpactBps = useSelector(selectTradeboxDefaultTriggerAcceptablePriceImpactBps);
  const marketInfo = useSelector(selectTradeboxMarketInfo);
  const collateralToken = useSelector(selectTradeboxCollateralToken);
  const keepLeverage = useSelector(selectTradeboxKeepLeverage);
  const setKeepLeverage = useSelector(selectTradeboxSetKeepLeverage);
  const fees = useSelector(selectTradeboxFees);
  const existingPosition = useSelector(selectTradeboxSelectedPosition);
  const marketsOptions = useSelector(selectTradeboxAvailableMarketsOptions);
  const { markRatio, triggerRatio } = useSelector(selectTradeboxTradeRatios);
  const markPrice = useSelector(selectTradeboxMarkPrice);
  const swapAmounts = useSelector(selectTradeboxSwapAmounts);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const decreaseAmounts = useSelector(selectTradeboxDecreasePositionAmounts);
  const nextPositionValues = useSelector(selectTradeboxNextPositionValues);
  const executionFee = useSelector(selectTradeboxExecutionFee);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const triggerPrice = useSelector(selectTradeboxTriggerPrice);
  const gasLimits = useSelector(selectGasLimits);
  const gasPrice = useSelector(selectGasPrice);
  const fixedTriggerThresholdType = useSelector(selectTradeboxFixedTriggerThresholdType);
  const fixedTriggerOrderType = useSelector(selectTradeboxFixedTriggerOrderType);
  const { longLiquidity, shortLiquidity } = useSelector(selectTradeboxLiquidity);

  const { element: highExecutionFeeAcknowledgement, isHighFeeConsentError } = useHighExecutionFeeConsent(
    executionFee?.feeUsd
  );

  const fromToken = getByKey(tokensData, fromTokenAddress);
  const toToken = getByKey(tokensData, toTokenAddress);

  const { isLong, isShort, isPosition, isSwap, isMarket, isLimit, isTrigger, isIncrease } = tradeFlags;
  const { maxLiquidity: swapLiquidityUsd } = useSelector(selectTradeboxMaxLiquidityPath);
  const { indexToken } = marketInfo || {};

  const { signer, account } = useWallet();
  const { chainId } = useChainId();
  const { openConnectModal } = useConnectModal();
  const { setPendingPosition, setPendingOrder } = useSyntheticsEvents();
  const { savedAllowedSlippage, shouldDisableValidationForTesting } = useSettings();
  const prevIsVisible = usePrevious(p.isVisible);

  const { referralCodeForTxn } = useUserReferralCode(signer, chainId, account);

  const [isTriggerWarningAccepted, setIsTriggerWarningAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allowedSlippage, setAllowedSlippage] = useState(savedAllowedSlippage);
  const submitButtonRef = useRef<null | HTMLDivElement>(null);

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
    payAmount !== undefined &&
    getNeedTokenApprove(tokensAllowanceData, fromToken.address, payAmount);

  const positionKey = useSelector(selectTradeboxSelectedPositionKey);
  const positionOrders = useSelector(makeSelectOrdersByPositionKey(positionKey));

  const { stopLoss, takeProfit, limit } = useSidecarOrders();

  const sidecarEntries = useMemo(
    () => [...(stopLoss?.entries || []), ...(takeProfit?.entries || []), ...(limit?.entries || [])],
    [stopLoss, takeProfit, limit]
  );

  const { cancelSltpEntries, createSltpEntries, updateSltpEntries } = useMemo(() => {
    const [cancelSltpEntries, createSltpEntries, updateSltpEntries] = sidecarEntries.reduce(
      ([cancel, create, update], e) => {
        if (e.txnType === "cancel") cancel.push(e as SidecarSlTpOrderEntryValid | SidecarLimitOrderEntryValid);
        if (e.txnType === "create" && !!e.decreaseAmounts) create.push(e as SidecarSlTpOrderEntryValid);
        if (e.txnType === "update" && (!!e.decreaseAmounts || !!e.increaseAmounts))
          update.push(e as SidecarSlTpOrderEntryValid | SidecarLimitOrderEntryValid);
        return [cancel, create, update];
      },
      [[], [], []] as [
        (SidecarSlTpOrderEntryValid | SidecarLimitOrderEntryValid)[],
        SidecarSlTpOrderEntryValid[],
        (SidecarSlTpOrderEntryValid | SidecarLimitOrderEntryValid)[],
      ]
    );

    return { cancelSltpEntries, createSltpEntries, updateSltpEntries };
  }, [sidecarEntries]);

  const subaccountRequiredActions = 1 + cancelSltpEntries.length + createSltpEntries.length + updateSltpEntries.length;

  const getOrderExecutionFee = useCallback(
    (swapsCount?: number) => {
      if (!gasLimits || !tokensData || gasPrice === undefined) return;

      const estimatedGas = estimateExecuteDecreaseOrderGasLimit(gasLimits, { swapsCount });

      return getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice);
    },
    [gasLimits, tokensData, gasPrice, chainId]
  );

  const getExecutionFeeAmountForEntry = useCallback(
    (entry: SidecarSlTpOrderEntry | SidecarLimitOrderEntry) => {
      if (!entry.txnType || entry.txnType === "cancel") return undefined;
      const securedExecutionFee = entry.order?.executionFee ?? 0n;

      let swapsCount = 0;

      if (entry.decreaseAmounts) {
        swapsCount = entry.decreaseAmounts?.decreaseSwapType === DecreasePositionSwapType.NoSwap ? 0 : 1;
      }
      if (entry.increaseAmounts) {
        swapsCount = entry.increaseAmounts?.swapPathStats?.swapPath.length ?? 0;
      }

      const executionFee = getOrderExecutionFee(swapsCount);

      if (!executionFee || securedExecutionFee >= executionFee.feeTokenAmount) return undefined;

      return executionFee.feeTokenAmount - securedExecutionFee;
    },
    [getOrderExecutionFee]
  );

  const existingTriggerOrders = useMemo(
    () => positionOrders.filter((order) => isTriggerDecreaseOrderType(order.orderType)),
    [positionOrders]
  );

  const decreaseOrdersThatWillBeExecuted = useMemo(() => {
    if (!existingPosition || markPrice === undefined) {
      return [];
    }

    return existingTriggerOrders.filter((order) => {
      return order.triggerThresholdType === TriggerThresholdType.Above
        ? markPrice > order.triggerPrice
        : markPrice < order.triggerPrice;
    });
  }, [existingPosition, existingTriggerOrders, markPrice]);

  const swapSpreadInfo = useMemo(() => {
    let spread = BigInt(0);

    if (isSwap && fromToken && toToken) {
      const fromSpread = getSpread(fromToken.prices);
      const toSpread = getSpread(toToken.prices);

      spread = fromSpread + toSpread;
    } else if (isIncrease && fromToken && indexToken) {
      const fromSpread = getSpread(fromToken.prices);
      const toSpread = getSpread(indexToken.prices);

      spread = fromSpread + toSpread;

      if (isLong) {
        spread = fromSpread;
      }
    }

    const isHigh = spread > HIGH_SPREAD_THRESHOLD;

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
        isHigh: totalSpread > HIGH_SPREAD_THRESHOLD,
      };
    }

    totalSpread = totalSpread + getSpread(collateralToken!.prices!);

    return {
      spread: totalSpread,
      isHigh: totalSpread > HIGH_SPREAD_THRESHOLD,
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
        text: t`High Network Fee not yet acknowledged`,
        disabled: true,
      };
    }

    if (stopLoss.error?.percentage || takeProfit.error?.percentage) {
      return {
        text: t`TP/SL orders exceed the position`,
        disabled: true,
      };
    }

    if (isLimit) {
      if (isLong) {
        if (markPrice !== undefined && triggerPrice !== undefined && triggerPrice > markPrice) {
          return {
            text: t`Limit price above Mark Price`,
            disabled: true,
          };
        }
      } else {
        if (markPrice !== undefined && triggerPrice !== undefined && triggerPrice < markPrice) {
          return {
            text: t`Limit price below Mark Price`,
            disabled: true,
          };
        }
      }
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

    if (isIncrease && sidecarEntries.length > 0) {
      const isError = sidecarEntries.some((e) => {
        if (e.txnType === "cancel") return false;

        return e.sizeUsd?.error || e.percentage?.error || e.price?.error;
      });

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
    sidecarEntries,
    stopLoss,
    takeProfit,
    markPrice,
    triggerPrice,
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
    [p.isVisible, submitButtonState.disabled, onSubmit]
  );

  const summaryExecutionFee = useMemo(() => {
    if (!executionFee) return undefined;

    const { feeUsd, feeTokenAmount, feeToken, warning } = executionFee;

    const feeTokenData = getByKey(tokensData, feeToken?.address);

    let summaryFeeUsd = feeUsd ?? 0n;
    let summaryFeeTokenAmount = feeTokenAmount ?? 0n;

    sidecarEntries.forEach((entry) => {
      const entryFee = getExecutionFeeAmountForEntry(entry) ?? 0n;

      summaryFeeTokenAmount = summaryFeeTokenAmount + entryFee;
      summaryFeeUsd =
        summaryFeeUsd + (convertToUsd(entryFee, feeToken?.decimals, feeTokenData?.prices?.minPrice) ?? 0n);
    });

    return {
      feeUsd: summaryFeeUsd,
      feeTokenAmount: summaryFeeTokenAmount,
      feeToken,
      warning,
    };
  }, [executionFee, sidecarEntries, getExecutionFeeAmountForEntry, tokensData]);

  const isAdditionOrdersMsg =
    summaryExecutionFee && executionFee && summaryExecutionFee.feeTokenAmount > executionFee.feeTokenAmount;

  const subaccount = useSubaccount(summaryExecutionFee?.feeTokenAmount ?? null, subaccountRequiredActions);
  const cancelOrdersDetailsMessage = useSubaccountCancelOrdersDetailsMessage(summaryExecutionFee?.feeTokenAmount, 1);

  function onCancelOrderClick(key: string): void {
    if (!signer) return;
    cancelOrdersTxn(chainId, signer, subaccount, {
      orderKeys: [key],
      setPendingTxns: p.setPendingTxns,
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
      increaseAmounts?.acceptablePrice === undefined ||
      !executionFee ||
      !marketInfo ||
      !signer ||
      typeof allowedSlippage !== "number"
    ) {
      helperToast.error(t`Error submitting order`);
      return Promise.resolve();
    }

    const commonSecondaryOrderParams = {
      account,
      marketAddress: marketInfo.marketTokenAddress,
      swapPath: [],
      allowedSlippage,
      initialCollateralAddress: collateralToken.address,
      receiveTokenAddress: collateralToken.address,
      isLong,
      indexToken: marketInfo.indexToken,
    };

    return createIncreaseOrderTxn({
      chainId,
      signer,
      subaccount,
      createIncreaseOrderParams: {
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
        skipSimulation: isLimit || shouldDisableValidationForTesting,
        setPendingTxns: p.setPendingTxns,
        setPendingOrder,
        setPendingPosition,
      },
      createDecreaseOrderParams: createSltpEntries.map((entry) => {
        return {
          ...commonSecondaryOrderParams,
          initialCollateralDeltaAmount: entry.decreaseAmounts.collateralDeltaAmount ?? 0n,
          sizeDeltaUsd: entry.decreaseAmounts.sizeDeltaUsd,
          sizeDeltaInTokens: entry.decreaseAmounts.sizeDeltaInTokens,
          acceptablePrice: entry.decreaseAmounts.acceptablePrice,
          triggerPrice: entry.decreaseAmounts.triggerPrice,
          minOutputUsd: 0n,
          decreasePositionSwapType: entry.decreaseAmounts.decreaseSwapType,
          orderType: entry.decreaseAmounts.triggerOrderType!,
          referralCode: referralCodeForTxn,
          executionFee: getExecutionFeeAmountForEntry(entry) ?? 0n,
          tokensData,
          txnType: entry.txnType!,
          skipSimulation: isLimit || shouldDisableValidationForTesting,
        };
      }),
      cancelOrderParams: cancelSltpEntries.map((entry) => ({
        ...commonSecondaryOrderParams,
        orderKey: entry.order!.key,
        orderType: entry.order!.orderType,
        minOutputAmount: 0n,
        sizeDeltaUsd: entry.order!.sizeDeltaUsd,
        txnType: entry.txnType!,
        initialCollateralDeltaAmount: entry.order?.initialCollateralDeltaAmount ?? 0n,
      })),
      updateOrderParams: updateSltpEntries.map((entry) => ({
        ...commonSecondaryOrderParams,
        orderKey: entry.order!.key,
        orderType: entry.order!.orderType,
        sizeDeltaUsd: (entry.increaseAmounts?.sizeDeltaUsd || entry.decreaseAmounts?.sizeDeltaUsd)!,
        acceptablePrice: (entry.increaseAmounts?.acceptablePrice || entry.decreaseAmounts?.acceptablePrice)!,
        triggerPrice: (entry.increaseAmounts?.triggerPrice || entry.decreaseAmounts?.triggerPrice)!,
        executionFee: getExecutionFeeAmountForEntry(entry) ?? 0n,
        minOutputAmount: 0n,
        txnType: entry.txnType!,
        initialCollateralDeltaAmount: entry.order?.initialCollateralDeltaAmount ?? 0n,
      })),
    });
  }

  function onSubmitDecreaseOrder() {
    if (
      !account ||
      !marketInfo ||
      !collateralToken ||
      fixedTriggerOrderType === undefined ||
      fixedTriggerThresholdType === undefined ||
      decreaseAmounts?.acceptablePrice === undefined ||
      decreaseAmounts?.triggerPrice === undefined ||
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
        minOutputUsd: BigInt(0),
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

    if (subaccount) {
      onSubmitted();
      setIsSubmitting(false);

      return;
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
        limit?.reset();
      }
    },
    [p.isVisible, prevIsVisible, takeProfit, stopLoss, limit]
  );

  function renderSubaccountNavigationButton() {
    return (
      <SubaccountNavigationButton
        executionFee={executionFee?.feeTokenAmount}
        closeConfirmationBox={onClose}
        isNativeToken={fromToken?.isNative}
        isWrapOrUnwrap={isWrapOrUnwrap}
        tradeFlags={tradeFlags}
        requiredActions={subaccountRequiredActions}
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
            You have selected {collateralTokenSymbol} as collateral; the liquidation price is higher compared to using a
            stablecoin as collateral since the worth of the collateral will change with its price. If required and
            available, you can change the collateral type using the "Collateral In" option in the trade box.
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
    if (fees?.positionPriceImpact?.deltaUsd === undefined) return null;
    if (!decreaseAmounts) return null;
    if (triggerPrice === undefined) return null;

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

  function renderAvailableLiquidity() {
    const riskThresholdBps = 5000n;
    let availableLiquidityUsd: bigint | undefined = undefined;
    let availableLiquidityAmount: bigint | undefined = undefined;
    let isLiquidityRisk = false;

    let tooltipContent = "";

    if (isSwap && swapAmounts) {
      availableLiquidityUsd = swapLiquidityUsd;

      availableLiquidityAmount = convertToTokenAmount(
        availableLiquidityUsd,
        toToken?.decimals,
        toToken?.prices.maxPrice
      );

      isLiquidityRisk =
        bigMath.mulDiv(availableLiquidityUsd, riskThresholdBps, BASIS_POINTS_DIVISOR_BIGINT) < swapAmounts.usdOut;

      tooltipContent = isLiquidityRisk
        ? t`There may not be sufficient liquidity to execute your order when the Min. Receive are met.`
        : t`The order will only execute if the Min. Receive is met and there is sufficient liquidity.`;
    }

    if (isIncrease && increaseAmounts) {
      availableLiquidityUsd = isLong ? longLiquidity : shortLiquidity;

      isLiquidityRisk =
        bigMath.mulDiv(availableLiquidityUsd!, riskThresholdBps, BASIS_POINTS_DIVISOR_BIGINT) <
        increaseAmounts.sizeDeltaUsd;

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

  function renderSwapSpreadWarning() {
    if (!isMarket) {
      return null;
    }

    if (swapSpreadInfo.spread !== undefined && swapSpreadInfo.isHigh) {
      return (
        <div className="mb-10">
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

  function renderSideOrders(type: "stopLoss" | "takeProfit" | "limit") {
    const isStopLoss = type === "stopLoss";
    const isLimitGroup = type === "limit";

    const entriesInfo: SidecarOrderEntryGroup = {
      stopLoss: stopLoss,
      takeProfit: takeProfit,
      limit: limit,
    }[type];

    if (!entriesInfo || entriesInfo.entries.every((e) => e.txnType === "cancel")) return;

    const label = {
      stopLoss: t`Stop-Loss`,
      takeProfit: t`Take-Profit`,
      limit: t`Limit`,
    }[type];

    const labelPnl = isStopLoss ? t`Stop-Loss PnL` : t`Take-Profit PnL`;

    return (
      <div>
        <ExchangeInfoRow
          className="swap-box-info-row"
          label={label}
          value={
            <div className="profit-loss-wrapper">
              <SideOrderEntries entriesInfo={entriesInfo} displayMode={type === "limit" ? "sizeUsd" : "percentage"} />
            </div>
          }
        />
        {(!isLimitGroup && entriesInfo.totalPnL !== undefined && entriesInfo.totalPnLPercentage !== undefined && (
          <ExchangeInfoRow className="swap-box-info-row" label={labelPnl}>
            {entriesInfo.totalPnL === 0n ? (
              "-"
            ) : (
              <Tooltip
                handle={`${formatUsd(entriesInfo.totalPnL)} (${formatPercentage(entriesInfo?.totalPnLPercentage, {
                  signed: true,
                })})`}
                position="bottom-end"
                handleClassName={
                  entriesInfo.totalPnL !== undefined && entriesInfo.totalPnL < 0 ? "text-red-500" : "text-green-500"
                }
                className="SLTP-pnl-tooltip"
                renderContent={() =>
                  entriesInfo?.entries?.map((entry, index) => {
                    if (!entry || !entry.decreaseAmounts || entry.txnType === "cancel") return;

                    const price = entry.price?.value && formatAmount(entry.price.value, USD_DECIMALS, 2);
                    const percentage =
                      entry.percentage?.value && formatAmount(entry.percentage.value, PERCENTAGE_DECEMALS, 0);

                    return (
                      <div className="mb-5 flex justify-between" key={index}>
                        {(price && percentage && (
                          <span className="mr-15">
                            At ${price}, {isStopLoss ? "SL" : "TP"} {percentage}%:
                          </span>
                        )) ||
                          null}

                        <span
                          className={
                            entry.decreaseAmounts?.realizedPnl && entry.decreaseAmounts?.realizedPnl < 0
                              ? "text-red-500"
                              : "text-green-500"
                          }
                        >
                          {formatUsd(entry.decreaseAmounts?.realizedPnl)} (
                          {formatPercentage(entry.decreaseAmounts?.realizedPnlPercentage, {
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
        )) ||
          null}
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

  const [initialCollateralSpread, setInitialCollateralSpread] = useState<bigint | undefined>();

  const collateralSpreadPercent =
    collateralSpreadInfo && collateralSpreadInfo.spread !== undefined
      ? bigMath.mulDiv(collateralSpreadInfo.spread, BASIS_POINTS_DIVISOR_BIGINT, expandDecimals(1, USD_DECIMALS))
      : undefined;

  useEffect(() => {
    if (collateralSpreadPercent !== undefined && initialCollateralSpread === undefined) {
      setInitialCollateralSpread(collateralSpreadPercent);
    }
  }, [collateralSpreadPercent, initialCollateralSpread]);

  const tradeboxPoolWarnings = useTradeboxPoolWarnings(false, "text-gray-300");

  function renderIncreaseOrderSection() {
    if (!marketInfo || !fromToken || !collateralToken || !toToken) {
      return null;
    }

    const borrowingRate = getBorrowingFactorPerPeriod(marketInfo, isLong, CHART_PERIODS["1h"]) * 100n;
    const fundigRate = getFundingFactorPerPeriod(marketInfo, isLong, CHART_PERIODS["1h"]) * 100n;
    const isCollateralSwap = !getIsEquivalentTokens(fromToken, collateralToken);
    const existingPriceDecimals = existingPosition?.indexToken?.priceDecimals;
    const toTokenPriceDecimals = toToken?.priceDecimals;

    const shouldApplySlippage = isMarket;
    const acceptablePrice =
      shouldApplySlippage && increaseAmounts?.acceptablePrice
        ? applySlippageToPrice(allowedSlippage, increaseAmounts.acceptablePrice, true, isLong)
        : increaseAmounts?.acceptablePrice;

    const isNearZeroFromStart =
      initialCollateralSpread === 0n &&
      (collateralSpreadPercent ?? 0) < COLLATERAL_SPREAD_SHOW_AFTER_INITIAL_ZERO_THRESHOLD;

    const showCollateralSpread = isMarket && !isNearZeroFromStart;

    return (
      <ExchangeInfo>
        <ExchangeInfo.Group>{renderMain()}</ExchangeInfo.Group>

        <ExchangeInfo.Group>
          {tradeboxPoolWarnings}
          {renderCollateralSpreadWarning()}
          {renderExistingTriggerErrors()}
          {renderDifferentTokensWarning()}
        </ExchangeInfo.Group>

        <ExchangeInfo.Group>{renderSideOrders("limit")}</ExchangeInfo.Group>

        <ExchangeInfo.Group>{renderSideOrders("takeProfit")}</ExchangeInfo.Group>

        <ExchangeInfo.Group>{renderSideOrders("stopLoss")}</ExchangeInfo.Group>

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
                from={formatUsd(existingPosition?.entryPrice, {
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
                  existingPosition
                    ? formatLiquidationPrice(existingPosition?.liquidationPrice, {
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
          {existingPosition && (existingPosition.sizeInUsd ?? 0) > 0 && (
            <ExchangeInfoRow
              label={t`Size`}
              value={
                <ValueTransition
                  from={formatUsd(existingPosition.sizeInUsd)!}
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
                          fees?.payTotalFees?.deltaUsd && fees.payTotalFees.deltaUsd !== 0n
                            ? formatDeltaUsd(fees.payTotalFees.deltaUsd)
                            : "0.00$"
                        }
                        showDollar={false}
                        textClassName={getPositiveOrNegativeClass(fees?.payTotalFees?.deltaUsd)}
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
              (fundigRate !== undefined &&
                `${getPlusOrMinusSymbol(fundigRate)}${formatAmount(bigMath.abs(fundigRate), 30, 4)}% / 1h`) ||
              undefined
            }
            borrowFeeRateStr={
              (borrowingRate !== undefined && `-${formatAmount(borrowingRate, 30, 4)}% / 1h`) || undefined
            }
            feesType="increase"
          />
          <NetworkFeeRow executionFee={summaryExecutionFee} isAdditionOrdersMsg={isAdditionOrdersMsg} />
        </ExchangeInfo.Group>

        <ExchangeInfo.Group>
          {decreaseOrdersThatWillBeExecuted?.length > 0 && (
            <div className="PositionEditor-allow-higher-slippage">
              <Checkbox isChecked={isTriggerWarningAccepted} setIsChecked={setIsTriggerWarningAccepted}>
                <span className="text-14 text-yellow-500">
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
          {renderSwapSpreadWarning()}
          {isLimit && renderLimitPriceWarning()}
        </ExchangeInfo.Group>

        <ExchangeInfo.Group>
          {isLimit && renderAvailableLiquidity()}
          {(swapSpreadInfo.showSpread && swapSpreadInfo.spread !== undefined && (
            <ExchangeInfoRow label={t`Spread`} isWarning={swapSpreadInfo.isHigh}>
              {formatAmount(swapSpreadInfo.spread * 100n, USD_DECIMALS, 2, true)}%
            </ExchangeInfoRow>
          )) ||
            null}

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
              <NetworkFeeRow executionFee={executionFee} />
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
    const existingPriceDecimals = existingPosition?.indexToken?.priceDecimals;
    const toTokenPriceDecimals = toToken?.priceDecimals;
    return (
      <ExchangeInfo>
        {renderMain()}
        {renderDifferentCollateralWarning()}

        {(existingPosition?.leverage && !decreaseAmounts?.isFullClose && (
          <ExchangeInfo.Group>
            {renderLeverage(
              existingPosition?.leverage,
              nextPositionValues?.nextLeverage,
              nextPositionValues?.nextSizeUsd !== undefined ? nextPositionValues.nextSizeUsd <= 0 : undefined
            )}
            {isTrigger && (
              <ToggleSwitch isChecked={keepLeverage ?? false} setIsChecked={setKeepLeverage}>
                <span className="text-14 text-gray-300">
                  <Trans>Keep leverage at {formatLeverage(existingPosition.leverage)}</Trans>
                </span>
              </ToggleSwitch>
            )}
          </ExchangeInfo.Group>
        )) ||
          null}

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
              markPrice
                ? formatUsd(markPrice, {
                    displayDecimals: toTokenPriceDecimals,
                  })
                : "..."
            }
          />

          {existingPosition && (
            <ExchangeInfoRow
              label={t`Liq. Price`}
              value={
                nextPositionValues?.nextSizeUsd && nextPositionValues.nextSizeUsd > 0 ? (
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
            label={existingPosition?.sizeInUsd ? t`Size` : t`Decrease size`}
            value={
              existingPosition?.sizeInUsd ? (
                <ValueTransition
                  from={formatUsd(existingPosition.sizeInUsd)!}
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

          {!existingPosition && <ExchangeInfoRow label={t`Collateral`} value={collateralToken?.symbol} />}

          {existingPosition && (
            <ExchangeInfoRow
              label={t`Collateral (${existingPosition?.collateralToken?.symbol})`}
              value={
                <ValueTransition
                  from={formatUsd(existingPosition?.remainingCollateralUsd)!}
                  to={formatUsd(nextPositionValues?.nextCollateralUsd)}
                />
              }
            />
          )}

          <TradeFeesRow {...fees} feesType="decrease" />
          <NetworkFeeRow executionFee={executionFee} />
        </ExchangeInfo.Group>

        <ExchangeInfo.Group>
          {(existingPosition && decreaseAmounts?.receiveUsd !== undefined && (
            <ExchangeInfoRow
              label={t`Receive`}
              value={formatTokenAmountWithUsd(
                decreaseAmounts.receiveTokenAmount,
                decreaseAmounts.receiveUsd,
                collateralToken?.symbol,
                collateralToken?.decimals
              )}
            />
          )) ||
            null}
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

            {(needPayTokenApproval && fromToken && (
              <ApproveTokenButton
                tokenAddress={fromToken.address}
                tokenSymbol={fromToken.assetSymbol ?? fromToken.symbol}
                spenderAddress={getContract(chainId, "SyntheticsRouter")}
              />
            )) ||
              null}
          </ExchangeInfo.Group>
        </ExchangeInfo>

        <div className="Confirmation-box-row" ref={submitButtonRef}>
          <Button
            variant="primary-action"
            className="w-full"
            type="submit"
            onClick={onSubmit}
            disabled={submitButtonState.disabled && !shouldDisableValidationForTesting}
          >
            {submitButtonState.text}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function renderLeverage(from: bigint | undefined, to: bigint | undefined, emptyValue = false) {
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
