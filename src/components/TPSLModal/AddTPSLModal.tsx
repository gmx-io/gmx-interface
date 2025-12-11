import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ChangeEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { BASIS_POINTS_DIVISOR_BIGINT, USD_DECIMALS } from "config/factors";
import { UI_FEE_RECEIVER_ACCOUNT } from "config/ui";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  usePositionsConstants,
  useTokensData,
  useUiFeeFactor,
  useUserReferralInfo,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  selectAccount,
  selectBlockTimestampData,
  selectChainId,
  selectGasLimits,
  selectGasPrice,
  selectMarketsInfoData,
  selectSrcChainId,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectIsPnlInLeverage,
  selectIsSetAcceptablePriceImpactEnabled,
} from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getIsValidExpressParams } from "domain/synthetics/express/expressOrderUtils";
import { useExpressOrdersParams } from "domain/synthetics/express/useRelayerFeeHandler";
import { estimateExecuteDecreaseOrderGasLimit, estimateOrderOraclePriceCount } from "domain/synthetics/fees";
import { DecreasePositionSwapType, OrderType } from "domain/synthetics/orders";
import { sendBatchOrderTxn } from "domain/synthetics/orders/sendBatchOrderTxn";
import { useOrderTxnCallbacks } from "domain/synthetics/orders/useOrderTxnCallbacks";
import {
  PositionInfo,
  formatLeverage,
  formatLiquidationPrice,
  getIsPositionInfoLoaded,
} from "domain/synthetics/positions";
import {
  getDecreasePositionAmounts,
  getMarkPrice,
  getNextPositionValuesForDecreaseTrade,
  getTradeFees,
  getTriggerDecreaseOrderType,
  DecreasePositionAmounts,
} from "domain/synthetics/trade";
import { useMaxAutoCancelOrdersState } from "domain/synthetics/trade/useMaxAutoCancelOrdersState";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import {
  calculateDisplayDecimals,
  formatAmount,
  formatBalanceAmount,
  formatDeltaUsd,
  formatPercentage,
  formatUsd,
  parseValue,
} from "lib/numbers";
import { useJsonRpcProvider } from "lib/rpc";
import { getPositiveOrNegativeClass } from "lib/utils";
import useWallet from "lib/wallets/useWallet";
import { bigMath } from "sdk/utils/bigmath";
import { getExecutionFee } from "sdk/utils/fees/executionFee";
import {
  buildDecreaseOrderPayload,
  CreateOrderTxnParams,
  DecreasePositionOrderParams,
} from "sdk/utils/orderTransactions";

import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { ExitPriceRow } from "components/ExitPriceRow/ExitPriceRow";
import { ExpandableRow } from "components/ExpandableRow";
import Modal from "components/Modal/Modal";
import { NetworkFeeRow } from "components/NetworkFeeRow/NetworkFeeRow";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";
import { MarginPercentageSlider } from "components/TradeboxMarginFields/MarginPercentageSlider";
import { TradeFeesRow } from "components/TradeFeesRow/TradeFeesRow";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import { TPSLInputRow } from "./TPSLInputRow";

type Props = {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
  position: PositionInfo;
  onSuccess?: () => void;
};

