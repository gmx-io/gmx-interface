import { Plural, Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ApproveTokenButton } from "components/ApproveTokenButton/ApproveTokenButton";
import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import Modal from "components/Modal/Modal";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { getContract } from "config/contracts";
import {
  BASIS_POINTS_DIVISOR,
  DEFAULT_SLIPPAGE_AMOUNT,
  EXCESSIVE_SLIPPAGE_AMOUNT,
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
import { MarketInfo } from "domain/synthetics/markets";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import {
  DecreasePositionSwapType,
  OrderType,
  OrdersInfoData,
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
  TokenData,
  TokensData,
  TokensRatio,
  convertToTokenAmount,
  formatTokensRatio,
  getNeedTokenApprove,
  useTokensAllowanceData,
} from "domain/synthetics/tokens";
import {
  DecreasePositionAmounts,
  IncreasePositionAmounts,
  NextPositionValues,
  SwapAmounts,
  TradeFees,
  TriggerThresholdType,
  applySlippageToMinOut,
  applySlippageToPrice,
  getExecutionPriceForDecrease,
} from "domain/synthetics/trade";
import { TradeFlags } from "domain/synthetics/trade/useTradeFlags";
import { getIsEquivalentTokens, getSpread } from "domain/tokens";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { CHART_PERIODS, USD_DECIMALS } from "lib/legacy";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import PercentageInput from "components/PercentageInput/PercentageInput";
import { SubaccountNavigationButton } from "components/SubaccountNavigationButton/SubaccountNavigationButton";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  useIsLastSubaccountAction,
  useSubaccount,
  useSubaccountCancelOrdersDetailsMessage,
} from "context/SubaccountContext/SubaccountContext";
import { AvailableMarketsOptions } from "domain/synthetics/trade/useAvailableMarketsOptions";
import { usePriceImpactWarningState } from "domain/synthetics/trade/usePriceImpactWarningState";
import { helperToast } from "lib/helperToast";
import {
  bigNumberify,
  formatAmount,
  formatDeltaUsd,
  formatPercentage,
  formatTokenAmount,
  formatTokenAmountWithUsd,
  formatUsd,
  expandDecimals,
} from "lib/numbers";
import { usePrevious } from "lib/usePrevious";
import { getPlusOrMinusSymbol, getPositiveOrNegativeClass } from "lib/utils";
import useWallet from "lib/wallets/useWallet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useKey, useLatest } from "react-use";
import { AcceptablePriceImpactInputRow } from "../AcceptablePriceImpactInputRow/AcceptablePriceImpactInputRow";
import { HighPriceImpactWarning } from "../HighPriceImpactWarning/HighPriceImpactWarning";
import { TradeFeesRow } from "../TradeFeesRow/TradeFeesRow";
import "./ConfirmationBox.scss";
import { FaArrowRight } from "react-icons/fa";
import { IoClose } from "react-icons/io5";
import SLTPEntries from "./SLTPEntries";
import useSLTPEntries from "domain/synthetics/orders/useSLTPEntries";
import AlertWithIcon from "components/Alert/AlertWithIcon";

