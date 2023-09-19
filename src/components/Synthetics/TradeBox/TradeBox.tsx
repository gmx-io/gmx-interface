import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Checkbox from "components/Checkbox/Checkbox";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { LeverageSlider } from "components/LeverageSlider/LeverageSlider";
import { MarketSelector } from "components/MarketSelector/MarketSelector";
import { ConfirmationBox } from "components/Synthetics/ConfirmationBox/ConfirmationBox";
import Tab from "components/Tab/Tab";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import TokenSelector from "components/TokenSelector/TokenSelector";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import { getKeepLeverageKey, getLeverageEnabledKey, getLeverageKey } from "config/localStorage";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useUserReferralInfo } from "domain/referrals/hooks";
import {
  estimateExecuteDecreaseOrderGasLimit,
  estimateExecuteIncreaseOrderGasLimit,
  estimateExecuteSwapOrderGasLimit,
  getExecutionFee,
  useGasLimits,
  useGasPrice,
} from "domain/synthetics/fees";
import {
  MarketInfo,
  MarketsInfoData,
  getAvailableUsdLiquidityForPosition,
  getMarketIndexName,
} from "domain/synthetics/markets";
import { OrderInfo, OrderType, OrdersInfoData } from "domain/synthetics/orders";
import {
  PositionInfo,
  PositionsInfoData,
  formatAcceptablePrice,
  formatLeverage,
  formatLiquidationPrice,
  usePositionsConstants,
} from "domain/synthetics/positions";
import { TokenData, TokensData, TokensRatio, convertToUsd, getTokensRatioByPrice } from "domain/synthetics/tokens";
import {
  AvailableTokenOptions,
  SwapAmounts,
  TradeFeesType,
  TradeMode,
  TradeType,
  TriggerThresholdType,
  getDecreasePositionAmounts,
  getIncreasePositionAmounts,
  getMarkPrice,
  getNextPositionValuesForDecreaseTrade,
  getNextPositionValuesForIncreaseTrade,
  getSwapAmountsByFromValue,
  getSwapAmountsByToValue,
  getTradeFees,
  useSwapRoutes,
} from "domain/synthetics/trade";
import { useAvailableMarketsOptions } from "domain/synthetics/trade/useAvailableMarketsOptions";
import { TradeFlags } from "domain/synthetics/trade/useTradeFlags";
import {
  getCommonError,
  getDecreaseError,
  getIncreaseError,
  getSwapError,
} from "domain/synthetics/trade/utils/validation";
import { BigNumber } from "ethers";
import longImg from "img/long.svg";
import shortImg from "img/short.svg";
import swapImg from "img/swap.svg";
import { useChainId } from "lib/chains";
import { DUST_BNB, USD_DECIMALS } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import {
  formatAmount,
  formatAmountFree,
  formatDeltaUsd,
  formatPercentage,
  formatTokenAmount,
  formatTokenAmountWithUsd,
  formatUsd,
  limitDecimals,
  parseValue,
} from "lib/numbers";
import { useSafeState } from "lib/useSafeState";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AiOutlineEdit } from "react-icons/ai";
import { IoMdSwap } from "react-icons/io";
import { usePrevious } from "react-use";
import { ClaimableCard } from "../ClaimableCard/ClaimableCard";
import { MarketCard } from "../MarketCard/MarketCard";
import { SwapCard } from "../SwapCard/SwapCard";
import { TradeFeesRow } from "../TradeFeesRow/TradeFeesRow";
import { CollateralSelectorRow } from "./CollateralSelectorRow";
import { MarketPoolSelectorRow } from "./MarketPoolSelectorRow";
import "./TradeBox.scss";
import { useHasOutdatedUi } from "domain/legacy";
import useWallet from "lib/wallets/useWallet";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import TokenWithIcon from "components/TokenIcon/TokenWithIcon";
import useIsMetamaskMobile from "lib/wallets/useIsMetamaskMobile";
import { MAX_METAMASK_MOBILE_DECIMALS } from "config/ui";

export type Props = {
  tradeType: TradeType;
  tradeMode: TradeMode;
  availableTradeModes: TradeMode[];
  tradeFlags: TradeFlags;
  isWrapOrUnwrap: boolean;
  fromTokenAddress?: string;
  fromToken?: TokenData;
  toTokenAddress?: string;
  toToken?: TokenData;
  marketAddress?: string;
  marketInfo?: MarketInfo;
  collateralAddress?: string;
  collateralToken?: TokenData;
  avaialbleTokenOptions: AvailableTokenOptions;
  existingPosition?: PositionInfo;
  existingOrder?: OrderInfo;
  positionsInfo?: PositionsInfoData;
  ordersInfo?: OrdersInfoData;
  allowedSlippage: number;
  acceptablePriceImpactBpsForLimitOrders: BigNumber;
  savedIsPnlInLeverage: boolean;
  isHigherSlippageAllowed: boolean;
  shouldDisableValidation?: boolean;
  marketsInfoData?: MarketsInfoData;
  tokensData?: TokensData;
  setIsHigherSlippageAllowed: (value: boolean) => void;
  onSelectFromTokenAddress: (fromTokenAddress?: string) => void;
  onSelectToTokenAddress: (toTokenAddress?: string) => void;
  onSelectTradeType: (tradeType: TradeType) => void;
  onSelectTradeMode: (tradeMode: TradeMode) => void;
  setPendingTxns: (txns: any) => void;
  onSelectMarketAddress: (marketAddress?: string) => void;
  onSelectCollateralAddress: (collateralAddress?: string) => void;
  setIsEditingAcceptablePriceImpact: (val: boolean) => void;
  setIsClaiming: (val: boolean) => void;
  switchTokenAddresses: () => void;
};

const tradeTypeIcons = {
  [TradeType.Long]: longImg,
  [TradeType.Short]: shortImg,
  [TradeType.Swap]: swapImg,
};

