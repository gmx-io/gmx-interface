import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ChangeEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { BASIS_POINTS_DIVISOR_BIGINT, USD_DECIMALS } from "config/factors";
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
  selectBreakdownNetPriceImpactEnabled,
  selectIsPnlInLeverage,
  selectIsSetAcceptablePriceImpactEnabled,
} from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getIsValidExpressParams } from "domain/synthetics/express/expressOrderUtils";
import { useExpressOrdersParams } from "domain/synthetics/express/useRelayerFeeHandler";
import { estimateExecuteDecreaseOrderGasLimit, estimateOrderOraclePriceCount } from "domain/synthetics/fees";
import { DecreasePositionSwapType } from "domain/synthetics/orders";
import { sendBatchOrderTxn } from "domain/synthetics/orders/sendBatchOrderTxn";
import { useOrderTxnCallbacks } from "domain/synthetics/orders/useOrderTxnCallbacks";
import {
  PositionInfo,
  formatLeverage,
  formatLiquidationPrice,
  getIsPositionInfoLoaded,
} from "domain/synthetics/positions";
import {
  getDefaultEntryField,
  handleEntryError,
  MAX_PERCENTAGE,
  PERCENTAGE_DECIMALS,
} from "domain/synthetics/sidecarOrders/utils";
import {
  getMarkPrice,
  getNextPositionValuesForDecreaseTrade,
  getTradeFees,
  getTriggerDecreaseOrderType,
  DecreasePositionAmounts,
} from "domain/synthetics/trade";
import { useMaxAutoCancelOrdersState } from "domain/synthetics/trade/useMaxAutoCancelOrdersState";
import { buildTpSlCreatePayloads, buildTpSlInputPositionData, getTpSlDecreaseAmounts } from "domain/tpsl/sidecar";
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
import useWallet from "lib/wallets/useWallet";
import { bigMath } from "sdk/utils/bigmath";
import { getCappedPriceImpactPercentageFromFees } from "sdk/utils/fees";
import { getExecutionFee } from "sdk/utils/fees/executionFee";
import {
  CreateOrderTxnParams,
  DecreasePositionOrderParams,
  getBatchTotalExecutionFee,
} from "sdk/utils/orderTransactions";
import { SidecarSlTpOrderEntry } from "sdk/utils/sidecarOrders";
import { getIsEquivalentTokens } from "sdk/utils/tokens";

import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { ExitPriceRow } from "components/ExitPriceRow/ExitPriceRow";
import { ExpandableRow } from "components/ExpandableRow";
import Modal from "components/Modal/Modal";
import { NetworkFeeRow } from "components/NetworkFeeRow/NetworkFeeRow";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import Tabs from "components/Tabs/Tabs";
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
  onBack?: () => void;
};