export type Props = {
  isVisible: boolean;
  tradeFlags: TradeFlags;
  isWrapOrUnwrap: boolean;
  fromToken?: TokenData;
  toToken?: TokenData;
  markPrice?: BigNumber;
  markRatio?: TokensRatio;
  triggerPrice?: BigNumber;
  fixedTriggerThresholdType?: TriggerThresholdType;
  fixedTriggerOrderType?: OrderType.LimitDecrease | OrderType.StopLossDecrease;
  selectedTriggerAcceptablePriceImpactBps?: BigNumber;
  defaultTriggerAcceptablePriceImpactBps?: BigNumber;
  triggerRatio?: TokensRatio;
  marketInfo?: MarketInfo;
  collateralToken?: TokenData;
  swapAmounts?: SwapAmounts;
  marketsOptions?: AvailableMarketsOptions;
  increaseAmounts?: IncreasePositionAmounts;
  decreaseAmounts?: DecreasePositionAmounts;
  nextPositionValues?: NextPositionValues;
  keepLeverage?: boolean;
  swapLiquidityUsd?: BigNumber;
  longLiquidityUsd?: BigNumber;
  shortLiquidityUsd?: BigNumber;
  fees?: TradeFees;
  executionFee?: ExecutionFee;
  error?: string;
  existingPosition?: PositionInfo;
  shouldDisableValidation: boolean;
  isHigherSlippageAllowed?: boolean;
  ordersData?: OrdersInfoData;
  tokensData?: TokensData;
  setSelectedTriggerAcceptablePriceImapctBps: (value: BigNumber) => void;
  setIsHigherSlippageAllowed: (isHigherSlippageAllowed: boolean) => void;
  setKeepLeverage: (keepLeverage: boolean) => void;
  onClose: () => void;
  onSubmitted: () => void;
  setPendingTxns: (txns: any) => void;
};