export function AddTPSLModal({ isVisible, setIsVisible, position, onSuccess }: Props) {
  const [tpPriceInput, setTpPriceInput] = useState("");
  const [slPriceInput, setSlPriceInput] = useState("");
  const [keepLeverage, setKeepLeverage] = useState(true);
  const [editTPSLSize, setEditTPSLSize] = useState(false);
  const [closeSizeInput, setCloseSizeInput] = useState("");
  const [closePercentage, setClosePercentage] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionDetailsOpen, setExecutionDetailsOpen] = useLocalStorageSerializeKey(
    "add-tpsl-execution-details-open",
    false
  );

  const chainId = useSelector(selectChainId);
  const srcChainId = useSelector(selectSrcChainId);
  const account = useSelector(selectAccount);
  const { signer } = useWallet();
  const { provider } = useJsonRpcProvider(chainId);
  const { makeOrderTxnCallback } = useOrderTxnCallbacks();
  const userReferralInfo = useUserReferralInfo();
  const { minCollateralUsd, minPositionSizeUsd } = usePositionsConstants();
  const uiFeeFactor = useUiFeeFactor();
  const { autoCancelOrdersLimit } = useMaxAutoCancelOrdersState({ positionKey: position.key });
  const tokensData = useTokensData();
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const gasLimits = useSelector(selectGasLimits);
  const gasPrice = useSelector(selectGasPrice);
  const blockTimestampData = useSelector(selectBlockTimestampData);
  const isSetAcceptablePriceImpactEnabled = useSelector(selectIsSetAcceptablePriceImpactEnabled);
  const isPnlInLeverage = useSelector(selectIsPnlInLeverage);
  const { shouldDisableValidationForTesting } = useSettings();

  const marketInfo = position.marketInfo;
  const collateralToken = position.collateralToken;
  const indexToken = position.indexToken;
  const isLong = position.isLong;

  const visualMultiplier = indexToken?.visualMultiplier ?? 1;
  const priceDecimals = calculateDisplayDecimals(position.markPrice, USD_DECIMALS, visualMultiplier);

  const markPrice = useMemo(() => {
    return getMarkPrice({ prices: position.indexToken.prices, isLong: position.isLong, isIncrease: false });
  }, [position.indexToken.prices, position.isLong]);

  const positionData = useMemo(() => {
    return {
      sizeInUsd: position.sizeInUsd,
      sizeInTokens: position.sizeInTokens,
      collateralUsd: position.collateralUsd,
      entryPrice: position.entryPrice ?? 0n,
      liquidationPrice: position.liquidationPrice,
      isLong,
      indexTokenDecimals: indexToken?.decimals ?? 18,
      visualMultiplier,
    };
  }, [position, isLong, indexToken?.decimals, visualMultiplier]);

  const tpTriggerPrice = useMemo(() => {
    if (!tpPriceInput) return undefined;
    let price = parseValue(tpPriceInput, USD_DECIMALS);
    if (price !== undefined && visualMultiplier) {
      price = price / BigInt(visualMultiplier);
    }
    return price;
  }, [tpPriceInput, visualMultiplier]);

  const slTriggerPrice = useMemo(() => {
    if (!slPriceInput) return undefined;
    let price = parseValue(slPriceInput, USD_DECIMALS);
    if (price !== undefined && visualMultiplier) {
      price = price / BigInt(visualMultiplier);
    }
    return price;
  }, [slPriceInput, visualMultiplier]);

  const closeSizeUsd = useMemo(() => {
    if (!editTPSLSize || !closeSizeInput) {
      return position.sizeInUsd;
    }
    return parseValue(closeSizeInput, USD_DECIMALS) ?? position.sizeInUsd;
  }, [editTPSLSize, closeSizeInput, position.sizeInUsd]);

  const tpTriggerOrderType = useMemo(() => {
    if (tpTriggerPrice === undefined || markPrice === undefined) return undefined;
    return getTriggerDecreaseOrderType({
      triggerPrice: tpTriggerPrice,
      markPrice,
      isLong,
    });
  }, [tpTriggerPrice, markPrice, isLong]);

  const slTriggerOrderType = useMemo(() => {
    if (slTriggerPrice === undefined || markPrice === undefined) return undefined;
    return getTriggerDecreaseOrderType({
      triggerPrice: slTriggerPrice,
      markPrice,
      isLong,
    });
  }, [slTriggerPrice, markPrice, isLong]);

  const tpDecreaseAmounts: DecreasePositionAmounts | undefined = useMemo(() => {
    if (
      tpTriggerPrice === undefined ||
      !marketInfo ||
      minCollateralUsd === undefined ||
      minPositionSizeUsd === undefined ||
      !tpTriggerOrderType ||
      !getIsPositionInfoLoaded(position)
    ) {
      return undefined;
    }

    return getDecreasePositionAmounts({
      marketInfo,
      collateralToken,
      isLong,
      position,
      closeSizeUsd,
      keepLeverage,
      triggerPrice: tpTriggerPrice,
      userReferralInfo,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      triggerOrderType: tpTriggerOrderType,
      isSetAcceptablePriceImpactEnabled,
    });
  }, [
    tpTriggerPrice,
    marketInfo,
    collateralToken,
    isLong,
    position,
    closeSizeUsd,
    keepLeverage,
    userReferralInfo,
    minCollateralUsd,
    minPositionSizeUsd,
    uiFeeFactor,
    tpTriggerOrderType,
    isSetAcceptablePriceImpactEnabled,
  ]);

  const slDecreaseAmounts: DecreasePositionAmounts | undefined = useMemo(() => {
    if (
      slTriggerPrice === undefined ||
      !marketInfo ||
      minCollateralUsd === undefined ||
      minPositionSizeUsd === undefined ||
      !slTriggerOrderType ||
      !getIsPositionInfoLoaded(position)
    ) {
      return undefined;
    }

    return getDecreasePositionAmounts({
      marketInfo,
      collateralToken,
      isLong,
      position,
      closeSizeUsd,
      keepLeverage,
      triggerPrice: slTriggerPrice,
      userReferralInfo,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      triggerOrderType: slTriggerOrderType,
      isSetAcceptablePriceImpactEnabled,
    });
  }, [
    slTriggerPrice,
    marketInfo,
    collateralToken,
    isLong,
    position,
    closeSizeUsd,
    keepLeverage,
    userReferralInfo,
    minCollateralUsd,
    minPositionSizeUsd,
    uiFeeFactor,
    slTriggerOrderType,
    isSetAcceptablePriceImpactEnabled,
  ]);

  const activeDecreaseAmounts = tpDecreaseAmounts || slDecreaseAmounts;

  const executionFee = useMemo(() => {
    if (!gasLimits || !tokensData || gasPrice === undefined) {
      return undefined;
    }

    const estimatedGas = estimateExecuteDecreaseOrderGasLimit(gasLimits, {
      swapsCount: 0,
      decreaseSwapType: activeDecreaseAmounts?.decreaseSwapType ?? DecreasePositionSwapType.NoSwap,
    });

    const oraclePriceCount = estimateOrderOraclePriceCount(0);

    return getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice, oraclePriceCount);
  }, [gasLimits, tokensData, gasPrice, chainId, activeDecreaseAmounts]);

  const fees = useMemo(() => {
    if (!activeDecreaseAmounts || !position) {
      return undefined;
    }

    const sizeReductionBps = bigMath.mulDiv(
      activeDecreaseAmounts.sizeDeltaUsd,
      BASIS_POINTS_DIVISOR_BIGINT,
      position.sizeInUsd
    );
    const collateralDeltaUsd = bigMath.mulDiv(position.collateralUsd, sizeReductionBps, BASIS_POINTS_DIVISOR_BIGINT);

    return getTradeFees({
      initialCollateralUsd: position.collateralUsd,
      sizeInUsd: position.sizeInUsd,
      collateralDeltaUsd,
      sizeDeltaUsd: activeDecreaseAmounts.sizeDeltaUsd,
      swapSteps: [],
      externalSwapQuote: undefined,
      positionFeeUsd: activeDecreaseAmounts.positionFeeUsd,
      swapPriceImpactDeltaUsd: 0n,
      totalPendingImpactDeltaUsd: activeDecreaseAmounts.totalPendingImpactDeltaUsd,
      increasePositionPriceImpactDeltaUsd: 0n,
      priceImpactDiffUsd: activeDecreaseAmounts.priceImpactDiffUsd,
      proportionalPendingImpactDeltaUsd: activeDecreaseAmounts.proportionalPendingImpactDeltaUsd,
      decreasePositionPriceImpactDeltaUsd: activeDecreaseAmounts.closePriceImpactDeltaUsd,
      borrowingFeeUsd: activeDecreaseAmounts.borrowingFeeUsd,
      fundingFeeUsd: activeDecreaseAmounts.fundingFeeUsd,
      feeDiscountUsd: activeDecreaseAmounts.feeDiscountUsd,
      swapProfitFeeUsd: activeDecreaseAmounts.swapProfitFeeUsd,
      uiFeeFactor,
      type: "decrease",
    });
  }, [activeDecreaseAmounts, position, uiFeeFactor]);

  const nextPositionValues = useMemo(() => {
    if (
      !activeDecreaseAmounts ||
      activeDecreaseAmounts.acceptablePrice === undefined ||
      !marketInfo ||
      minCollateralUsd === undefined
    ) {
      return undefined;
    }

    return getNextPositionValuesForDecreaseTrade({
      existingPosition: position,
      marketInfo,
      collateralToken,
      sizeDeltaUsd: activeDecreaseAmounts.sizeDeltaUsd,
      sizeDeltaInTokens: activeDecreaseAmounts.sizeDeltaInTokens,
      estimatedPnl: activeDecreaseAmounts.estimatedPnl,
      realizedPnl: activeDecreaseAmounts.realizedPnl,
      collateralDeltaUsd: activeDecreaseAmounts.collateralDeltaUsd,
      collateralDeltaAmount: activeDecreaseAmounts.collateralDeltaAmount,
      payedRemainingCollateralUsd: activeDecreaseAmounts.payedRemainingCollateralUsd,
      payedRemainingCollateralAmount: activeDecreaseAmounts.payedRemainingCollateralAmount,
      proportionalPendingImpactDeltaUsd: activeDecreaseAmounts.proportionalPendingImpactDeltaUsd,
      showPnlInLeverage: isPnlInLeverage,
      isLong,
      minCollateralUsd,
      userReferralInfo,
    });
  }, [
    activeDecreaseAmounts,
    marketInfo,
    collateralToken,
    isLong,
    minCollateralUsd,
    position,
    userReferralInfo,
    isPnlInLeverage,
  ]);

  const tpEstimatedPnl = useMemo(() => {
    if (!tpDecreaseAmounts) return undefined;
    return {
      pnlUsd: tpDecreaseAmounts.realizedPnl,
      pnlPercentage: tpDecreaseAmounts.realizedPnlPercentage,
    };
  }, [tpDecreaseAmounts]);

  const slEstimatedPnl = useMemo(() => {
    if (!slDecreaseAmounts) return undefined;
    return {
      pnlUsd: slDecreaseAmounts.realizedPnl,
      pnlPercentage: slDecreaseAmounts.realizedPnlPercentage,
    };
  }, [slDecreaseAmounts]);

  const receiveDisplay = useMemo(() => {
    const amounts = activeDecreaseAmounts;
    if (!amounts) return undefined;

    const receiveUsd = amounts.receiveUsd ?? 0n;
    const receiveAmount = amounts.receiveTokenAmount ?? 0n;

    return {
      text: formatBalanceAmount(receiveAmount, collateralToken.decimals, collateralToken.symbol, {
        isStable: collateralToken.isStable,
      }),
      usd: formatUsd(receiveUsd),
    };
  }, [activeDecreaseAmounts, collateralToken]);

  const formattedMaxCloseSize = formatAmount(position.sizeInUsd, USD_DECIMALS, 2);

  const handleCloseSizeChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setCloseSizeInput(e.target.value);
  }, []);

  const handleClosePercentageChange = useCallback(
    (percent: number) => {
      setClosePercentage(percent);
      const newSize = bigMath.mulDiv(position.sizeInUsd, BigInt(percent), 100n);
      setCloseSizeInput(formatAmount(newSize, USD_DECIMALS, 2));
    },
    [position.sizeInUsd]
  );

  const handleSliderChange = useCallback(
    (percent: number) => {
      setClosePercentage(percent);
      const newSize = bigMath.mulDiv(position.sizeInUsd, BigInt(percent), 100n);
      setCloseSizeInput(formatAmount(newSize, USD_DECIMALS, 2));
    },
    [position.sizeInUsd]
  );

  const handleMaxClick = useCallback(() => {
    setClosePercentage(100);
    setCloseSizeInput(formattedMaxCloseSize);
  }, [formattedMaxCloseSize]);

  const handleEditTPSLSizeToggle = useCallback(
    (value: boolean) => {
      setEditTPSLSize(value);
      setClosePercentage(100);
      setCloseSizeInput(formattedMaxCloseSize);
    },
    [formattedMaxCloseSize]
  );

  const tpPriceError = useMemo(() => {
    if (tpTriggerPrice === undefined || tpTriggerPrice === 0n || markPrice === undefined) return undefined;

    if (isLong && tpTriggerPrice <= markPrice) {
      return t`TP price must be above Mark Price`;
    }
    if (!isLong && tpTriggerPrice >= markPrice) {
      return t`TP price must be below Mark Price`;
    }
    return undefined;
  }, [tpTriggerPrice, isLong, markPrice]);

  const slPriceError = useMemo(() => {
    if (slTriggerPrice === undefined || slTriggerPrice === 0n || markPrice === undefined) return undefined;

    if (isLong && slTriggerPrice >= markPrice) {
      return t`SL price must be below Mark Price`;
    }
    if (!isLong && slTriggerPrice <= markPrice) {
      return t`SL price must be above Mark Price`;
    }
    return undefined;
  }, [slTriggerPrice, isLong, markPrice]);

  const orderPayloads = useMemo((): CreateOrderTxnParams<DecreasePositionOrderParams>[] => {
    const payloads: CreateOrderTxnParams<DecreasePositionOrderParams>[] = [];

    if (tpDecreaseAmounts && account && marketInfo && !tpPriceError && executionFee) {
      payloads.push(
        buildDecreaseOrderPayload({
          chainId,
          receiver: account,
          collateralDeltaAmount: tpDecreaseAmounts.collateralDeltaAmount ?? 0n,
          collateralTokenAddress: collateralToken.address,
          sizeDeltaUsd: tpDecreaseAmounts.sizeDeltaUsd,
          sizeDeltaInTokens: tpDecreaseAmounts.sizeDeltaInTokens,
          referralCode: userReferralInfo?.referralCodeForTxn,
          uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT,
          allowedSlippage: 0,
          orderType: tpDecreaseAmounts.triggerOrderType ?? OrderType.LimitDecrease,
          autoCancel: autoCancelOrdersLimit > 0,
          swapPath: [],
          externalSwapQuote: undefined,
          marketAddress: marketInfo.marketTokenAddress,
          indexTokenAddress: marketInfo.indexTokenAddress,
          isLong,
          acceptablePrice: tpDecreaseAmounts.acceptablePrice,
          triggerPrice: tpDecreaseAmounts.triggerPrice,
          receiveTokenAddress: collateralToken.address,
          minOutputUsd: 0n,
          decreasePositionSwapType: tpDecreaseAmounts.decreaseSwapType,
          executionFeeAmount: executionFee.feeTokenAmount,
          executionGasLimit: executionFee.gasLimit,
          validFromTime: 0n,
        })
      );
    }

    if (slDecreaseAmounts && account && marketInfo && !slPriceError && executionFee) {
      payloads.push(
        buildDecreaseOrderPayload({
          chainId,
          receiver: account,
          collateralDeltaAmount: slDecreaseAmounts.collateralDeltaAmount ?? 0n,
          collateralTokenAddress: collateralToken.address,
          sizeDeltaUsd: slDecreaseAmounts.sizeDeltaUsd,
          sizeDeltaInTokens: slDecreaseAmounts.sizeDeltaInTokens,
          referralCode: userReferralInfo?.referralCodeForTxn,
          uiFeeReceiver: UI_FEE_RECEIVER_ACCOUNT,
          allowedSlippage: 0,
          orderType: slDecreaseAmounts.triggerOrderType ?? OrderType.StopLossDecrease,
          autoCancel: autoCancelOrdersLimit > 0,
          swapPath: [],
          externalSwapQuote: undefined,
          marketAddress: marketInfo.marketTokenAddress,
          indexTokenAddress: marketInfo.indexTokenAddress,
          isLong,
          acceptablePrice: slDecreaseAmounts.acceptablePrice,
          triggerPrice: slDecreaseAmounts.triggerPrice,
          receiveTokenAddress: collateralToken.address,
          minOutputUsd: 0n,
          decreasePositionSwapType: slDecreaseAmounts.decreaseSwapType,
          executionFeeAmount: executionFee.feeTokenAmount,
          executionGasLimit: executionFee.gasLimit,
          validFromTime: 0n,
        })
      );
    }

    return payloads;
  }, [
    tpDecreaseAmounts,
    slDecreaseAmounts,
    account,
    marketInfo,
    chainId,
    collateralToken.address,
    userReferralInfo?.referralCodeForTxn,
    autoCancelOrdersLimit,
    isLong,
    tpPriceError,
    slPriceError,
    executionFee,
  ]);

  const batchParams = useMemo(() => {
    if (orderPayloads.length === 0) return undefined;
    return {
      createOrderParams: orderPayloads,
      updateOrderParams: [],
      cancelOrderParams: [],
    };
  }, [orderPayloads]);

  const { expressParamsPromise } = useExpressOrdersParams({
    orderParams: batchParams,
    label: "Add TP/SL",
    isGmxAccount: srcChainId !== undefined,
  });

  const submitError = useMemo(() => {
    if (!tpPriceInput && !slPriceInput) {
      return t`Enter an amount`;
    }
    if (tpPriceError && tpPriceInput) {
      return tpPriceError;
    }
    if (slPriceError && slPriceInput) {
      return slPriceError;
    }
    if (orderPayloads.length === 0) {
      return t`Unable to calculate order`;
    }
    return undefined;
  }, [tpPriceInput, slPriceInput, tpPriceError, slPriceError, orderPayloads.length]);

  const handleSubmit = useCallback(async () => {
    if (!signer || !provider || !batchParams || !tokensData || !marketsInfoData) return;

    setIsSubmitting(true);

    try {
      const fulfilledExpressParams = await expressParamsPromise;

      await sendBatchOrderTxn({
        chainId,
        signer,
        batchParams,
        expressParams:
          fulfilledExpressParams && getIsValidExpressParams(fulfilledExpressParams)
            ? fulfilledExpressParams
            : undefined,
        simulationParams: shouldDisableValidationForTesting
          ? undefined
          : {
              tokensData,
              blockTimestampData,
            },
        callback: makeOrderTxnCallback({}),
        provider,
        isGmxAccount: srcChainId !== undefined,
      });

      setIsVisible(false);
      onSuccess?.();
    } finally {
      setIsSubmitting(false);
    }
  }, [
    signer,
    provider,
    batchParams,
    chainId,
    srcChainId,
    expressParamsPromise,
    makeOrderTxnCallback,
    setIsVisible,
    onSuccess,
    tokensData,
    marketsInfoData,
    shouldDisableValidationForTesting,
    blockTimestampData,
  ]);

  useEffect(() => {
    if (!isVisible) {
      setTpPriceInput("");
      setSlPriceInput("");
      setCloseSizeInput("");
      setEditTPSLSize(false);
      setClosePercentage(100);
    }
  }, [isVisible]);

  const positionTitle = `${position.isLong ? t`Long` : t`Short`} ${indexToken.symbol}`;

  const currentLeverage = formatLeverage(position.leverage);
  const activeTriggerPrice = activeDecreaseAmounts?.triggerPrice ?? tpTriggerPrice ?? slTriggerPrice;

  const leverageValue: ReactNode = useMemo(() => {
    if (activeDecreaseAmounts?.isFullClose) {
      return t`NA`;
    }

    if (activeDecreaseAmounts?.sizeDeltaUsd === position.sizeInUsd) {
      return "-";
    }

    if (activeDecreaseAmounts?.sizeDeltaUsd && activeDecreaseAmounts.sizeDeltaUsd > 0n) {
      return <ValueTransition from={currentLeverage!} to={formatLeverage(nextPositionValues?.nextLeverage)} />;
    }

    return currentLeverage;
  }, [
    activeDecreaseAmounts?.isFullClose,
    activeDecreaseAmounts?.sizeDeltaUsd,
    currentLeverage,
    nextPositionValues,
    position.sizeInUsd,
  ]);

  const priceImpactFeesDisplay = useMemo(() => {
    if (!fees) return "-";
    const netFee = fees.collateralNetPriceImpact?.deltaUsd ?? 0n;
    return formatDeltaUsd(netFee);
  }, [fees]);

  return (
    <Modal
      isVisible={isVisible}
      setIsVisible={setIsVisible}
      label={<Trans>TP/SL: {positionTitle} Decrease</Trans>}
      withMobileBottomPosition
    >
      <div className="flex flex-col gap-16">
        <div className="flex flex-col gap-4">
          <TPSLInputRow
            type="takeProfit"
            priceValue={tpPriceInput}
            onPriceChange={setTpPriceInput}
            positionData={positionData}
            priceError={tpPriceError}
            variant="full"
            defaultDisplayMode="percentage"
          />
          <div className="text-body-small flex justify-end">
            <span className="text-typography-secondary">
              <Trans>Est. PnL</Trans>
            </span>
            <span
              className={cx("ml-4 numbers", {
                "text-green-500": tpEstimatedPnl && tpEstimatedPnl.pnlUsd > 0n,
                "text-red-500": tpEstimatedPnl && tpEstimatedPnl.pnlUsd < 0n,
              })}
            >
              {tpEstimatedPnl ? formatDeltaUsd(tpEstimatedPnl.pnlUsd, tpEstimatedPnl.pnlPercentage) : "-"}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <TPSLInputRow
            type="stopLoss"
            priceValue={slPriceInput}
            onPriceChange={setSlPriceInput}
            positionData={positionData}
            priceError={slPriceError}
            variant="full"
            defaultDisplayMode="usd"
          />
          <div className="text-body-small flex justify-end">
            <span className="text-typography-secondary">
              <Trans>Est. PnL</Trans>
            </span>
            <span
              className={cx("ml-4 numbers", {
                "text-green-500": slEstimatedPnl && slEstimatedPnl.pnlUsd > 0n,
                "text-red-500": slEstimatedPnl && slEstimatedPnl.pnlUsd < 0n,
              })}
            >
              {slEstimatedPnl ? formatDeltaUsd(slEstimatedPnl.pnlUsd, slEstimatedPnl.pnlPercentage) : "-"}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <ToggleSwitch isChecked={keepLeverage} setIsChecked={setKeepLeverage}>
            <Trans>Keep leverage at {currentLeverage}</Trans>
          </ToggleSwitch>
          <ToggleSwitch isChecked={editTPSLSize} setIsChecked={handleEditTPSLSizeToggle}>
            <Trans>Edit TP/SL Size</Trans>
          </ToggleSwitch>
        </div>

        {editTPSLSize && (
          <div className="flex flex-col gap-12">
            <BuyInputSection
              topLeftLabel={t`Close`}
              inputValue={closeSizeInput}
              onInputValueChange={handleCloseSizeChange}
              onClickBottomRightLabel={() => {
                setCloseSizeInput(formattedMaxCloseSize);
                setClosePercentage(100);
              }}
              showPercentSelector={position.sizeInUsd > 0n}
              onPercentChange={handleClosePercentageChange}
              qa="close-size"
            >
              {collateralToken.symbol}
            </BuyInputSection>
            <MarginPercentageSlider
              value={closePercentage}
              onChange={handleSliderChange}
              onMaxClick={closePercentage < 100 ? handleMaxClick : undefined}
            />
          </div>
        )}

        <Button
          variant="primary-action"
          className="w-full"
          onClick={handleSubmit}
          disabled={!!submitError || isSubmitting}
        >
          {submitError || (isSubmitting ? t`Creating...` : t`Create TP/SL`)}
        </Button>

        <div className="flex flex-col gap-10">
          <SyntheticsInfoRow
            label={<Trans>Receive</Trans>}
            value={
              receiveDisplay ? (
                <span className="numbers">
                  {receiveDisplay.text} <span className="text-typography-secondary">({receiveDisplay.usd})</span>
                </span>
              ) : (
                "-"
              )
            }
          />
          <SyntheticsInfoRow
            label={<Trans>Liquidation Price</Trans>}
            value={
              activeDecreaseAmounts?.isFullClose ? (
                formatLiquidationPrice(position.liquidationPrice, {
                  displayDecimals: priceDecimals,
                  visualMultiplier,
                })
              ) : (
                <ValueTransition
                  from={formatLiquidationPrice(position.liquidationPrice, {
                    displayDecimals: priceDecimals,
                    visualMultiplier,
                  })}
                  to={
                    activeDecreaseAmounts?.sizeDeltaUsd !== undefined && activeDecreaseAmounts.sizeDeltaUsd > 0n
                      ? formatLiquidationPrice(nextPositionValues?.nextLiqPrice, {
                          displayDecimals: priceDecimals,
                          visualMultiplier,
                        })
                      : undefined
                  }
                />
              )
            }
          />
          <SyntheticsInfoRow
            label={<Trans>PnL</Trans>}
            value={
              activeDecreaseAmounts ? (
                <>
                  {formatDeltaUsd(activeDecreaseAmounts.estimatedPnl)} (
                  {formatPercentage(activeDecreaseAmounts.estimatedPnlPercentage, { signed: true })})
                </>
              ) : (
                "-"
              )
            }
          />
          <SyntheticsInfoRow
            label={<Trans>Net Price Impact / Fees</Trans>}
            value={
              <span className={cx("numbers", getPositiveOrNegativeClass(fees?.collateralNetPriceImpact?.deltaUsd))}>
                {priceImpactFeesDisplay}
              </span>
            }
          />
        </div>

        <ExpandableRow
          title={t`Execution Details`}
          open={executionDetailsOpen}
          onToggle={setExecutionDetailsOpen}
          contentClassName="flex flex-col gap-10"
          wrapped
        >
          <ExitPriceRow price={activeTriggerPrice} isLong={isLong} isSwap={false} fees={fees} />
          <TradeFeesRow {...(fees || {})} feesType="decrease" />
          <NetworkFeeRow executionFee={executionFee} />
          <SyntheticsInfoRow label={<Trans>Leverage</Trans>} value={leverageValue} />
          <SyntheticsInfoRow
            label={<Trans>Size</Trans>}
            value={
              <ValueTransition from={formatUsd(position.sizeInUsd)!} to={formatUsd(nextPositionValues?.nextSizeUsd)} />
            }
          />
          <SyntheticsInfoRow
            label={
              <TooltipWithPortal
                handle={<Trans>Collateral ({collateralToken.symbol})</Trans>}
                content={<Trans>Initial collateral (collateral excluding borrow and funding fee).</Trans>}
                variant="icon"
              />
            }
            value={
              <ValueTransition
                from={formatUsd(position.collateralUsd)!}
                to={nextPositionValues?.nextCollateralUsd ? formatUsd(nextPositionValues.nextCollateralUsd) : undefined}
              />
            }
          />
        </ExpandableRow>
      </div>
    </Modal>
  );
}