export function AddTPSLModal({ isVisible, setIsVisible, position, onSuccess, onBack }: Props) {
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
  const [previewTab, setPreviewTab] = useState<"tp" | "sl">("tp");

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
  const breakdownNetPriceImpactEnabled = useSelector(selectBreakdownNetPriceImpactEnabled);
  const { shouldDisableValidationForTesting } = useSettings();

  const marketInfo = position.marketInfo;
  const collateralToken = position.collateralToken;
  const indexToken = position.indexToken;
  const isLong = position.isLong;
  const isCollateralTokenEquivalentToIndex = useMemo(
    () => getIsEquivalentTokens(position.collateralToken, position.indexToken),
    [position.collateralToken, position.indexToken]
  );

  const visualMultiplier = indexToken?.visualMultiplier ?? 1;
  const priceDecimals = calculateDisplayDecimals(position.markPrice, USD_DECIMALS, visualMultiplier);

  const markPrice = useMemo(() => {
    return getMarkPrice({ prices: position.indexToken.prices, isLong: position.isLong, isIncrease: false });
  }, [position.indexToken.prices, position.isLong]);

  const positionData = useMemo(
    () =>
      buildTpSlInputPositionData({
        position,
        collateralUsd: position.collateralUsd,
        indexTokenDecimals: indexToken?.decimals ?? 18,
        collateralTokenDecimals: collateralToken.decimals,
        isCollateralTokenEquivalentToIndex,
        visualMultiplier,
        referencePrice: markPrice,
      })!,
    [
      position,
      indexToken?.decimals,
      collateralToken.decimals,
      isCollateralTokenEquivalentToIndex,
      visualMultiplier,
      markPrice,
    ]
  );

  const tpPriceEntry = useMemo(
    () => getDefaultEntryField(USD_DECIMALS, { input: tpPriceInput }, visualMultiplier),
    [tpPriceInput, visualMultiplier]
  );

  const slPriceEntry = useMemo(
    () => getDefaultEntryField(USD_DECIMALS, { input: slPriceInput }, visualMultiplier),
    [slPriceInput, visualMultiplier]
  );

  const tpTriggerPrice = useMemo(
    () => (tpPriceEntry.value === null ? undefined : tpPriceEntry.value),
    [tpPriceEntry.value]
  );

  const slTriggerPrice = useMemo(
    () => (slPriceEntry.value === null ? undefined : slPriceEntry.value),
    [slPriceEntry.value]
  );

  const closeSizeUsd = useMemo(() => {
    if (!editTPSLSize || !closeSizeInput) {
      return position.sizeInUsd;
    }
    return parseValue(closeSizeInput, USD_DECIMALS) ?? position.sizeInUsd;
  }, [editTPSLSize, closeSizeInput, position.sizeInUsd]);

  const sizeUsdEntry = useMemo(() => getDefaultEntryField(USD_DECIMALS, { value: closeSizeUsd }), [closeSizeUsd]);

  const percentageEntry = useMemo(() => getDefaultEntryField(PERCENTAGE_DECIMALS, { value: MAX_PERCENTAGE }), []);

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
    if (tpTriggerPrice === undefined || !getIsPositionInfoLoaded(position)) {
      return undefined;
    }

    return getTpSlDecreaseAmounts({
      position,
      closeSizeUsd,
      triggerPrice: tpTriggerPrice,
      triggerOrderType: tpTriggerOrderType,
      keepLeverage,
      isLimit: false,
      limitPrice: undefined,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      userReferralInfo,
      isSetAcceptablePriceImpactEnabled,
    });
  }, [
    tpTriggerPrice,
    position,
    closeSizeUsd,
    keepLeverage,
    minCollateralUsd,
    minPositionSizeUsd,
    uiFeeFactor,
    userReferralInfo,
    tpTriggerOrderType,
    isSetAcceptablePriceImpactEnabled,
  ]);

  const slDecreaseAmounts: DecreasePositionAmounts | undefined = useMemo(() => {
    if (slTriggerPrice === undefined || !getIsPositionInfoLoaded(position)) {
      return undefined;
    }

    return getTpSlDecreaseAmounts({
      position,
      closeSizeUsd,
      triggerPrice: slTriggerPrice,
      triggerOrderType: slTriggerOrderType,
      keepLeverage,
      isLimit: false,
      limitPrice: undefined,
      minCollateralUsd,
      minPositionSizeUsd,
      uiFeeFactor,
      userReferralInfo,
      isSetAcceptablePriceImpactEnabled,
    });
  }, [
    slTriggerPrice,
    position,
    closeSizeUsd,
    keepLeverage,
    minCollateralUsd,
    minPositionSizeUsd,
    uiFeeFactor,
    userReferralInfo,
    slTriggerOrderType,
    isSetAcceptablePriceImpactEnabled,
  ]);

  const tpPositionData = useMemo(
    () => ({
      ...positionData,
      sizeInTokens: tpDecreaseAmounts?.sizeDeltaInTokens ?? positionData.sizeInTokens,
    }),
    [positionData, tpDecreaseAmounts?.sizeDeltaInTokens]
  );

  const slPositionData = useMemo(
    () => ({
      ...positionData,
      sizeInTokens: slDecreaseAmounts?.sizeDeltaInTokens ?? positionData.sizeInTokens,
    }),
    [positionData, slDecreaseAmounts?.sizeDeltaInTokens]
  );

  const getSidecarExecutionFee = useCallback(
    (decreaseSwapType: DecreasePositionSwapType | undefined) => {
      if (!gasLimits || !tokensData || gasPrice === undefined) {
        return undefined;
      }

      const estimatedGas = estimateExecuteDecreaseOrderGasLimit(gasLimits, {
        swapsCount: 0,
        decreaseSwapType: decreaseSwapType ?? DecreasePositionSwapType.NoSwap,
      });

      const oraclePriceCount = estimateOrderOraclePriceCount(0);

      return getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice, oraclePriceCount);
    },
    [chainId, gasLimits, gasPrice, tokensData]
  );

  const tpExecutionFee = useMemo(() => {
    if (!tpDecreaseAmounts) return undefined;
    return getSidecarExecutionFee(tpDecreaseAmounts.decreaseSwapType);
  }, [getSidecarExecutionFee, tpDecreaseAmounts]);

  const slExecutionFee = useMemo(() => {
    if (!slDecreaseAmounts) return undefined;
    return getSidecarExecutionFee(slDecreaseAmounts.decreaseSwapType);
  }, [getSidecarExecutionFee, slDecreaseAmounts]);

  const getFeesForDecreaseAmounts = useCallback(
    (decreaseAmounts: DecreasePositionAmounts | undefined) => {
      if (!decreaseAmounts || !position) {
        return undefined;
      }

      const sizeReductionBps = bigMath.mulDiv(
        decreaseAmounts.sizeDeltaUsd,
        BASIS_POINTS_DIVISOR_BIGINT,
        position.sizeInUsd
      );
      const collateralDeltaUsd = bigMath.mulDiv(position.collateralUsd, sizeReductionBps, BASIS_POINTS_DIVISOR_BIGINT);

      return getTradeFees({
        initialCollateralUsd: position.collateralUsd,
        sizeInUsd: position.sizeInUsd,
        collateralDeltaUsd,
        sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
        swapSteps: [],
        externalSwapQuote: undefined,
        positionFeeUsd: decreaseAmounts.positionFeeUsd,
        swapPriceImpactDeltaUsd: 0n,
        totalPendingImpactDeltaUsd: decreaseAmounts.totalPendingImpactDeltaUsd,
        increasePositionPriceImpactDeltaUsd: 0n,
        priceImpactDiffUsd: decreaseAmounts.priceImpactDiffUsd,
        proportionalPendingImpactDeltaUsd: decreaseAmounts.proportionalPendingImpactDeltaUsd,
        decreasePositionPriceImpactDeltaUsd: decreaseAmounts.closePriceImpactDeltaUsd,
        borrowingFeeUsd: decreaseAmounts.borrowingFeeUsd,
        fundingFeeUsd: decreaseAmounts.fundingFeeUsd,
        feeDiscountUsd: decreaseAmounts.feeDiscountUsd,
        swapProfitFeeUsd: decreaseAmounts.swapProfitFeeUsd,
        uiFeeFactor,
        type: "decrease",
      });
    },
    [position, uiFeeFactor]
  );

  const tpFees = useMemo(
    () => getFeesForDecreaseAmounts(tpDecreaseAmounts),
    [getFeesForDecreaseAmounts, tpDecreaseAmounts]
  );
  const slFees = useMemo(
    () => getFeesForDecreaseAmounts(slDecreaseAmounts),
    [getFeesForDecreaseAmounts, slDecreaseAmounts]
  );

  const getNextPositionValuesForAmounts = useCallback(
    (decreaseAmounts: DecreasePositionAmounts | undefined) => {
      if (
        !decreaseAmounts ||
        decreaseAmounts.acceptablePrice === undefined ||
        !marketInfo ||
        minCollateralUsd === undefined
      ) {
        return undefined;
      }

      return getNextPositionValuesForDecreaseTrade({
        existingPosition: position,
        marketInfo,
        collateralToken,
        sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
        sizeDeltaInTokens: decreaseAmounts.sizeDeltaInTokens,
        estimatedPnl: decreaseAmounts.estimatedPnl,
        realizedPnl: decreaseAmounts.realizedPnl,
        collateralDeltaUsd: decreaseAmounts.collateralDeltaUsd,
        collateralDeltaAmount: decreaseAmounts.collateralDeltaAmount,
        payedRemainingCollateralUsd: decreaseAmounts.payedRemainingCollateralUsd,
        payedRemainingCollateralAmount: decreaseAmounts.payedRemainingCollateralAmount,
        proportionalPendingImpactDeltaUsd: decreaseAmounts.proportionalPendingImpactDeltaUsd,
        showPnlInLeverage: isPnlInLeverage,
        isLong,
        minCollateralUsd,
        userReferralInfo,
      });
    },
    [marketInfo, collateralToken, isLong, minCollateralUsd, position, userReferralInfo, isPnlInLeverage]
  );

  const tpNextPositionValues = useMemo(
    () => getNextPositionValuesForAmounts(tpDecreaseAmounts),
    [getNextPositionValuesForAmounts, tpDecreaseAmounts]
  );
  const slNextPositionValues = useMemo(
    () => getNextPositionValuesForAmounts(slDecreaseAmounts),
    [getNextPositionValuesForAmounts, slDecreaseAmounts]
  );

  const getEstimatedPnlFromAmounts = useCallback((decreaseAmounts: DecreasePositionAmounts | undefined) => {
    if (!decreaseAmounts) return undefined;

    return {
      pnlUsd: decreaseAmounts.realizedPnl,
      pnlPercentage: decreaseAmounts.realizedPnlPercentage,
    };
  }, []);

  const tpEstimatedPnl = useMemo(
    () => getEstimatedPnlFromAmounts(tpDecreaseAmounts),
    [getEstimatedPnlFromAmounts, tpDecreaseAmounts]
  );

  const slEstimatedPnl = useMemo(
    () => getEstimatedPnlFromAmounts(slDecreaseAmounts),
    [getEstimatedPnlFromAmounts, slDecreaseAmounts]
  );

  const getReceiveDisplay = useCallback(
    (amounts: DecreasePositionAmounts | undefined) => {
      if (!amounts) return undefined;

      const receiveUsd = amounts.receiveUsd ?? 0n;
      const receiveAmount = amounts.receiveTokenAmount ?? 0n;

      return {
        text: formatBalanceAmount(receiveAmount, collateralToken.decimals, collateralToken.symbol, {
          isStable: collateralToken.isStable,
        }),
        usd: formatUsd(receiveUsd),
      };
    },
    [collateralToken]
  );

  const tpReceiveDisplay = useMemo(() => getReceiveDisplay(tpDecreaseAmounts), [getReceiveDisplay, tpDecreaseAmounts]);
  const slReceiveDisplay = useMemo(() => getReceiveDisplay(slDecreaseAmounts), [getReceiveDisplay, slDecreaseAmounts]);

  const tpPreview = useMemo(
    () => ({
      decreaseAmounts: tpDecreaseAmounts,
      nextPositionValues: tpNextPositionValues,
      fees: tpFees,
      receiveDisplay: tpReceiveDisplay,
      triggerPrice: tpTriggerPrice,
    }),
    [tpDecreaseAmounts, tpNextPositionValues, tpFees, tpReceiveDisplay, tpTriggerPrice]
  );

  const slPreview = useMemo(
    () => ({
      decreaseAmounts: slDecreaseAmounts,
      nextPositionValues: slNextPositionValues,
      fees: slFees,
      receiveDisplay: slReceiveDisplay,
      triggerPrice: slTriggerPrice,
    }),
    [slDecreaseAmounts, slNextPositionValues, slFees, slReceiveDisplay, slTriggerPrice]
  );

  const activePreview = previewTab === "tp" ? tpPreview : slPreview;
  const activeDecreaseAmounts = activePreview.decreaseAmounts;
  const activeNextPositionValues = activePreview.nextPositionValues;
  const activeFees = activePreview.fees;
  const activeReceiveDisplay = activePreview.receiveDisplay;
  const activeTriggerPrice = activeDecreaseAmounts?.triggerPrice ?? activePreview.triggerPrice;
  const hasPreviewData = Boolean(tpDecreaseAmounts || slDecreaseAmounts);

  const netPriceImpactAndFeesDisplay = useMemo(() => {
    if (!activeFees) {
      return {
        formattedPriceImpactPercentage: "-",
        formattedTotalFeePercentage: "-",
        isPriceImpactPositive: false,
        isTotalFeePositive: false,
      };
    }

    const priceImpactPercentage = getCappedPriceImpactPercentageFromFees({ fees: activeFees, isSwap: false });
    const formattedPriceImpactPercentage =
      priceImpactPercentage === undefined
        ? "..."
        : formatPercentage(priceImpactPercentage, { bps: false, signed: true, displayDecimals: 3 });
    const isPriceImpactPositive = priceImpactPercentage !== undefined && priceImpactPercentage > 0n;

    const feesPercentage = activeFees.positionFee?.precisePercentage ?? 0n;
    const formattedTotalFeePercentage = formatPercentage(feesPercentage, {
      bps: false,
      signed: true,
      displayDecimals: 3,
    });
    const isTotalFeePositive = feesPercentage > 0n;

    return {
      formattedPriceImpactPercentage,
      formattedTotalFeePercentage,
      isPriceImpactPositive,
      isTotalFeePositive,
    };
  }, [activeFees]);

  const formattedMaxCloseSize = formatAmount(position.sizeInUsd, USD_DECIMALS, 2);

  const handleCloseSizeChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setCloseSizeInput(value);

      const parsedValue = parseValue(value, USD_DECIMALS);
      if (parsedValue !== undefined && parsedValue > 0n && position.sizeInUsd > 0n) {
        const percent = Number(bigMath.mulDiv(parsedValue, 100n, position.sizeInUsd));
        setClosePercentage(Math.min(100, Math.max(0, percent)));
      }
    },
    [position.sizeInUsd]
  );

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

  const handleEditTPSLSizeToggle = useCallback(
    (value: boolean) => {
      setEditTPSLSize(value);
      setClosePercentage(100);
      setCloseSizeInput(formattedMaxCloseSize);
    },
    [formattedMaxCloseSize]
  );

  const tpPriceError = useMemo(() => {
    if (markPrice === undefined) return undefined;

    const entry: SidecarSlTpOrderEntry = {
      id: "tp",
      price: tpPriceEntry,
      sizeUsd: sizeUsdEntry,
      percentage: percentageEntry,
      mode: "keepPercentage",
      order: null,
      txnType: tpPriceEntry.value ? "create" : null,
      decreaseAmounts: undefined,
      increaseAmounts: undefined,
    };

    return (
      handleEntryError(entry, "tp", {
        liqPrice: position.liquidationPrice,
        entryPrice: position.entryPrice,
        markPrice,
        isLong,
        isLimit: false,
        isExistingPosition: true,
      }).price.error ?? undefined
    );
  }, [markPrice, tpPriceEntry, sizeUsdEntry, percentageEntry, position.liquidationPrice, position.entryPrice, isLong]);

  const slPriceError = useMemo(() => {
    if (markPrice === undefined) return undefined;

    const entry: SidecarSlTpOrderEntry = {
      id: "sl",
      price: slPriceEntry,
      sizeUsd: sizeUsdEntry,
      percentage: percentageEntry,
      mode: "keepPercentage",
      order: null,
      txnType: slPriceEntry.value ? "create" : null,
      decreaseAmounts: undefined,
      increaseAmounts: undefined,
    };

    return (
      handleEntryError(entry, "sl", {
        liqPrice: position.liquidationPrice,
        entryPrice: position.entryPrice,
        markPrice,
        isLong,
        isLimit: false,
        isExistingPosition: true,
      }).price.error ?? undefined
    );
  }, [markPrice, slPriceEntry, sizeUsdEntry, percentageEntry, position.liquidationPrice, position.entryPrice, isLong]);

  const orderPayloads = useMemo((): CreateOrderTxnParams<DecreasePositionOrderParams>[] => {
    if (!account || !marketInfo || !collateralToken) {
      return [];
    }

    const tpCreateAmounts = tpPriceError ? undefined : tpDecreaseAmounts;
    const slCreateAmounts = slPriceError ? undefined : slDecreaseAmounts;

    if (!tpCreateAmounts && !slCreateAmounts) {
      return [];
    }

    if ((tpCreateAmounts && !tpExecutionFee) || (slCreateAmounts && !slExecutionFee)) {
      return [];
    }

    const autoCancelOrdersLimitForModal = autoCancelOrdersLimit > 0 ? 2 : 0;

    return buildTpSlCreatePayloads({
      autoCancelOrdersLimit: autoCancelOrdersLimitForModal,
      chainId,
      account,
      marketAddress: marketInfo.marketTokenAddress,
      indexTokenAddress: marketInfo.indexTokenAddress,
      collateralTokenAddress: collateralToken.address,
      isLong,
      entries: [
        {
          amounts: tpCreateAmounts,
          executionFeeAmount: tpExecutionFee?.feeTokenAmount,
          executionGasLimit: tpExecutionFee?.gasLimit,
        },
        {
          amounts: slCreateAmounts,
          executionFeeAmount: slExecutionFee?.feeTokenAmount,
          executionGasLimit: slExecutionFee?.gasLimit,
        },
      ],
      userReferralCode: userReferralInfo?.referralCodeForTxn,
    });
  }, [
    tpDecreaseAmounts,
    slDecreaseAmounts,
    account,
    marketInfo,
    chainId,
    collateralToken,
    userReferralInfo?.referralCodeForTxn,
    autoCancelOrdersLimit,
    isLong,
    tpPriceError,
    slPriceError,
    tpExecutionFee,
    slExecutionFee,
  ]);

  const batchParams = useMemo(() => {
    if (orderPayloads.length === 0) return undefined;
    return {
      createOrderParams: orderPayloads,
      updateOrderParams: [],
      cancelOrderParams: [],
    };
  }, [orderPayloads]);

  const totalExecutionFee = useMemo(() => {
    if (!batchParams || !tokensData) return undefined;

    return getBatchTotalExecutionFee({ batchParams, chainId, tokensData });
  }, [batchParams, chainId, tokensData]);

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
      setPreviewTab("tp");
    }
  }, [isVisible]);

  useEffect(() => {
    if (tpDecreaseAmounts && !slDecreaseAmounts) {
      setPreviewTab("tp");
    } else if (!tpDecreaseAmounts && slDecreaseAmounts) {
      setPreviewTab("sl");
    }
  }, [tpDecreaseAmounts, slDecreaseAmounts]);

  const positionTitle = `${position.isLong ? t`Long` : t`Short`} ${indexToken.symbol}`;

  const currentLeverage = formatLeverage(position.leverage);
  const nextLeverage = activeNextPositionValues?.nextLeverage;

  const leverageValue: ReactNode = useMemo(() => {
    if (activeDecreaseAmounts?.isFullClose) {
      return t`NA`;
    }

    if (activeDecreaseAmounts?.sizeDeltaUsd === position.sizeInUsd) {
      return "-";
    }

    if (activeDecreaseAmounts?.sizeDeltaUsd && activeDecreaseAmounts.sizeDeltaUsd > 0n) {
      return <ValueTransition from={currentLeverage} to={formatLeverage(nextLeverage)} />;
    }

    return currentLeverage;
  }, [
    activeDecreaseAmounts?.isFullClose,
    activeDecreaseAmounts?.sizeDeltaUsd,
    currentLeverage,
    nextLeverage,
    position.sizeInUsd,
  ]);

  const tpSlOptions = useMemo(() => {
    const options: { value: "tp" | "sl"; label: React.ReactNode }[] = [];
    if (tpDecreaseAmounts) {
      options.push({ value: "tp", label: <Trans>Take Profit</Trans> });
    }
    if (slDecreaseAmounts) {
      options.push({ value: "sl", label: <Trans>Stop Loss</Trans> });
    }
    return options;
  }, [tpDecreaseAmounts, slDecreaseAmounts]);

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }

    setIsVisible(false);
  }, [onBack, setIsVisible]);

  return (
    <Modal
      isVisible={isVisible}
      setIsVisible={setIsVisible}
      label={<Trans>TP/SL: {positionTitle} Decrease</Trans>}
      onBack={onBack ? handleBack : undefined}
      withMobileBottomPosition
      contentPadding={false}
    >
      <div className="mt-12 flex flex-col gap-16 border-t-1/2 border-slate-600 px-20 py-16">
        <div className="flex flex-col gap-4">
          <TPSLInputRow
            type="takeProfit"
            priceValue={tpPriceInput}
            onPriceChange={setTpPriceInput}
            positionData={tpPositionData}
            priceError={tpPriceError}
            variant="full"
            defaultDisplayMode="percentage"
            estimatedPnl={tpEstimatedPnl}
          />
        </div>

        <div className="flex flex-col gap-4">
          <TPSLInputRow
            type="stopLoss"
            priceValue={slPriceInput}
            onPriceChange={setSlPriceInput}
            positionData={slPositionData}
            priceError={slPriceError}
            variant="full"
            defaultDisplayMode="percentage"
            estimatedPnl={slEstimatedPnl}
          />
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
            <MarginPercentageSlider value={closePercentage} onChange={handleSliderChange} />
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

        {hasPreviewData && (
          <div className="flex flex-col gap-12">
            {tpSlOptions.length > 1 && (
              <Tabs options={tpSlOptions} selectedValue={previewTab} onChange={setPreviewTab} type="block" />
            )}

            {activeDecreaseAmounts && (
              <div className="flex flex-col gap-10">
                <SyntheticsInfoRow
                  label={<Trans>Receive</Trans>}
                  value={
                    activeReceiveDisplay ? (
                      <span className="numbers">
                        {activeReceiveDisplay.text}{" "}
                        <span className="text-typography-secondary">({activeReceiveDisplay.usd})</span>
                      </span>
                    ) : (
                      "-"
                    )
                  }
                />
                <SyntheticsInfoRow
                  label={<Trans>Liquidation Price</Trans>}
                  value={
                    <ValueTransition
                      from={formatLiquidationPrice(position.liquidationPrice, {
                        displayDecimals: priceDecimals,
                        visualMultiplier,
                      })}
                      to={
                        activeDecreaseAmounts.isFullClose
                          ? "-"
                          : activeDecreaseAmounts.sizeDeltaUsd > 0n
                            ? formatLiquidationPrice(activeNextPositionValues?.nextLiqPrice, {
                                displayDecimals: priceDecimals,
                                visualMultiplier,
                              })
                            : undefined
                      }
                    />
                  }
                />
                <SyntheticsInfoRow
                  label={<Trans>PnL</Trans>}
                  value={
                    <ValueTransition
                      from={formatDeltaUsd(
                        activeDecreaseAmounts?.estimatedPnl,
                        activeDecreaseAmounts?.estimatedPnlPercentage
                      )}
                      to={formatDeltaUsd(
                        activeNextPositionValues?.nextPnl,
                        activeNextPositionValues?.nextPnlPercentage
                      )}
                    />
                  }
                />
                <SyntheticsInfoRow
                  label={<Trans>Net Price Impact / Fees</Trans>}
                  value={
                    activeFees ? (
                      <>
                        <span
                          className={cx({
                            "text-green-500": netPriceImpactAndFeesDisplay.isPriceImpactPositive,
                          })}
                        >
                          {netPriceImpactAndFeesDisplay.formattedPriceImpactPercentage}
                        </span>{" "}
                        /{" "}
                        <span
                          className={cx({
                            "text-green-500": netPriceImpactAndFeesDisplay.isTotalFeePositive,
                          })}
                        >
                          {netPriceImpactAndFeesDisplay.formattedTotalFeePercentage}
                        </span>
                      </>
                    ) : (
                      "-"
                    )
                  }
                />
              </div>
            )}
          </div>
        )}

        <ExpandableRow
          title={t`Execution Details`}
          open={executionDetailsOpen}
          onToggle={setExecutionDetailsOpen}
          contentClassName="flex flex-col gap-10"
          wrapped
        >
          <ExitPriceRow price={activeTriggerPrice} isLong={isLong} isSwap={false} fees={activeFees} />
          <TradeFeesRow {...(activeFees || {})} feesType="decrease" />
          <NetworkFeeRow executionFee={totalExecutionFee} />
          {breakdownNetPriceImpactEnabled && (
            <SyntheticsInfoRow
              label={t`Stored Price Impact`}
              value={
                activeNextPositionValues?.nextPendingImpactDeltaUsd !== undefined &&
                position?.pendingImpactUsd !== undefined ? (
                  <ValueTransition
                    from={formatDeltaUsd(position?.pendingImpactUsd)}
                    to={formatDeltaUsd(activeNextPositionValues?.nextPendingImpactDeltaUsd)}
                  />
                ) : (
                  formatDeltaUsd(activeNextPositionValues?.nextPendingImpactDeltaUsd)
                )
              }
              valueClassName="numbers"
            />
          )}
          <SyntheticsInfoRow label={<Trans>Leverage</Trans>} value={leverageValue} />
          <SyntheticsInfoRow
            label={<Trans>Size</Trans>}
            value={
              <ValueTransition
                from={formatUsd(position.sizeInUsd)}
                to={formatUsd(activeNextPositionValues?.nextSizeUsd)}
              />
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
                from={formatUsd(position.collateralUsd)}
                to={formatUsd(activeNextPositionValues?.nextCollateralUsd)}
              />
            }
          />
        </ExpandableRow>
      </div>
    </Modal>
  );
}