export function ConfirmationBox(p: Props) {
  const {
    tradeFlags,
    isWrapOrUnwrap,
    fromToken,
    toToken,
    markPrice,
    markRatio,
    triggerPrice,
    fixedTriggerThresholdType,
    fixedTriggerOrderType,
    defaultTriggerAcceptablePriceImpactBps,
    triggerRatio,
    marketInfo,
    collateralToken,
    swapAmounts,
    increaseAmounts,
    decreaseAmounts,
    nextPositionValues,
    swapLiquidityUsd,
    longLiquidityUsd,
    shortLiquidityUsd,
    keepLeverage,
    fees,
    executionFee,
    error,
    existingPosition,
    shouldDisableValidation,
    marketsOptions,
    ordersData,
    tokensData,
    setSelectedTriggerAcceptablePriceImapctBps,
    setKeepLeverage,
    onClose,
    onSubmitted,
    setPendingTxns,
  } = p;

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
    keepLeverage,
    nextPositionValues,
    triggerPrice,
  });

  const sltpAmounts = (stopLoss?.amounts || []).concat(takeProfit?.amounts || []);
  const sltpEntries = (stopLoss?.entriesInfo.entries || []).concat(takeProfit?.entriesInfo?.entries || []);

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
    tradeFlags,
    place: "confirmationBox",
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
        text: "Price Impact not yet acknowledged",
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
    isLimit,
    priceImpactWarningState.validationError,
    isSubmitting,
    error,
    needPayTokenApproval,
    isIncrease,
    decreaseOrdersThatWillBeExecuted.length,
    isTriggerWarningAccepted,
    isMarket,
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

    const commonOrderProps = {
      account,
      marketAddress: marketInfo.marketTokenAddress,
      initialCollateralAddress: collateralToken.address,
      isLong,
      allowedSlippage,
      referralCode: referralCodeForTxn,
      indexToken: marketInfo.indexToken,
      tokensData,
    };

    return createIncreaseOrderTxn(
      chainId,
      signer,
      subaccount,
      {
        ...commonOrderProps,
        initialCollateralAmount: increaseAmounts.initialCollateralAmount,
        targetCollateralAddress: collateralToken.address,
        collateralDeltaAmount: increaseAmounts.collateralDeltaAmount,
        swapPath: increaseAmounts.swapPathStats?.swapPath || [],
        sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
        sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens,
        triggerPrice: isLimit ? triggerPrice : undefined,
        acceptablePrice: increaseAmounts.acceptablePrice,
        executionFee: executionFee.feeTokenAmount,
        orderType: isLimit ? OrderType.LimitIncrease : OrderType.MarketIncrease,
        skipSimulation: isLimit || shouldDisableValidation,
        setPendingTxns: p.setPendingTxns,
        setPendingOrder,
        setPendingPosition,
      },
      sltpAmounts
        .map((entry) => {
          return {
            ...commonOrderProps,
            swapPath: [],
            initialCollateralDeltaAmount: entry.collateralDeltaAmount || BigNumber.from(0),
            receiveTokenAddress: collateralToken.address,
            triggerPrice: entry.triggerPrice,
            acceptablePrice: entry.acceptablePrice,
            sizeDeltaUsd: entry.sizeDeltaUsd,
            executionFee: getDecreaseExecutionFee(entry)?.feeTokenAmount || BigNumber.from(0),
            sizeDeltaInTokens: entry.sizeDeltaInTokens,
            minOutputUsd: BigNumber.from(0),
            decreasePositionSwapType: entry.decreaseSwapType,
            orderType: entry.triggerOrderType!,
            skipSimulation: isLimit || shouldDisableValidation,
          };
        })
        .filter(Boolean)
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
        stopLoss?.entriesInfo.reset();
        takeProfit?.entriesInfo.reset();
      }
    },
    [p.isVisible, prevIsVisible, takeProfit?.entriesInfo, stopLoss?.entriesInfo]
  );

  function renderSubaccountNavigationButton() {
    return (
      <SubaccountNavigationButton
        executionFee={p.executionFee?.feeTokenAmount}
        closeConfirmationBox={onClose}
        isNativeToken={Boolean(fromToken?.isNative)}
        tradeFlags={tradeFlags}
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
        <AlertWithIcon type="warning">
          <Trans>
            You have selected {collateralTokenSymbol} as Collateral, the Liquidation Price will vary based on the price
            of {collateralTokenSymbol}.
          </Trans>
        </AlertWithIcon>
      );
    }

    if (isLong && isCollateralTokenNonStable && collateralTokenSymbol === indexTokenSymbol) {
      return (
        <AlertWithIcon type="warning">
          <Trans>
            You have selected {collateralTokenSymbol} as collateral, the Liquidation Price is higher compared to using a
            stablecoin as collateral since the worth of the collateral will change with its price. If required, you can
            change the collateral type using the Collateral In option in the trade box.
          </Trans>
        </AlertWithIcon>
      );
    }

    if (isShort && isCollateralTokenNonStable && collateralTokenSymbol === indexTokenSymbol) {
      return (
        <AlertWithIcon type="warning">
          <Trans>
            You have selected {collateralTokenSymbol} as collateral to short ${indexTokenSymbol}.
          </Trans>
        </AlertWithIcon>
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
        <AlertWithIcon type="warning">
          <Trans>
            You have an existing position with {marketsOptions?.collateralWithPosition?.symbol} as collateral. This
            action will not apply for that position.
          </Trans>
        </AlertWithIcon>
      );
    }

    return (
      <AlertWithIcon type="warning">
        <Trans>
          You have an existing position with {marketsOptions?.collateralWithPosition?.symbol} as collateral. This Order
          will not be valid for that Position.
        </Trans>
      </AlertWithIcon>
    );
  }

  function renderExistingLimitOrdersWarning() {
    if (!existingLimitOrders?.length || !toToken) {
      return;
    }
    return (
      <div className="Existing-limit-order">
        <AlertWithIcon type="warning">
          <Plural
            value={existingLimitOrders.length}
            one="You have an active Limit Order to Increase"
            other="You have multiple active Limit Orders to Increase"
          />
        </AlertWithIcon>
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
        <AlertWithIcon type="warning">
          <Plural
            value={existingTriggerOrderLength}
            one="You have an active trigger order that might execute immediately after you open this position. Please cancel the order or accept the confirmation to continue."
            other="You have # active trigger orders that might execute immediately after you open this position. Please cancel the orders or accept the confirmation to continue."
          />
        </AlertWithIcon>
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
      <AlertWithIcon type="info">
        <Plural
          value={existingTriggerOrderLength}
          one="You have an active trigger order that could impact this position."
          other="You have # active trigger orders that could impact this position."
        />
      </AlertWithIcon>
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
      <ExchangeInfoRow isTop label={t`Available Liquidity`}>
        <Tooltip
          position="right-bottom"
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
          <AlertWithIcon type="warning">
            <Trans>The spread is {`>`} 1%, please ensure the trade details are acceptable before comfirming</Trans>
          </AlertWithIcon>
        </div>
      );
    }
  }

  function renderLimitPriceWarning() {
    return (
      <AlertWithIcon type="info">
        <Trans>Limit Order Price will vary based on Fees and Price Impact to guarantee the Min. Receive amount.</Trans>
      </AlertWithIcon>
    );
  }

  const renderCollateralSpreadWarning = useCallback(() => {
    if (collateralSpreadInfo && collateralSpreadInfo.isHigh) {
      return (
        <AlertWithIcon type="warning">
          <Trans>
            Transacting with a depegged stable coin is subject to spreads reflecting the worse of current market price
            or $1.00, with transactions involving multiple stablecoins may have multiple spreads.
          </Trans>
        </AlertWithIcon>
      );
    }
  }, [collateralSpreadInfo]);

  function renderAllowedSlippage(defaultSlippage, setSlippage) {
    return (
      <ExchangeInfoRow
        label={
          <TooltipWithPortal
            handle={t`Allowed Slippage`}
            position="left-top"
            renderContent={() => {
              return (
                <div className="text-white">
                  <Trans>
                    You can edit the default Allowed Slippage in the settings menu on the top right of the page.
                    <br />
                    <br />
                    Note that a low allowed slippage, e.g. less than{" "}
                    {formatPercentage(bigNumberify(DEFAULT_SLIPPAGE_AMOUNT), { signed: false })}, may result in failed
                    orders if prices are volatile.
                  </Trans>
                </div>
              );
            }}
          />
        }
      >
        <PercentageInput
          onChange={setSlippage}
          defaultValue={defaultSlippage}
          highValue={EXCESSIVE_SLIPPAGE_AMOUNT}
          highValueWarningText={t`Slippage is too high`}
        />
      </ExchangeInfoRow>
    );
  }

  function renderStopLoss() {
    if (existingPosition || !stopLoss) return;
    return (
      <div>
        <ExchangeInfoRow
          className="swap-box-info-row"
          label={t`Stop-Loss`}
          isTop={true}
          value={
            <div className="profit-loss-wrapper">
              <SLTPEntries
                entriesInfo={stopLoss.entriesInfo}
                increaseAmounts={increaseAmounts}
                marketInfo={marketInfo}
              />
            </div>
          }
        />
        <ExchangeInfoRow className="swap-box-info-row" label={t`Stop-Loss PnL`}>
          {stopLoss?.totalPnl?.isZero() ? (
            "-"
          ) : (
            <Tooltip
              handle={`${formatUsd(stopLoss?.totalPnl)} (${formatPercentage(stopLoss?.totalPnlPercentage, {
                signed: true,
              })})`}
              position="right-bottom"
              handleClassName={stopLoss.totalPnl?.isNegative() ? "text-red" : "text-green"}
              className="SLTP-pnl-tooltip"
              renderContent={() =>
                stopLoss.amounts?.map((stopLossAmount, index) => {
                  const stopLossEntry = stopLoss?.entriesInfo?.entries[index];
                  return (
                    <div className="space-between mb-xs" key={index}>
                      <span className="mr-md">
                        At ${stopLossEntry.price}, SL {stopLossEntry?.percentage}%:
                      </span>
                      <span className={stopLossAmount.realizedPnl.isNegative() ? "text-red" : "text-green"}>
                        {formatUsd(stopLossAmount.realizedPnl)} (
                        {formatPercentage(stopLossAmount.realizedPnlPercentage, {
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

  function renderTakeProfit() {
    if (existingPosition || !takeProfit) return;
    return (
      <div>
        <ExchangeInfoRow
          className="swap-box-info-row"
          label={t`Take-Profit`}
          isTop={true}
          value={
            <div className="profit-loss-wrapper">
              <SLTPEntries
                entriesInfo={takeProfit?.entriesInfo}
                increaseAmounts={increaseAmounts}
                marketInfo={marketInfo}
              />
            </div>
          }
        />
        <ExchangeInfoRow className="swap-box-info-row" label={t`Take-Profit PnL`}>
          {takeProfit?.totalPnl?.isZero() ? (
            "-"
          ) : (
            <Tooltip
              handle={`${formatUsd(takeProfit?.totalPnl)} (${formatPercentage(takeProfit?.totalPnlPercentage, {
                signed: true,
              })})`}
              position="right-bottom"
              handleClassName={takeProfit?.totalPnl?.isNegative() ? "text-red" : "text-green"}
              className="SLTP-pnl-tooltip"
              renderContent={() =>
                takeProfit?.amounts?.map((takeProfitAmount, index) => {
                  const takeProfitEntry = takeProfit?.entriesInfo?.entries[index];
                  return (
                    <div className="space-between mb-xs" key={index}>
                      <span className="mr-md">
                        At ${takeProfitEntry.price}, TP {takeProfitEntry?.percentage}%:
                      </span>
                      <span className={takeProfitAmount.realizedPnl.isNegative() ? "text-red" : "text-green"}>
                        {formatUsd(takeProfitAmount.realizedPnl)} (
                        {formatPercentage(takeProfitAmount.realizedPnlPercentage, {
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
        defaultAcceptablePriceImpactBps={defaultTriggerAcceptablePriceImpactBps}
        fees={fees}
        setSelectedAcceptablePriceImpactBps={setSelectedTriggerAcceptablePriceImapctBps}
      />
    );
  }

  function renderHighPriceImpactWarning() {
    if (!priceImpactWarningState.shouldShowWarning) return null;
    return <HighPriceImpactWarning priceImpactWarinigState={priceImpactWarningState} />;
  }

  function renderLeverage(from: BigNumber | undefined, to: BigNumber | undefined, emptyValue = false) {
    return (
      <ExchangeInfoRow
        label={t`Leverage`}
        value={emptyValue ? "-" : <ValueTransition from={formatLeverage(from)} to={formatLeverage(to) ?? "-"} />}
      />
    );
  }

  const hasWarning =
    renderExistingLimitOrdersWarning() ||
    renderDifferentCollateralWarning() ||
    renderCollateralSpreadWarning() ||
    renderExistingTriggerErrors() ||
    renderExistingTriggerWarning() ||
    renderDifferentTokensWarning();

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

    const collateralSpreadPercent = collateralSpreadInfo?.spread
      ?.mul(BASIS_POINTS_DIVISOR)
      ?.div(expandDecimals(1, USD_DECIMALS));

    return (
      <>
        <div>
          {renderMain()}
          {hasWarning && <div className="line-divider" />}
          <div className="Warning-list">
            {renderDifferentCollateralWarning()}
            {renderCollateralSpreadWarning()}
            {renderExistingLimitOrdersWarning()}
            {renderExistingTriggerErrors()}
            {renderExistingTriggerWarning()}
            {renderDifferentTokensWarning()}
          </div>
          {renderTakeProfit()}
          {renderStopLoss()}
          {renderLeverage(existingPosition?.leverage, nextPositionValues?.nextLeverage)}

          <div className="line-divider" />

          {isLimit && renderAvailableLiquidity()}
          {isMarket && collateralSpreadPercent?.gt(0) && (
            <ExchangeInfoRow label={t`Collateral Spread`} isWarning={collateralSpreadInfo?.isHigh}>
              {formatPercentage(collateralSpreadPercent)}
            </ExchangeInfoRow>
          )}
          {isMarket && renderAllowedSlippage(savedAllowedSlippage, setAllowedSlippage)}
          {isLimit && increaseAmounts && renderAcceptablePriceImpactInput()}

          <div className="line-divider" />

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
          <div className="line-divider" />
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
                  position="left-top"
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
                position="right-top"
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
            executionFee={p.executionFee}
            feesType="increase"
          />
          {decreaseOrdersThatWillBeExecuted?.length > 0 && <div className="line-divider" />}
          {decreaseOrdersThatWillBeExecuted?.length > 0 && (
            <div className="PositionEditor-allow-higher-slippage">
              <Checkbox isChecked={isTriggerWarningAccepted} setIsChecked={setIsTriggerWarningAccepted}>
                <span className="text-warning font-sm">
                  <Trans>I am aware of the trigger orders</Trans>
                </span>
              </Checkbox>
            </div>
          )}
        </div>
      </>
    );
  }

  function renderSwapSection() {
    return (
      <>
        <div>
          {renderMain()}
          {renderSwapSpreadWarining()}
          {isLimit && renderLimitPriceWarning()}
          {isLimit && renderAvailableLiquidity()}
          {swapSpreadInfo.showSpread && swapSpreadInfo.spread && (
            <ExchangeInfoRow label={t`Spread`} isWarning={swapSpreadInfo.isHigh}>
              {formatAmount(swapSpreadInfo.spread.mul(100), USD_DECIMALS, 2, true)}%
            </ExchangeInfoRow>
          )}
          {isMarket && renderAllowedSlippage(savedAllowedSlippage, setAllowedSlippage)}

          <div className="line-divider" />

          {isLimit && (
            <ExchangeInfoRow label={t`Limit Price`}>
              <Tooltip
                position="right-bottom"
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

          {!p.isWrapOrUnwrap && <TradeFeesRow {...fees} isTop executionFee={p.executionFee} feesType="swap" />}

          <ExchangeInfoRow label={t`Min. Receive`} isTop>
            {isMarket && swapAmounts?.minOutputAmount
              ? formatTokenAmount(
                  applySlippageToMinOut(allowedSlippage, swapAmounts.minOutputAmount),
                  toToken?.decimals,
                  toToken?.symbol
                )
              : formatTokenAmount(swapAmounts?.minOutputAmount, toToken?.decimals, toToken?.symbol)}
          </ExchangeInfoRow>
        </div>
      </>
    );
  }

  function renderTriggerDecreaseSection() {
    const existingPriceDecimals = p.existingPosition?.indexToken?.priceDecimals;
    const toTokenPriceDecimals = toToken?.priceDecimals;
    return (
      <>
        <div>
          {renderMain()}
          {renderDifferentCollateralWarning()}
          {existingPosition?.leverage && !decreaseAmounts?.isFullClose && (
            <>
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
              <div className="line-divider" />
            </>
          )}

          {decreaseAmounts && decreaseAmounts.triggerOrderType !== OrderType.StopLossDecrease && (
            <>
              {renderAcceptablePriceImpactInput()}
              <div className="line-divider" />
            </>
          )}

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

          <ExchangeInfoRow
            label={p.existingPosition?.sizeInUsd ? t`Size` : t`Decrease size`}
            isTop
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

          <TradeFeesRow {...fees} executionFee={p.executionFee} feesType="decrease" />

          {existingPosition && decreaseAmounts?.receiveUsd && (
            <ExchangeInfoRow
              isTop
              label={t`Receive`}
              value={formatTokenAmountWithUsd(
                decreaseAmounts.receiveTokenAmount,
                decreaseAmounts.receiveUsd,
                collateralToken?.symbol,
                collateralToken?.decimals
              )}
            />
          )}
        </div>
      </>
    );
  }

  const hasCheckboxesSection = Boolean(
    priceImpactWarningState.shouldShowWarning || (needPayTokenApproval && fromToken)
  );

  return (
    <div className="Confirmation-box">
      <Modal isVisible={p.isVisible} setIsVisible={onClose} label={title} allowContentTouchMove>
        {isSwap && renderSwapSection()}
        {isIncrease && renderIncreaseOrderSection()}
        {isTrigger && renderTriggerDecreaseSection()}
        {hasCheckboxesSection && <div className="line-divider" />}
        {renderHighPriceImpactWarning()}

        {needPayTokenApproval && fromToken && (
          <>
            <ApproveTokenButton
              tokenAddress={fromToken.address}
              tokenSymbol={fromToken.assetSymbol ?? fromToken.symbol}
              spenderAddress={getContract(chainId, "SyntheticsRouter")}
            />
          </>
        )}

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