export function TradeBox(p: Props) {
  const {
    tradeMode,
    tradeType,
    tradeFlags,
    availableTradeModes,
    isWrapOrUnwrap,
    tokensData,
    fromTokenAddress,
    fromToken,
    toTokenAddress,
    toToken,
    marketAddress,
    marketInfo,
    collateralAddress,
    collateralToken,
    avaialbleTokenOptions,
    savedIsPnlInLeverage,
    positionsInfo,
    existingPosition,
    existingOrder,
    ordersInfo,
    shouldDisableValidation,
    acceptablePriceImpactBpsForLimitOrders,
    allowedSlippage,
    isHigherSlippageAllowed,
    marketsInfoData,
    setIsHigherSlippageAllowed,
    onSelectMarketAddress,
    onSelectCollateralAddress,
    onSelectFromTokenAddress,
    onSelectToTokenAddress,
    onSelectTradeMode,
    onSelectTradeType,
    setIsEditingAcceptablePriceImpact,
    setIsClaiming,
    setPendingTxns,
    switchTokenAddresses,
  } = p;
  const { isLong, isSwap, isIncrease, isPosition, isLimit, isTrigger, isMarket } = tradeFlags;
  const { openConnectModal } = useConnectModal();
  const {
    swapTokens,
    indexTokens,
    infoTokens,
    sortedIndexTokensWithPoolValue,
    sortedLongAndShortTokens,
    sortedAllMarkets,
  } = avaialbleTokenOptions;

  const tradeTypeLabels = useMemo(() => {
    return {
      [TradeType.Long]: t`Long`,
      [TradeType.Short]: t`Short`,
      [TradeType.Swap]: t`Swap`,
    };
  }, []);

  const tradeModeLabels = {
    [TradeMode.Market]: t`Market`,
    [TradeMode.Limit]: t`Limit`,
    [TradeMode.Trigger]: t`Trigger`,
  };

  const { chainId } = useChainId();
  const { signer, account } = useWallet();
  const isMetamaskMobile = useIsMetamaskMobile();
  const { gasPrice } = useGasPrice(chainId);
  const { gasLimits } = useGasLimits(chainId);
  const userReferralInfo = useUserReferralInfo(signer, chainId, account);
  const { showDebugValues } = useSettings();
  const { data: hasOutdatedUi } = useHasOutdatedUi();

  const { minCollateralUsd, minPositionSizeUsd } = usePositionsConstants(chainId);

  const [stage, setStage] = useState<"trade" | "confirmation" | "processing">("trade");
  const [focusedInput, setFocusedInput] = useState<"from" | "to">();

  const [fixedTriggerThresholdType, setFixedTriggerThresholdType] = useState<TriggerThresholdType>();
  const [fixedTriggerOrderType, setFixedTriggerOrderType] = useState<
    OrderType.LimitDecrease | OrderType.StopLossDecrease
  >();
  const [fixedTriggerAcceptablePrice, setFixedTriggerAcceptablePrice] = useState<BigNumber>();

  const [fromTokenInputValue, setFromTokenInputValue] = useSafeState("");
  const fromTokenAmount = fromToken ? parseValue(fromTokenInputValue || "0", fromToken.decimals)! : BigNumber.from(0);
  const fromTokenPrice = fromToken?.prices.minPrice;
  const fromUsd = convertToUsd(fromTokenAmount, fromToken?.decimals, fromTokenPrice);
  const isNotMatchAvailableBalance = fromToken?.balance?.gt(0) && !fromToken.balance.eq(fromTokenAmount);

  const [toTokenInputValue, setToTokenInputValue] = useSafeState("");
  const toTokenAmount = toToken ? parseValue(toTokenInputValue || "0", toToken.decimals)! : BigNumber.from(0);

  const markPrice = useMemo(() => {
    if (!toToken) {
      return undefined;
    }

    if (isSwap) {
      return toToken.prices.minPrice;
    }

    return getMarkPrice({ prices: toToken.prices, isIncrease, isLong });
  }, [isIncrease, isLong, isSwap, toToken]);

  const [closeSizeInputValue, setCloseSizeInputValue] = useState("");
  const closeSizeUsd = parseValue(closeSizeInputValue || "0", USD_DECIMALS)!;

  const [triggerPriceInputValue, setTriggerPriceInputValue] = useState<string>("");
  const triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);

  const [triggerRatioInputValue, setTriggerRatioInputValue] = useState<string>("");
  const { markRatio, triggerRatio } = useMemo(() => {
    if (!isSwap || !fromToken || !toToken || !fromTokenPrice || !markPrice) {
      return {};
    }

    const markRatio = getTokensRatioByPrice({
      fromToken,
      toToken,
      fromPrice: fromTokenPrice,
      toPrice: markPrice,
    });

    const triggerRatioValue = parseValue(triggerRatioInputValue, USD_DECIMALS);

    if (!triggerRatioValue) {
      return { markRatio };
    }

    const triggerRatio: TokensRatio = {
      ratio: triggerRatioValue?.gt(0) ? triggerRatioValue : markRatio.ratio,
      largestToken: markRatio.largestToken,
      smallestToken: markRatio.smallestToken,
    };

    return {
      markRatio,
      triggerRatio,
    };
  }, [fromToken, fromTokenPrice, isSwap, markPrice, toToken, triggerRatioInputValue]);

  const [leverageOption, setLeverageOption] = useLocalStorageSerializeKey(getLeverageKey(chainId), 2);
  const leverage = BigNumber.from(parseInt(String(Number(leverageOption!) * BASIS_POINTS_DIVISOR)));

  const [isLeverageEnabled, setIsLeverageEnabled] = useLocalStorageSerializeKey(getLeverageEnabledKey(chainId), true);
  const [keepLeverage, setKeepLeverage] = useLocalStorageSerializeKey(getKeepLeverageKey(chainId), true);

  const swapRoute = useSwapRoutes({
    marketsInfoData,
    fromTokenAddress,
    toTokenAddress: isPosition ? collateralAddress : toTokenAddress,
  });

  const swapAmounts = useMemo(() => {
    if (!isSwap || !fromToken || !toToken || !fromTokenPrice) {
      return undefined;
    }

    if (isWrapOrUnwrap) {
      const tokenAmount = focusedInput === "from" ? fromTokenAmount : toTokenAmount;
      const usdAmount = convertToUsd(tokenAmount, fromToken.decimals, fromTokenPrice)!;
      const price = fromTokenPrice;

      const swapAmounts: SwapAmounts = {
        amountIn: tokenAmount,
        usdIn: usdAmount!,
        amountOut: tokenAmount,
        usdOut: usdAmount!,
        swapPathStats: undefined,
        priceIn: price,
        priceOut: price,
        minOutputAmount: tokenAmount,
      };

      return swapAmounts;
    } else if (focusedInput === "from") {
      return getSwapAmountsByFromValue({
        tokenIn: fromToken,
        tokenOut: toToken,
        amountIn: fromTokenAmount,
        triggerRatio: triggerRatio || markRatio,
        isLimit,
        findSwapPath: swapRoute.findSwapPath,
      });
    } else {
      return getSwapAmountsByToValue({
        tokenIn: fromToken,
        tokenOut: toToken,
        amountOut: toTokenAmount,
        triggerRatio: triggerRatio || markRatio,
        isLimit,
        findSwapPath: swapRoute.findSwapPath,
      });
    }
  }, [
    focusedInput,
    fromToken,
    fromTokenAmount,
    fromTokenPrice,
    isLimit,
    isSwap,
    isWrapOrUnwrap,
    markRatio,
    swapRoute.findSwapPath,
    toToken,
    toTokenAmount,
    triggerRatio,
  ]);

  const increaseAmounts = useMemo(() => {
    if (!isIncrease || !toToken || !fromToken || !collateralToken || !marketInfo) {
      return undefined;
    }

    return getIncreasePositionAmounts({
      marketInfo,
      indexToken: toToken,
      initialCollateralToken: fromToken,
      collateralToken,
      isLong,
      initialCollateralAmount: fromTokenAmount,
      indexTokenAmount: toTokenAmount,
      leverage,
      triggerPrice: isLimit ? triggerPrice : undefined,
      position: existingPosition,
      savedAcceptablePriceImpactBps: acceptablePriceImpactBpsForLimitOrders,
      findSwapPath: swapRoute.findSwapPath,
      userReferralInfo,
      strategy: isLeverageEnabled
        ? focusedInput === "from"
          ? "leverageByCollateral"
          : "leverageBySize"
        : "independent",
    });
  }, [
    acceptablePriceImpactBpsForLimitOrders,
    collateralToken,
    existingPosition,
    focusedInput,
    fromToken,
    fromTokenAmount,
    isIncrease,
    isLeverageEnabled,
    isLimit,
    isLong,
    leverage,
    marketInfo,
    swapRoute.findSwapPath,
    toToken,
    toTokenAmount,
    triggerPrice,
    userReferralInfo,
  ]);

  const decreaseAmounts = useMemo(() => {
    if (!isTrigger || !closeSizeUsd || !marketInfo || !collateralToken || !minCollateralUsd || !minPositionSizeUsd) {
      return undefined;
    }

    return getDecreasePositionAmounts({
      marketInfo,
      collateralToken,
      isLong,
      position: existingPosition,
      closeSizeUsd: closeSizeUsd,
      keepLeverage: keepLeverage!,
      triggerPrice,
      savedAcceptablePriceImpactBps: acceptablePriceImpactBpsForLimitOrders,
      userReferralInfo,
      minCollateralUsd,
      minPositionSizeUsd,
    });
  }, [
    acceptablePriceImpactBpsForLimitOrders,
    closeSizeUsd,
    collateralToken,
    existingPosition,
    isLong,
    isTrigger,
    keepLeverage,
    marketInfo,
    minCollateralUsd,
    minPositionSizeUsd,
    triggerPrice,
    userReferralInfo,
  ]);

  const nextPositionValues = useMemo(() => {
    if (!isPosition || !minCollateralUsd || !marketInfo || !collateralToken) {
      return undefined;
    }

    if (isIncrease && increaseAmounts?.acceptablePrice && fromTokenAmount.gt(0)) {
      return getNextPositionValuesForIncreaseTrade({
        marketInfo,
        collateralToken,
        existingPosition,
        isLong,
        collateralDeltaUsd: increaseAmounts.collateralDeltaUsd,
        collateralDeltaAmount: increaseAmounts.collateralDeltaAmount,
        sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
        sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens,
        indexPrice: increaseAmounts.indexPrice,
        showPnlInLeverage: savedIsPnlInLeverage,
        minCollateralUsd,
        userReferralInfo,
      });
    }

    if (isTrigger && decreaseAmounts?.acceptablePrice && closeSizeUsd.gt(0)) {
      return getNextPositionValuesForDecreaseTrade({
        existingPosition,
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
        showPnlInLeverage: savedIsPnlInLeverage,
        isLong,
        minCollateralUsd,
        userReferralInfo,
      });
    }
  }, [
    closeSizeUsd,
    collateralToken,
    decreaseAmounts,
    existingPosition,
    fromTokenAmount,
    increaseAmounts,
    isIncrease,
    isLong,
    isPosition,
    isTrigger,
    marketInfo,
    minCollateralUsd,
    savedIsPnlInLeverage,
    userReferralInfo,
  ]);

  // useDebugExecutionPrice(chainId, {
  //   skip: false,
  //   marketInfo,
  //   sizeInUsd: existingPosition?.sizeInUsd || BigNumber.from(0),
  //   sizeInTokens: existingPosition?.sizeInTokens || BigNumber.from(0),
  //   sizeDeltaUsd: increaseAmounts?.sizeDeltaUsd,
  //   isLong,
  // });

  const { fees, feesType, executionFee } = useMemo(() => {
    if (!gasLimits || !gasPrice || !tokensData) {
      return {};
    }

    if (isSwap && swapAmounts?.swapPathStats) {
      const estimatedGas = estimateExecuteSwapOrderGasLimit(gasLimits, {
        swapPath: swapAmounts.swapPathStats.swapPath,
      });

      return {
        fees: getTradeFees({
          isIncrease: false,
          initialCollateralUsd: swapAmounts.usdIn,
          sizeDeltaUsd: BigNumber.from(0),
          swapSteps: swapAmounts.swapPathStats.swapSteps,
          positionFeeUsd: BigNumber.from(0),
          swapPriceImpactDeltaUsd: swapAmounts.swapPathStats.totalSwapPriceImpactDeltaUsd,
          positionPriceImpactDeltaUsd: BigNumber.from(0),
          borrowingFeeUsd: BigNumber.from(0),
          fundingFeeUsd: BigNumber.from(0),
          feeDiscountUsd: BigNumber.from(0),
          swapProfitFeeUsd: BigNumber.from(0),
        }),
        executionFee: getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice),
        feesType: "swap" as TradeFeesType,
      };
    }

    if (isIncrease && increaseAmounts) {
      const estimatedGas = estimateExecuteIncreaseOrderGasLimit(gasLimits, {
        swapPath: increaseAmounts.swapPathStats?.swapPath || [],
      });

      return {
        fees: getTradeFees({
          isIncrease: true,
          initialCollateralUsd: increaseAmounts.initialCollateralUsd,
          sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
          swapSteps: increaseAmounts.swapPathStats?.swapSteps || [],
          positionFeeUsd: increaseAmounts.positionFeeUsd,
          swapPriceImpactDeltaUsd: increaseAmounts.swapPathStats?.totalSwapPriceImpactDeltaUsd || BigNumber.from(0),
          positionPriceImpactDeltaUsd: increaseAmounts.positionPriceImpactDeltaUsd,
          borrowingFeeUsd: existingPosition?.pendingBorrowingFeesUsd || BigNumber.from(0),
          fundingFeeUsd: existingPosition?.pendingFundingFeesUsd || BigNumber.from(0),
          feeDiscountUsd: increaseAmounts.feeDiscountUsd,
          swapProfitFeeUsd: BigNumber.from(0),
        }),
        executionFee: getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice),
        feesType: "increase" as TradeFeesType,
      };
    }

    if (isTrigger && decreaseAmounts) {
      const estimatedGas = estimateExecuteDecreaseOrderGasLimit(gasLimits, {});

      return {
        fees: getTradeFees({
          isIncrease: false,
          initialCollateralUsd: existingPosition?.collateralUsd || BigNumber.from(0),
          sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
          swapSteps: [],
          positionFeeUsd: decreaseAmounts.positionFeeUsd,
          swapPriceImpactDeltaUsd: BigNumber.from(0),
          positionPriceImpactDeltaUsd: decreaseAmounts.positionPriceImpactDeltaUsd,
          borrowingFeeUsd: decreaseAmounts.borrowingFeeUsd,
          fundingFeeUsd: decreaseAmounts.fundingFeeUsd,
          feeDiscountUsd: decreaseAmounts.feeDiscountUsd,
          swapProfitFeeUsd: decreaseAmounts.swapProfitFeeUsd,
        }),
        executionFee: getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice),
        feesType: "decrease" as TradeFeesType,
      };
    }

    return {};
  }, [
    chainId,
    decreaseAmounts,
    existingPosition,
    gasLimits,
    gasPrice,
    increaseAmounts,
    isIncrease,
    isSwap,
    isTrigger,
    swapAmounts,
    tokensData,
  ]);

  const marketsOptions = useAvailableMarketsOptions({
    marketsInfoData,
    isIncrease,
    disable: !isPosition,
    indexToken: toToken,
    isLong,
    increaseSizeUsd: increaseAmounts?.sizeDeltaUsd,
    positionsInfo,
    ordersInfo,
    hasExistingOrder: Boolean(existingOrder),
    hasExistingPosition: Boolean(existingPosition),
  });
  const { availableMarkets } = marketsOptions;

  const availableCollaterals = useMemo(() => {
    if (!marketInfo) {
      return [];
    }

    if (marketInfo.isSameCollaterals) {
      return [marketInfo.longToken];
    }

    return [marketInfo.longToken, marketInfo.shortToken];
  }, [marketInfo]);

  const swapOutLiquidity = swapRoute.maxSwapLiquidity;

  const { longLiquidity, shortLiquidity, isOutPositionLiquidity } = useMemo(() => {
    if (!marketInfo || !isIncrease) {
      return {};
    }
    const longLiquidity = getAvailableUsdLiquidityForPosition(marketInfo, true);
    const shortLiquidity = getAvailableUsdLiquidityForPosition(marketInfo, false);

    const isOutPositionLiquidity = isLong
      ? longLiquidity.lt(increaseAmounts?.sizeDeltaUsd || 0)
      : shortLiquidity.lt(increaseAmounts?.sizeDeltaUsd || 0);

    return {
      longLiquidity,
      shortLiquidity,
      isOutPositionLiquidity,
    };
  }, [increaseAmounts, isIncrease, isLong, marketInfo]);

  const error = useMemo(() => {
    const commonError = getCommonError({
      chainId,
      isConnected: Boolean(account),
      hasOutdatedUi,
    });

    let tradeError: string[] | undefined[] = [undefined];

    if (isSwap) {
      tradeError = getSwapError({
        fromToken,
        toToken,
        fromTokenAmount,
        fromUsd: swapAmounts?.usdIn,
        toTokenAmount,
        toUsd: swapAmounts?.usdOut,
        swapPathStats: swapAmounts?.swapPathStats,
        swapLiquidity: swapOutLiquidity,
        isLimit,
        isWrapOrUnwrap,
        triggerRatio,
        markRatio,
        fees,
      });
    } else if (isIncrease) {
      tradeError = getIncreaseError({
        marketInfo,
        indexToken: toToken,
        initialCollateralToken: fromToken,
        initialCollateralAmount: fromTokenAmount,
        initialCollateralUsd: increaseAmounts?.initialCollateralUsd,
        targetCollateralToken: collateralToken,
        collateralUsd: increaseAmounts?.collateralDeltaUsd,
        sizeDeltaUsd: increaseAmounts?.sizeDeltaUsd,
        existingPosition,
        fees,
        swapPathStats: increaseAmounts?.swapPathStats,
        collateralLiquidity: swapOutLiquidity,
        minCollateralUsd,
        longLiquidity,
        shortLiquidity,
        isLong,
        markPrice,
        triggerPrice,
        isLimit,
        nextPositionValues,
      });
    } else if (isTrigger) {
      tradeError = getDecreaseError({
        marketInfo,
        inputSizeUsd: closeSizeUsd,
        sizeDeltaUsd: decreaseAmounts?.sizeDeltaUsd,
        triggerPrice,
        markPrice,
        existingPosition,
        isContractAccount: false,
        receiveToken: existingPosition?.collateralToken,
        nextPositionValues,
        isLong,
        isTrigger: true,
        minCollateralUsd,
        isNotEnoughReceiveTokenLiquidity: false,
        fixedTriggerThresholdType: stage === "confirmation" ? fixedTriggerThresholdType : undefined,
      });
    }

    return commonError[0] || tradeError[0];
  }, [
    chainId,
    account,
    hasOutdatedUi,
    isSwap,
    isIncrease,
    isTrigger,
    fromToken,
    toToken,
    fromTokenAmount,
    swapAmounts,
    toTokenAmount,
    swapOutLiquidity,
    isLimit,
    isWrapOrUnwrap,
    triggerRatio,
    markRatio,
    fees,
    marketInfo,
    increaseAmounts,
    collateralToken,
    existingPosition,
    minCollateralUsd,
    longLiquidity,
    shortLiquidity,
    isLong,
    markPrice,
    triggerPrice,
    nextPositionValues,
    closeSizeUsd,
    decreaseAmounts?.sizeDeltaUsd,
    stage,
    fixedTriggerThresholdType,
  ]);

  const isSubmitButtonDisabled = useMemo(() => {
    if (!account) {
      return false;
    }
    if (error) {
      return true;
    }
  }, [error, account]);

  const submitButtonText = useMemo(() => {
    if (error) {
      return error;
    }

    if (isMarket) {
      if (isSwap) {
        return t`Swap ${fromToken?.symbol}`;
      } else {
        return `${tradeTypeLabels[tradeType!]} ${toToken?.symbol}`;
      }
    } else if (isLimit) {
      return t`Create Limit order`;
    } else {
      return t`Create Trigger order`;
    }
  }, [error, fromToken?.symbol, isLimit, isMarket, isSwap, toToken?.symbol, tradeType, tradeTypeLabels]);

  function onSubmit() {
    if (!account) {
      openConnectModal?.();
      return;
    }

    if (
      isTrigger &&
      decreaseAmounts?.triggerThresholdType &&
      decreaseAmounts?.triggerOrderType &&
      decreaseAmounts.acceptablePrice
    ) {
      setFixedTriggerOrderType(decreaseAmounts.triggerOrderType);
      setFixedTriggerThresholdType(decreaseAmounts.triggerThresholdType);
      setFixedTriggerAcceptablePrice(decreaseAmounts.acceptablePrice);
    }

    setStage("confirmation");
  }

  const prevIsISwap = usePrevious(isSwap);

  useEffect(
    function updateInputAmounts() {
      if (!fromToken || !toToken || (!isSwap && !isIncrease)) {
        return;
      }

      // reset input values when switching between swap and position tabs
      if (isSwap !== prevIsISwap) {
        setFocusedInput("from");
        setFromTokenInputValue("");
        return;
      }

      if (isSwap && swapAmounts) {
        if (focusedInput === "from") {
          setToTokenInputValue(
            swapAmounts.amountOut.gt(0) ? formatAmountFree(swapAmounts.amountOut, toToken.decimals) : ""
          );
        } else {
          setFromTokenInputValue(
            swapAmounts.amountIn.gt(0) ? formatAmountFree(swapAmounts.amountIn, fromToken.decimals) : ""
          );
        }
      }

      if (isIncrease && increaseAmounts) {
        if (focusedInput === "from") {
          setToTokenInputValue(
            increaseAmounts.indexTokenAmount?.gt(0)
              ? formatAmountFree(increaseAmounts.indexTokenAmount, toToken.decimals)
              : ""
          );
        } else {
          setFromTokenInputValue(
            increaseAmounts.initialCollateralAmount.gt(0)
              ? formatAmountFree(increaseAmounts.initialCollateralAmount, fromToken.decimals)
              : ""
          );
        }
      }
    },
    [
      focusedInput,
      fromToken,
      increaseAmounts,
      isIncrease,
      isSwap,
      prevIsISwap,
      setFromTokenInputValue,
      setToTokenInputValue,
      swapAmounts,
      toToken,
    ]
  );

  useEffect(
    function updatePositionMarket() {
      if (!isPosition || !marketsOptions.availableMarkets) {
        return;
      }

      const needUpdateMarket =
        !marketAddress || !marketsOptions.availableMarkets.find((m) => m.marketTokenAddress === marketAddress);

      if (needUpdateMarket && marketsOptions.marketWithPosition) {
        onSelectMarketAddress(marketsOptions.marketWithPosition.marketTokenAddress);
        return;
      }

      const optimalMarket =
        marketsOptions.minPriceImpactMarket || marketsOptions.maxLiquidityMarket || marketsOptions.availableMarkets[0];

      if (needUpdateMarket && optimalMarket) {
        onSelectMarketAddress(optimalMarket.marketTokenAddress);
        return;
      }
    },
    [
      availableMarkets,
      chainId,
      isLong,
      isPosition,
      marketAddress,
      marketsOptions.availableMarkets,
      marketsOptions.collateralWithPosition,
      marketsOptions.marketWithPosition,
      marketsOptions.maxLiquidityMarket,
      marketsOptions.minPriceImpactMarket,
      onSelectCollateralAddress,
      onSelectMarketAddress,
    ]
  );

  const prevMarketAddress = usePrevious(marketAddress);
  useEffect(
    function updatePositionCollateral() {
      if (!isPosition) {
        return;
      }

      if (marketAddress && prevMarketAddress !== marketAddress && marketsOptions.collateralWithPosition) {
        onSelectCollateralAddress(marketsOptions.collateralWithPosition.address);
      }
    },
    [isPosition, marketAddress, marketsOptions.collateralWithPosition, onSelectCollateralAddress, prevMarketAddress]
  );

  useEffect(
    function resetTriggerPrice() {
      setTriggerPriceInputValue("");
    },
    [toTokenAddress, tradeMode]
  );

  function onSwitchTokens() {
    setFocusedInput((old) => (old === "from" ? "to" : "from"));
    switchTokenAddresses();
    setFromTokenInputValue(toTokenInputValue || "");
    setToTokenInputValue(fromTokenInputValue || "");
  }

  const onConfirmationClose = useCallback(() => {
    setStage("trade");
  }, []);

  const onConfirmed = useCallback(() => {
    if (isMarket) {
      setStage("processing");
      return;
    }
    setStage("trade");
  }, [isMarket]);

  if (showDebugValues) {
    const swapPathStats = swapAmounts?.swapPathStats || increaseAmounts?.swapPathStats;

    if (swapPathStats) {
      // eslint-disable-next-line no-console
      console.log("Swap Path", {
        path: swapPathStats.swapPath.map((marketAddress) => marketsInfoData?.[marketAddress]?.name).join(" -> "),
        priceImpact: swapPathStats.swapSteps.map((step) => formatDeltaUsd(step.priceImpactDeltaUsd)).join(" -> "),
        usdOut: swapPathStats.swapSteps.map((step) => formatUsd(step.usdOut)).join(" -> "),
      });
    }
  }

  function onMaxClick() {
    if (fromToken?.balance) {
      const maxAvailableAmount = fromToken.isNative
        ? fromToken.balance.sub(BigNumber.from(DUST_BNB).mul(2))
        : fromToken.balance;
      setFocusedInput("from");
      const formattedAmount = formatAmountFree(maxAvailableAmount, fromToken.decimals);
      const finalAmount = isMetamaskMobile
        ? limitDecimals(formattedAmount, MAX_METAMASK_MOBILE_DECIMALS)
        : formattedAmount;
      setFromTokenInputValue(finalAmount);
    }
  }

  function renderTokenInputs() {
    return (
      <>
        <BuyInputSection
          topLeftLabel={t`Pay`}
          topLeftValue={fromUsd?.gt(0) ? formatUsd(isIncrease ? increaseAmounts?.initialCollateralUsd : fromUsd) : ""}
          topRightLabel={t`Balance`}
          topRightValue={formatTokenAmount(fromToken?.balance, fromToken?.decimals, "", {
            useCommas: true,
          })}
          onClickTopRightLabel={onMaxClick}
          inputValue={fromTokenInputValue}
          onInputValueChange={(e) => {
            setFocusedInput("from");
            setFromTokenInputValue(e.target.value);
          }}
          showMaxButton={isNotMatchAvailableBalance}
          onClickMax={onMaxClick}
        >
          {fromTokenAddress && (
            <TokenSelector
              label={t`Pay`}
              chainId={chainId}
              tokenAddress={fromTokenAddress}
              onSelectToken={(token) => onSelectFromTokenAddress(token.address)}
              tokens={swapTokens}
              infoTokens={infoTokens}
              className="GlpSwap-from-token"
              showSymbolImage={true}
              showTokenImgInDropdown={true}
              extendedSortSequence={sortedLongAndShortTokens}
            />
          )}
        </BuyInputSection>

        <div className="Exchange-swap-ball-container">
          <button type="button" className="Exchange-swap-ball" onClick={onSwitchTokens}>
            <IoMdSwap className="Exchange-swap-ball-icon" />
          </button>
        </div>

        {isSwap && (
          <BuyInputSection
            topLeftLabel={t`Receive`}
            topLeftValue={swapAmounts?.usdOut.gt(0) ? formatUsd(swapAmounts?.usdOut) : ""}
            topRightLabel={t`Balance`}
            topRightValue={formatTokenAmount(toToken?.balance, toToken?.decimals, "", {
              useCommas: true,
            })}
            inputValue={toTokenInputValue}
            onInputValueChange={(e) => {
              setFocusedInput("to");
              setToTokenInputValue(e.target.value);
            }}
            showMaxButton={false}
          >
            {toTokenAddress && (
              <TokenSelector
                label={t`Receive`}
                chainId={chainId}
                tokenAddress={toTokenAddress}
                onSelectToken={(token) => onSelectToTokenAddress(token.address)}
                tokens={swapTokens}
                infoTokens={infoTokens}
                className="GlpSwap-from-token"
                showSymbolImage={true}
                showBalances={true}
                showTokenImgInDropdown={true}
                extendedSortSequence={sortedLongAndShortTokens}
              />
            )}
          </BuyInputSection>
        )}

        {isIncrease && (
          <BuyInputSection
            topLeftLabel={tradeTypeLabels[tradeType!]}
            topLeftValue={
              increaseAmounts?.sizeDeltaUsd.gt(0)
                ? formatUsd(increaseAmounts?.sizeDeltaUsd, { fallbackToZero: true })
                : ""
            }
            topRightLabel={t`Leverage`}
            topRightValue={formatLeverage(isLeverageEnabled ? leverage : increaseAmounts?.estimatedLeverage) || "-"}
            inputValue={toTokenInputValue}
            onInputValueChange={(e) => {
              setFocusedInput("to");
              setToTokenInputValue(e.target.value);
            }}
            showMaxButton={false}
          >
            {toTokenAddress && (
              <TokenSelector
                label={tradeTypeLabels[tradeType!]}
                chainId={chainId}
                tokenAddress={toTokenAddress}
                onSelectToken={(token) => onSelectToTokenAddress(token.address)}
                tokens={indexTokens}
                infoTokens={infoTokens}
                className="GlpSwap-from-token"
                showSymbolImage={true}
                showBalances={false}
                showTokenImgInDropdown={true}
                extendedSortSequence={sortedIndexTokensWithPoolValue}
              />
            )}
          </BuyInputSection>
        )}
      </>
    );
  }

  function renderDecreaseSizeInput() {
    return (
      <BuyInputSection
        topLeftLabel={t`Close`}
        topRightLabel={existingPosition?.sizeInUsd ? `Max` : undefined}
        topRightValue={existingPosition?.sizeInUsd ? formatUsd(existingPosition.sizeInUsd) : undefined}
        inputValue={closeSizeInputValue}
        onInputValueChange={(e) => setCloseSizeInputValue(e.target.value)}
        onClickTopRightLabel={() => setCloseSizeInputValue(formatAmount(existingPosition?.sizeInUsd, USD_DECIMALS, 2))}
        showMaxButton={existingPosition?.sizeInUsd.gt(0) && !closeSizeUsd?.eq(existingPosition.sizeInUsd)}
        onClickMax={() => setCloseSizeInputValue(formatAmount(existingPosition?.sizeInUsd, USD_DECIMALS, 2))}
        showPercentSelector={existingPosition?.sizeInUsd.gt(0)}
        onPercentChange={(percent) =>
          setCloseSizeInputValue(formatAmount(existingPosition?.sizeInUsd.mul(percent).div(100), USD_DECIMALS, 2))
        }
      >
        USD
      </BuyInputSection>
    );
  }

  function renderTriggerPriceInput() {
    return (
      <BuyInputSection
        topLeftLabel={t`Price`}
        topRightLabel={t`Mark`}
        topRightValue={formatUsd(markPrice, {
          displayDecimals: toToken?.priceDecimals,
        })}
        onClickTopRightLabel={() => {
          setTriggerPriceInputValue(formatAmount(markPrice, USD_DECIMALS, toToken?.priceDecimals || 2));
        }}
        inputValue={triggerPriceInputValue}
        onInputValueChange={(e) => {
          setTriggerPriceInputValue(e.target.value);
        }}
      >
        USD
      </BuyInputSection>
    );
  }

  function renderTriggerRatioInput() {
    return (
      <BuyInputSection
        topLeftLabel={t`Price`}
        topRightLabel={t`Mark`}
        topRightValue={formatAmount(markRatio?.ratio, USD_DECIMALS, 4)}
        onClickTopRightLabel={() => {
          setTriggerRatioInputValue(formatAmount(markRatio?.ratio, USD_DECIMALS, 10));
        }}
        inputValue={triggerRatioInputValue}
        onInputValueChange={(e) => {
          setTriggerRatioInputValue(e.target.value);
        }}
      >
        {markRatio && (
          <>
            <TokenWithIcon symbol={markRatio.smallestToken.symbol} displaySize={20} />
             per 
            <TokenWithIcon symbol={markRatio.largestToken.symbol} displaySize={20} />
          </>
        )}
      </BuyInputSection>
    );
  }

  function renderPositionControls() {
    return (
      <>
        {isIncrease && (
          <>
            <ToggleSwitch
              className="Exchange-leverage-slider-settings"
              isChecked={isLeverageEnabled ?? false}
              setIsChecked={setIsLeverageEnabled}
            >
              <span className="muted">
                <Trans>Leverage slider</Trans>
              </span>
            </ToggleSwitch>

            {isLeverageEnabled && (
              <LeverageSlider value={leverageOption} onChange={setLeverageOption} isPositive={isLong} />
            )}
          </>
        )}
        {isTrigger && (
          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Market`}
            value={
              <MarketSelector
                label={t`Market`}
                className="SwapBox-info-dropdown"
                selectedIndexName={toToken ? getMarketIndexName({ indexToken: toToken, isSpotOnly: false }) : undefined}
                markets={sortedAllMarkets || []}
                isSideMenu
                onSelectMarket={(indexName, marketInfo) => onSelectToTokenAddress(marketInfo.indexToken.address)}
              />
            }
          />
        )}

        <MarketPoolSelectorRow
          selectedMarket={marketInfo}
          indexToken={toToken}
          marketsOptions={marketsOptions}
          hasExistingOrder={Boolean(existingOrder)}
          hasExistingPosition={Boolean(existingPosition)}
          isOutPositionLiquidity={isOutPositionLiquidity}
          currentPriceImpactBps={increaseAmounts?.acceptablePriceDeltaBps}
          onSelectMarketAddress={onSelectMarketAddress}
        />

        <CollateralSelectorRow
          selectedMarketAddress={marketInfo?.marketTokenAddress}
          selectedCollateralAddress={collateralAddress}
          availableCollaterals={availableCollaterals}
          marketsOptions={marketsOptions}
          hasExistingOrder={Boolean(existingOrder)}
          hasExistingPosition={Boolean(existingPosition)}
          onSelectCollateralAddress={onSelectCollateralAddress}
        />

        {isTrigger && existingPosition?.leverage && (
          <Checkbox asRow isChecked={keepLeverage} setIsChecked={setKeepLeverage}>
            <span className="muted font-sm">
              <Trans>Keep leverage at {formatLeverage(existingPosition.leverage)} </Trans>
            </span>
          </Checkbox>
        )}
      </>
    );
  }

  function renderIncreaseOrderInfo() {
    return (
      <>
        <ExchangeInfoRow
          className="SwapBox-info-row"
          label={t`Leverage`}
          value={
            nextPositionValues?.nextLeverage && increaseAmounts?.sizeDeltaUsd.gt(0) ? (
              <ValueTransition
                from={formatLeverage(existingPosition?.leverage)}
                to={formatLeverage(nextPositionValues?.nextLeverage) || "-"}
              />
            ) : (
              formatLeverage(isLeverageEnabled ? leverage : increaseAmounts?.estimatedLeverage) || "-"
            )
          }
        />

        <ExchangeInfoRow
          className="SwapBox-info-row"
          label={t`Entry Price`}
          value={
            nextPositionValues?.nextEntryPrice || existingPosition?.entryPrice ? (
              <ValueTransition
                from={formatUsd(existingPosition?.entryPrice, {
                  displayDecimals: toToken?.priceDecimals,
                })}
                to={formatUsd(nextPositionValues?.nextEntryPrice, {
                  displayDecimals: toToken?.priceDecimals,
                })}
              />
            ) : (
              formatUsd(markPrice, {
                displayDecimals: toToken?.priceDecimals,
              })
            )
          }
        />

        {isMarket && (
          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Price Impact`}
            value={
              <span className={cx({ positive: increaseAmounts?.acceptablePriceDeltaBps?.gt(0) })}>
                {formatPercentage(increaseAmounts?.acceptablePriceDeltaBps, { signed: true }) || "-"}
              </span>
            }
          />
        )}

        {isLimit && (
          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Acceptable Price Impact`}
            value={
              <span
                className="TradeBox-acceptable-price-impact"
                onClick={() => setIsEditingAcceptablePriceImpact(true)}
              >
                {formatPercentage(acceptablePriceImpactBpsForLimitOrders.mul(-1), { signed: true })}
                <span className="edit-icon" onClick={() => null}>
                  <AiOutlineEdit fontSize={16} />
                </span>
              </span>
            }
          />
        )}

        <ExchangeInfoRow
          className="SwapBox-info-row"
          label={t`Acceptable Price`}
          value={
            increaseAmounts?.sizeDeltaUsd.gt(0)
              ? formatAcceptablePrice(increaseAmounts.acceptablePrice, {
                  displayDecimals: toToken?.priceDecimals,
                })
              : "-"
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
                      displayDecimals: existingPosition?.indexToken?.priceDecimals,
                    })
                  : undefined
              }
              to={
                increaseAmounts?.sizeDeltaUsd.gt(0)
                  ? formatLiquidationPrice(nextPositionValues?.nextLiqPrice, {
                      displayDecimals: toToken?.priceDecimals,
                    })
                  : existingPosition
                  ? undefined
                  : "-"
              }
            />
          }
        />
      </>
    );
  }

  function renderTriggerOrderInfo() {
    return (
      <>
        <ExchangeInfoRow
          className="SwapBox-info-row"
          label={t`Trigger Price`}
          value={`${decreaseAmounts?.triggerThresholdType || ""} ${
            formatUsd(decreaseAmounts?.triggerPrice, {
              displayDecimals: toToken?.priceDecimals,
            }) || "-"
          }`}
        />

        <ExchangeInfoRow
          className="SwapBox-info-row"
          label={t`Acceptable Price Impact`}
          value={
            decreaseAmounts?.triggerOrderType === OrderType.StopLossDecrease ? (
              "NA"
            ) : (
              <span
                className="TradeBox-acceptable-price-impact"
                onClick={() => setIsEditingAcceptablePriceImpact(true)}
              >
                {formatPercentage(acceptablePriceImpactBpsForLimitOrders.mul(-1))}
                <span className="edit-icon" onClick={() => null}>
                  <AiOutlineEdit fontSize={16} />
                </span>
              </span>
            )
          }
        />

        <ExchangeInfoRow
          className="SwapBox-info-row"
          label={t`Acceptable Price`}
          value={
            decreaseAmounts?.sizeDeltaUsd.gt(0)
              ? formatAcceptablePrice(decreaseAmounts?.acceptablePrice, {
                  displayDecimals: toToken?.priceDecimals,
                })
              : "-"
          }
        />

        {existingPosition && (
          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Liq. Price`}
            value={
              decreaseAmounts?.isFullClose ? (
                "-"
              ) : (
                <ValueTransition
                  from={
                    existingPosition
                      ? formatLiquidationPrice(existingPosition?.liquidationPrice, {
                          displayDecimals: existingPosition?.indexToken?.priceDecimals,
                        })
                      : undefined
                  }
                  to={
                    decreaseAmounts?.sizeDeltaUsd.gt(0)
                      ? formatLiquidationPrice(nextPositionValues?.nextLiqPrice, {
                          displayDecimals: toToken?.priceDecimals,
                        })
                      : undefined
                  }
                />
              )
            }
          />
        )}

        {existingPosition?.sizeInUsd.gt(0) && (
          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Size`}
            value={
              <ValueTransition
                from={formatUsd(existingPosition.sizeInUsd)!}
                to={formatUsd(nextPositionValues?.nextSizeUsd)}
              />
            }
          />
        )}

        {existingPosition && (
          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Collateral (${existingPosition?.collateralToken?.symbol})`}
            value={
              <ValueTransition
                from={formatUsd(existingPosition.collateralUsd)}
                to={formatUsd(nextPositionValues?.nextCollateralUsd)}
              />
            }
          />
        )}

        {existingPosition && (
          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Leverage`}
            value={
              existingPosition.sizeInUsd.eq(decreaseAmounts?.sizeDeltaUsd || 0) ? (
                "-"
              ) : (
                <ValueTransition
                  from={formatLeverage(existingPosition.leverage)}
                  to={formatLeverage(nextPositionValues?.nextLeverage)}
                />
              )
            }
          />
        )}

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
                  decreaseAmounts?.sizeDeltaUsd.gt(0) ? (
                    <>
                      {formatDeltaUsd(nextPositionValues?.nextPnl)} (
                      {formatPercentage(nextPositionValues?.nextPnlPercentage, { signed: true })})
                    </>
                  ) : undefined
                }
              />
            }
          />
        )}
      </>
    );
  }

  return (
    <>
      <div>
        <div className={`App-box SwapBox`}>
          <Tab
            icons={tradeTypeIcons}
            options={Object.values(TradeType)}
            optionLabels={tradeTypeLabels}
            option={tradeType}
            onChange={onSelectTradeType}
            className="SwapBox-option-tabs"
          />

          <Tab
            options={availableTradeModes}
            optionLabels={tradeModeLabels}
            className="SwapBox-asset-options-tabs"
            type="inline"
            option={tradeMode}
            onChange={onSelectTradeMode}
          />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
          >
            {(isSwap || isIncrease) && renderTokenInputs()}
            {isTrigger && renderDecreaseSizeInput()}

            {isSwap && isLimit && renderTriggerRatioInput()}
            {isPosition && (isLimit || isTrigger) && renderTriggerPriceInput()}

            <div className="SwapBox-info-section">
              {isPosition && (
                <>
                  {renderPositionControls()}
                  <div className="App-card-divider" />
                </>
              )}

              {isIncrease && renderIncreaseOrderInfo()}
              {isTrigger && renderTriggerOrderInfo()}

              <div className="App-card-divider" />

              {feesType && <TradeFeesRow {...fees} executionFee={executionFee} feesType={feesType} />}

              {isTrigger && existingPosition && decreaseAmounts?.receiveUsd && (
                <ExchangeInfoRow
                  className="SwapBox-info-row"
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

            <div className="Exchange-swap-button-container">
              <Button
                variant="primary-action"
                className="w-full"
                onClick={onSubmit}
                disabled={isSubmitButtonDisabled && !shouldDisableValidation}
              >
                {error || submitButtonText}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {isSwap && <SwapCard maxLiquidityUsd={swapOutLiquidity} fromToken={fromToken} toToken={toToken} />}
      <div className="Exchange-swap-info-group">
        {isPosition && (
          <MarketCard
            isLong={isLong}
            isIncrease={isIncrease}
            marketInfo={marketInfo}
            allowedSlippage={allowedSlippage}
          />
        )}
        {account && <ClaimableCard marketsInfoData={marketsInfoData} onClaimClick={() => setIsClaiming(true)} />}
      </div>

      <ConfirmationBox
        isVisible={stage === "confirmation"}
        tradeFlags={tradeFlags}
        isWrapOrUnwrap={isWrapOrUnwrap}
        fromToken={fromToken}
        toToken={toToken}
        markPrice={markPrice}
        markRatio={markRatio}
        triggerPrice={triggerPrice}
        fixedTriggerThresholdType={fixedTriggerThresholdType}
        fixedTriggerOrderType={fixedTriggerOrderType}
        fixedTriggerAcceptablePrice={fixedTriggerAcceptablePrice}
        triggerRatio={triggerRatio}
        marketInfo={marketInfo}
        collateralToken={collateralToken}
        swapAmounts={swapAmounts}
        increaseAmounts={increaseAmounts}
        decreaseAmounts={decreaseAmounts}
        nextPositionValues={nextPositionValues}
        swapLiquidityUsd={swapOutLiquidity}
        longLiquidityUsd={longLiquidity}
        shortLiquidityUsd={shortLiquidity}
        keepLeverage={keepLeverage}
        fees={fees}
        executionFee={executionFee}
        error={error}
        existingPosition={existingPosition}
        shouldDisableValidation={shouldDisableValidation!}
        isHigherSlippageAllowed={isHigherSlippageAllowed}
        ordersData={ordersInfo}
        tokensData={tokensData}
        setIsHigherSlippageAllowed={setIsHigherSlippageAllowed}
        setKeepLeverage={setKeepLeverage}
        onClose={onConfirmationClose}
        onSubmitted={onConfirmed}
        setPendingTxns={setPendingTxns}
      />
    </>
  );
}
