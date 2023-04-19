import { Trans, t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import cx from "classnames";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Checkbox from "components/Checkbox/Checkbox";
import { Dropdown } from "components/Dropdown/Dropdown";
import { ConfirmationBox } from "components/Synthetics/ConfirmationBox/ConfirmationBox";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { LeverageSlider } from "components/LeverageSlider/LeverageSlider";
import Tab from "components/Tab/Tab";
import TokenSelector from "components/TokenSelector/TokenSelector";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { getKeepLeverageKey, getLeverageEnabledKey, getLeverageKey } from "config/localStorage";
import {
  AvailableTokenOptions,
  SwapAmounts,
  TradeFeesType,
  TradeMode,
  TradeType,
  getDecreasePositionAmounts,
  getIncreasePositionAmountsByCollateral,
  getIncreasePositionAmountsBySizeDelta,
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
import {
  VirtualInventoryForPositionsData,
  estimateExecuteDecreaseOrderGasLimit,
  estimateExecuteIncreaseOrderGasLimit,
  estimateExecuteSwapOrderGasLimit,
  getExecutionFee,
  useGasLimits,
  useGasPrice,
} from "domain/synthetics/fees";
import { MarketInfo, getAvailableUsdLiquidityForPosition } from "domain/synthetics/markets";
import { OrderInfo, OrderType, OrdersInfoData } from "domain/synthetics/orders";
import { PositionInfo, PositionsInfoData, formatLeverage, usePositionsConstants } from "domain/synthetics/positions";
import { TokenData, TokensData, TokensRatio, convertToUsd, getTokensRatioByPrice } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import longImg from "img/long.svg";
import shortImg from "img/short.svg";
import swapImg from "img/swap.svg";
import { useChainId } from "lib/chains";
import { BASIS_POINTS_DIVISOR, USD_DECIMALS } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import {
  formatAmount,
  formatAmountFree,
  formatPercentage,
  formatTokenAmount,
  formatUsd,
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
import { OrderStatus } from "../OrderStatus/OrderStatus";

export type Props = {
  tradeType: TradeType;
  tradeMode: TradeMode;
  tradeFlags: TradeFlags;
  isWrapOrUnwrap: boolean;
  tokensData?: TokensData;
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
  virtualInventoryForPositions?: VirtualInventoryForPositionsData;
  allowedSlippage: number;
  acceptablePriceImpactBpsForLimitOrders: BigNumber;
  savedIsPnlInLeverage: boolean;
  isHigherSlippageAllowed: boolean;
  shouldDisableValidation?: boolean;
  setIsHigherSlippageAllowed: (value: boolean) => void;
  onSelectFromTokenAddress: (fromTokenAddress?: string) => void;
  onSelectToTokenAddress: (toTokenAddress?: string) => void;
  onSelectTradeType: (tradeType: TradeType) => void;
  onSelectTradeMode: (tradeMode: TradeMode) => void;
  setPendingTxns: (txns: any) => void;
  onSelectMarketAddress: (marketAddress?: string) => void;
  onSelectCollateralAddress: (collateralAddress?: string) => void;
  onConnectWallet: () => void;
  setIsEditingAcceptablePriceImpact: (val: boolean) => void;
  setIsClaiming: (val: boolean) => void;
};

const tradeTypeIcons = {
  [TradeType.Long]: longImg,
  [TradeType.Short]: shortImg,
  [TradeType.Swap]: swapImg,
};

const avaialbleModes = {
  [TradeType.Long]: [TradeMode.Market, TradeMode.Limit, TradeMode.Trigger],
  [TradeType.Short]: [TradeMode.Market, TradeMode.Limit, TradeMode.Trigger],
  [TradeType.Swap]: [TradeMode.Market, TradeMode.Limit],
};

export function TradeBox(p: Props) {
  const {
    tradeMode,
    tradeType,
    tradeFlags,
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
    virtualInventoryForPositions,
    isHigherSlippageAllowed,
    setIsHigherSlippageAllowed,
    onSelectMarketAddress,
    onSelectCollateralAddress,
    onSelectFromTokenAddress,
    onSelectToTokenAddress,
    onSelectTradeMode,
    onSelectTradeType,
    onConnectWallet,
    setIsEditingAcceptablePriceImpact,
    setIsClaiming,
    setPendingTxns,
  } = p;
  const { isLong, isSwap, isIncrease, isPosition, isLimit, isTrigger, isMarket } = tradeFlags;
  const { swapTokens, indexTokens, infoTokens } = avaialbleTokenOptions;

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
  const { account } = useWeb3React();
  const { gasPrice } = useGasPrice(chainId);
  const { gasLimits } = useGasLimits(chainId);
  const { minCollateralUsd } = usePositionsConstants(chainId);

  const [stage, setStage] = useState<"trade" | "confirmation" | "processing">("trade");
  const [focusedInput, setFocusedInput] = useState<"from" | "to">();

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
        triggerRatio: triggerRatio,
        isLimit,
        findSwapPath: swapRoute.findSwapPath,
      });
    } else {
      return getSwapAmountsByToValue({
        tokenIn: fromToken,
        tokenOut: toToken,
        amountOut: toTokenAmount,
        triggerRatio: triggerRatio,
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
    swapRoute.findSwapPath,
    toToken,
    toTokenAmount,
    triggerRatio,
  ]);

  const increaseAmounts = useMemo(() => {
    if (!isIncrease || !toToken || !fromToken || !collateralToken || !marketInfo || !virtualInventoryForPositions) {
      return undefined;
    }

    if (focusedInput === "from") {
      return getIncreasePositionAmountsByCollateral({
        marketInfo,
        initialCollateralToken: fromToken,
        collateralToken,
        isLong,
        initialCollateralAmount: fromTokenAmount,
        leverage,
        isLimit,
        triggerPrice,
        savedAcceptablePriceImpactBps: acceptablePriceImpactBpsForLimitOrders,
        findSwapPath: swapRoute.findSwapPath,
        virtualInventoryForPositions,
      });
    } else {
      return getIncreasePositionAmountsBySizeDelta({
        marketInfo,
        initialCollateralToken: fromToken,
        collateralToken,
        isLong,
        sizeDeltaInTokens: toTokenAmount,
        leverage,
        isLimit,
        triggerPrice,
        savedAcceptablePriceImpactBps: acceptablePriceImpactBpsForLimitOrders,
        findSwapPath: swapRoute.findSwapPath,
        virtualInventoryForPositions,
      });
    }
  }, [
    acceptablePriceImpactBpsForLimitOrders,
    collateralToken,
    focusedInput,
    fromToken,
    fromTokenAmount,
    isIncrease,
    isLimit,
    isLong,
    leverage,
    marketInfo,
    swapRoute.findSwapPath,
    toToken,
    toTokenAmount,
    triggerPrice,
    virtualInventoryForPositions,
  ]);

  const decreaseAmounts = useMemo(() => {
    if (!isTrigger || !closeSizeUsd || !marketInfo || !collateralToken || !virtualInventoryForPositions) {
      return undefined;
    }

    return getDecreasePositionAmounts({
      marketInfo,
      collateralToken,
      isLong,
      existingPosition,
      receiveToken: collateralToken,
      closeSizeUsd: closeSizeUsd,
      keepLeverage: keepLeverage!,
      isTrigger: true,
      triggerPrice,
      savedAcceptablePriceImpactBps: acceptablePriceImpactBpsForLimitOrders,
      virtualInventoryForPositions,
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
    triggerPrice,
    virtualInventoryForPositions,
  ]);

  const nextPositionValues = useMemo(() => {
    if (!isPosition || !minCollateralUsd || !marketInfo) {
      return undefined;
    }

    if (isIncrease && increaseAmounts?.acceptablePrice && fromTokenAmount.gt(0)) {
      return getNextPositionValuesForIncreaseTrade({
        marketInfo,
        existingPosition,
        sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
        collateralDeltaUsd: increaseAmounts.collateralUsdAfterFees,
        isLong,
        entryPrice: increaseAmounts.acceptablePrice,
        minCollateralUsd,
        showPnlInLeverage: savedIsPnlInLeverage,
      });
    }

    if (isTrigger && decreaseAmounts?.acceptablePrice && closeSizeUsd.gt(0)) {
      return getNextPositionValuesForDecreaseTrade({
        existingPosition,
        marketInfo,
        sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
        exitPnl: decreaseAmounts.exitPnl,
        pnlDelta: decreaseAmounts.pnlDelta,
        collateralDeltaUsd: decreaseAmounts.collateralDeltaUsd,
        executionPrice: decreaseAmounts.acceptablePrice,
        showPnlInLeverage: savedIsPnlInLeverage,
        isLong,
        minCollateralUsd,
      });
    }
  }, [
    closeSizeUsd,
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
  ]);

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
          initialCollateralUsd: swapAmounts.usdIn,
          sizeDeltaUsd: BigNumber.from(0),
          swapSteps: swapAmounts.swapPathStats.swapSteps,
          positionFeeUsd: BigNumber.from(0),
          swapPriceImpactDeltaUsd: swapAmounts.swapPathStats.totalSwapPriceImpactDeltaUsd,
          positionPriceImpactDeltaUsd: BigNumber.from(0),
          borrowingFeeUsd: BigNumber.from(0),
          fundingFeeDeltaUsd: BigNumber.from(0),
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
          initialCollateralUsd: increaseAmounts.initialCollateralUsd,
          sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
          swapSteps: increaseAmounts.swapPathStats?.swapSteps || [],
          positionFeeUsd: increaseAmounts.positionFeeUsd,
          swapPriceImpactDeltaUsd: increaseAmounts.swapPathStats?.totalSwapPriceImpactDeltaUsd || BigNumber.from(0),
          positionPriceImpactDeltaUsd: increaseAmounts.positionPriceImpactDeltaUsd,
          borrowingFeeUsd: existingPosition?.pendingBorrowingFeesUsd || BigNumber.from(0),
          fundingFeeDeltaUsd: existingPosition?.pendingFundingFeesUsd || BigNumber.from(0),
        }),
        executionFee: getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice),
        feesType: "increase" as TradeFeesType,
      };
    }

    if (isTrigger && decreaseAmounts) {
      const estimatedGas = estimateExecuteDecreaseOrderGasLimit(gasLimits, {});

      return {
        fees: getTradeFees({
          initialCollateralUsd: decreaseAmounts.receiveUsd,
          sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
          swapSteps: [],
          positionFeeUsd: decreaseAmounts.positionFeeUsd,
          swapPriceImpactDeltaUsd: BigNumber.from(0),
          positionPriceImpactDeltaUsd: decreaseAmounts.positionPriceImpactDeltaUsd,
          borrowingFeeUsd: existingPosition?.pendingBorrowingFeesUsd || BigNumber.from(0),
          fundingFeeDeltaUsd: existingPosition?.pendingFundingFeesUsd || BigNumber.from(0),
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

  const marketsOptions = useAvailableMarketsOptions(chainId, {
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
      hasOutdatedUi: false,
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
        collateralUsd: increaseAmounts?.collateralUsdAfterFees,
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
        sizeDeltaUsd: closeSizeUsd,
        triggerPrice,
        existingPosition,
        isContractAccount: false,
        receiveToken: existingPosition?.collateralToken,
        nextPositionValues,
        isLong,
        isTrigger: true,
        minCollateralUsd,
        isNotEnoughReceiveTokenLiquidity: false,
      });
    }

    return commonError[0] || tradeError[0];
  }, [
    account,
    chainId,
    closeSizeUsd,
    collateralToken,
    existingPosition,
    fees,
    fromToken,
    fromTokenAmount,
    increaseAmounts,
    isIncrease,
    isLimit,
    isLong,
    isSwap,
    isTrigger,
    isWrapOrUnwrap,
    longLiquidity,
    markPrice,
    markRatio,
    marketInfo,
    minCollateralUsd,
    nextPositionValues,
    shortLiquidity,
    swapAmounts,
    swapOutLiquidity,
    toToken,
    toTokenAmount,
    triggerPrice,
    triggerRatio,
  ]);

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
      onConnectWallet();
      return;
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
            increaseAmounts.sizeDeltaInTokens.gt(0)
              ? formatAmountFree(increaseAmounts.sizeDeltaInTokens, toToken.decimals)
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
    function updateMode() {
      if (tradeType && tradeMode && !avaialbleModes[tradeType].includes(tradeMode)) {
        onSelectTradeMode(avaialbleModes[tradeType][0]);
      }
    },
    [tradeType, onSelectTradeMode, tradeMode]
  );

  useEffect(
    function updateSwapTokens() {
      if (!isSwap) return;

      const needFromUpdate = !swapTokens.find((t) => t.address === fromTokenAddress);

      if (needFromUpdate && swapTokens.length) {
        onSelectFromTokenAddress(swapTokens[0].address);
      }

      const needToUpdate = !swapTokens.find((t) => t.address === toTokenAddress);

      if (needToUpdate && swapTokens.length) {
        onSelectToTokenAddress(swapTokens[0].address);
      }
    },
    [fromTokenAddress, isSwap, onSelectFromTokenAddress, onSelectToTokenAddress, swapTokens, toTokenAddress]
  );

  useEffect(
    function updatePositionTokens() {
      if (!isPosition) return;

      const needFromUpdate = !swapTokens.find((t) => t.address === fromTokenAddress);

      if (needFromUpdate && swapTokens.length) {
        onSelectFromTokenAddress(swapTokens[0].address);
      }

      const needIndexUpdateByAvailableTokens = !indexTokens.find((t) => t.address === toTokenAddress);

      if (needIndexUpdateByAvailableTokens && indexTokens.length) {
        onSelectToTokenAddress(indexTokens[0].address);
      }

      const needCollateralUpdate =
        !collateralAddress ||
        (marketInfo && ![marketInfo.longTokenAddress, marketInfo.shortTokenAddress].includes(collateralAddress));

      if (needCollateralUpdate && marketInfo) {
        onSelectCollateralAddress(isLong ? marketInfo.longTokenAddress : marketInfo.shortTokenAddress);
      }
    },
    [
      collateralAddress,
      fromTokenAddress,
      indexTokens,
      isLong,
      isPosition,
      marketInfo,
      onSelectCollateralAddress,
      onSelectFromTokenAddress,
      onSelectToTokenAddress,
      swapTokens,
      toTokenAddress,
    ]
  );

  useEffect(
    function updatePositionMarket() {
      if (!isPosition || !marketsOptions.availableMarkets) {
        return;
      }

      const needUpdateMarket =
        !marketAddress || !marketsOptions.availableMarkets.find((m) => m.marketTokenAddress === marketAddress);

      const optimalMarket = marketsOptions.minPriceImpactMarket || marketsOptions.maxLiquidityMarket;

      if (needUpdateMarket && optimalMarket) {
        onSelectMarketAddress(optimalMarket.marketTokenAddress);
      }
    },
    [
      availableMarkets,
      chainId,
      isLong,
      isPosition,
      marketAddress,
      marketsOptions.availableMarkets,
      marketsOptions.maxLiquidityMarket,
      marketsOptions.minPriceImpactMarket,
      onSelectMarketAddress,
    ]
  );

  function onSwitchTokens() {
    onSelectFromTokenAddress(toTokenAddress);
    setFromTokenInputValue(toTokenInputValue || "");

    onSelectToTokenAddress(fromTokenAddress);
    setToTokenInputValue(fromTokenInputValue || "");

    setFocusedInput((old) => (old === "from" ? "to" : "from"));
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

  function renderTokenInputs() {
    return (
      <>
        <BuyInputSection
          topLeftLabel={t`Pay:`}
          topLeftValue={formatUsd(fromUsd)}
          topRightLabel={t`Balance:`}
          topRightValue={formatTokenAmount(fromToken?.balance, fromToken?.decimals)}
          inputValue={fromTokenInputValue}
          onInputValueChange={(e) => {
            setFocusedInput("from");
            setFromTokenInputValue(e.target.value);
          }}
          showMaxButton={isNotMatchAvailableBalance}
          onClickMax={() => {
            if (fromToken?.balance) {
              setFocusedInput("from");
              setFromTokenInputValue(formatAmountFree(fromToken.balance, fromToken.decimals));
            }
          }}
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
            />
          )}
        </BuyInputSection>

        <div className="AppOrder-ball-container" onClick={onSwitchTokens}>
          <div className="AppOrder-ball">
            <IoMdSwap className="Exchange-swap-ball-icon" />
          </div>
        </div>

        {isSwap && (
          <BuyInputSection
            topLeftLabel={t`Receive:`}
            topLeftValue={formatUsd(swapAmounts?.usdOut)}
            topRightLabel={t`Balance:`}
            topRightValue={formatTokenAmount(toToken?.balance, toToken?.decimals)}
            inputValue={toTokenInputValue}
            onInputValueChange={(e) => {
              setFocusedInput("to");
              setToTokenInputValue(e.target.value);
            }}
            showMaxButton={false}
          >
            {toTokenAddress && (
              <TokenSelector
                label={t`Receive:`}
                chainId={chainId}
                tokenAddress={toTokenAddress}
                onSelectToken={(token) => onSelectToTokenAddress(token.address)}
                tokens={swapTokens}
                infoTokens={infoTokens}
                className="GlpSwap-from-token"
                showSymbolImage={true}
                showBalances={true}
                showTokenImgInDropdown={true}
              />
            )}
          </BuyInputSection>
        )}

        {isIncrease && (
          <BuyInputSection
            topLeftLabel={`${tradeTypeLabels[tradeType!]}:`}
            topLeftValue={formatUsd(increaseAmounts?.sizeDeltaUsd, { fallbackToZero: true })}
            topRightLabel={t`Leverage:`}
            topRightValue={formatLeverage(leverage)}
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
        topRightLabel={existingPosition?.sizeInUsd ? `Max:` : undefined}
        topRightValue={existingPosition?.sizeInUsd ? formatUsd(existingPosition.sizeInUsd) : undefined}
        inputValue={closeSizeInputValue}
        onInputValueChange={(e) => setCloseSizeInputValue(e.target.value)}
        showMaxButton={existingPosition?.sizeInUsd.gt(0) && !closeSizeUsd?.eq(existingPosition.sizeInUsd)}
        onClickMax={() => setCloseSizeInputValue(formatAmount(existingPosition?.sizeInUsd, USD_DECIMALS, 2))}
      >
        USD
      </BuyInputSection>
    );
  }

  function renderTriggerPriceInput() {
    return (
      <BuyInputSection
        topLeftLabel={t`Price`}
        topRightLabel={t`Mark:`}
        topRightValue={formatUsd(markPrice)}
        onClickTopRightLabel={() => {
          setTriggerPriceInputValue(formatAmount(markPrice, USD_DECIMALS, 2));
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
            {markRatio.smallestToken.symbol} per 
            {markRatio.largestToken.symbol}
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
            <div className="Exchange-leverage-slider-settings">
              <Checkbox isChecked={isLeverageEnabled} setIsChecked={setIsLeverageEnabled}>
                <span className="muted">
                  <Trans>Leverage slider</Trans>
                </span>
              </Checkbox>
            </div>
            {isLeverageEnabled && (
              <LeverageSlider value={leverageOption} onChange={setLeverageOption} isPositive={isLong} />
            )}
          </>
        )}
        <ExchangeInfoRow
          className="SwapBox-info-row"
          label={t`Market`}
          value={
            isIncrease ? (
              `${toToken?.symbol}/USD`
            ) : (
              <Dropdown
                className="SwapBox-market-selector-dropdown"
                selectedOption={{
                  label: `${marketInfo?.indexToken.symbol}/USD`,
                  value: marketInfo?.indexToken.address,
                }}
                placeholder={"-"}
                options={indexTokens.map((token) => ({ label: `${token.symbol}/USD`, value: token.address }))}
                onSelect={(option) => {
                  onSelectToTokenAddress(option.value);
                }}
              />
            )
          }
        />

        <MarketPoolSelectorRow
          selectedMarket={marketInfo}
          indexToken={marketInfo?.indexToken}
          marketsOptions={marketsOptions}
          hasExistingOrder={Boolean(existingOrder)}
          hasExistingPosition={Boolean(existingPosition)}
          isOutPositionLiquidity={isOutPositionLiquidity}
          currentPriceImpactBps={increaseAmounts?.acceptablePriceImpactBps}
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
          <div className="Exchange-leverage-slider-settings">
            <Checkbox isChecked={keepLeverage} setIsChecked={setKeepLeverage}>
              <span className="muted font-sm">
                <Trans>Keep leverage at {formatLeverage(existingPosition.leverage)} </Trans>
              </span>
            </Checkbox>
          </div>
        )}
        <div className="App-card-divider" />
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
              formatLeverage(leverage)
            )
          }
        />

        <ExchangeInfoRow
          className="SwapBox-info-row"
          label={t`Entry Price`}
          value={formatUsd(increaseAmounts?.entryPrice) || "-"}
        />

        {isMarket && (
          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Price Impact`}
            value={
              <span className={cx({ positive: increaseAmounts?.acceptablePriceImpactBps?.gt(0) })}>
                {formatPercentage(increaseAmounts?.acceptablePriceImpactBps) || "-"}
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
                {formatPercentage(acceptablePriceImpactBpsForLimitOrders.mul(-1))}
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
          value={formatUsd(increaseAmounts?.acceptablePrice) || "-"}
        />

        <ExchangeInfoRow
          className="SwapBox-info-row"
          label={t`Liq. Price`}
          value={
            <ValueTransition
              from={nextPositionValues?.nextLiqPrice ? formatUsd(existingPosition?.liquidationPrice) : undefined}
              to={formatUsd(nextPositionValues?.nextLiqPrice) || "-"}
            />
          }
        />

        <div className="App-card-divider" />
      </>
    );
  }

  function renderTriggerOrderInfo() {
    return (
      <>
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
                from={formatUsd(existingPosition.initialCollateralUsd)}
                to={formatUsd(nextPositionValues?.nextCollateralUsd)}
              />
            }
          />
        )}

        <ExchangeInfoRow className="SwapBox-info-row" label={t`Mark Price`} value={formatUsd(markPrice) || "-"} />

        <ExchangeInfoRow
          className="SwapBox-info-row"
          label={t`Trigger Price`}
          value={`${decreaseAmounts?.triggerPricePrefix || ""} ${formatUsd(decreaseAmounts?.triggerPrice) || "-"}`}
        />

        <ExchangeInfoRow
          className="SwapBox-info-row"
          label={t`Acceptable Price Impact`}
          value={
            <span className="TradeBox-acceptable-price-impact" onClick={() => setIsEditingAcceptablePriceImpact(true)}>
              {formatPercentage(acceptablePriceImpactBpsForLimitOrders.mul(-1))}
              <span className="edit-icon" onClick={() => null}>
                <AiOutlineEdit fontSize={16} />
              </span>
            </span>
          }
        />

        <ExchangeInfoRow
          className="SwapBox-info-row"
          label={t`Acceptable Price`}
          value={formatUsd(decreaseAmounts?.acceptablePrice) || "-"}
        />

        {existingPosition && (
          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Liq. Price`}
            value={
              existingPosition.sizeInUsd.eq(decreaseAmounts?.sizeDeltaUsd || 0) ? (
                "-"
              ) : (
                <ValueTransition
                  from={formatUsd(existingPosition.liquidationPrice)!}
                  to={formatUsd(nextPositionValues?.nextLiqPrice)}
                />
              )
            }
          />
        )}

        <div className="App-card-divider" />
      </>
    );
  }

  return (
    <>
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
          options={avaialbleModes[tradeType!]}
          optionLabels={tradeModeLabels}
          className="SwapBox-asset-options-tabs"
          type="inline"
          option={tradeMode}
          onChange={onSelectTradeMode}
        />

        {(isSwap || isIncrease) && renderTokenInputs()}
        {isTrigger && renderDecreaseSizeInput()}

        {isSwap && isLimit && renderTriggerRatioInput()}
        {isPosition && (isLimit || isTrigger) && renderTriggerPriceInput()}

        <div className="SwapBox-info-section">
          {isPosition && renderPositionControls()}
          {isIncrease && renderIncreaseOrderInfo()}
          {isTrigger && renderTriggerOrderInfo()}

          {feesType && (
            <TradeFeesRow
              totalTradeFees={fees?.totalFees}
              swapFees={fees?.swapFees}
              positionFee={fees?.positionFee}
              swapPriceImpact={fees?.swapPriceImpact}
              positionPriceImpact={fees?.positionPriceImpact}
              borrowFee={fees?.borrowFee}
              fundingFee={fees?.fundingFee}
              executionFee={executionFee}
              feesType={feesType}
            />
          )}
        </div>

        <div className="Exchange-swap-button-container">
          <Button
            variant="primary-action"
            className="w-100"
            onClick={onSubmit}
            disabled={Boolean(error) && !shouldDisableValidation}
          >
            {error || submitButtonText}
          </Button>
        </div>
      </div>

      {isSwap && <SwapCard maxLiquidityUsd={swapOutLiquidity} fromToken={fromToken} toToken={toToken} />}
      {isPosition && <MarketCard isLong={isLong} marketAddress={marketAddress} />}
      {account && <ClaimableCard onClaimClick={() => setIsClaiming(true)} />}

      {stage === "confirmation" && (
        <ConfirmationBox
          tradeFlags={tradeFlags}
          isWrapOrUnwrap={isWrapOrUnwrap}
          fromToken={fromToken}
          toToken={toToken}
          markPrice={markPrice}
          markRatio={markRatio}
          triggerPrice={triggerPrice}
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
          allowedSlippage={allowedSlippage}
          isHigherSlippageAllowed={isHigherSlippageAllowed}
          ordersData={ordersInfo}
          setIsHigherSlippageAllowed={setIsHigherSlippageAllowed}
          setKeepLeverage={setKeepLeverage}
          onClose={onConfirmationClose}
          onSubmitted={onConfirmed}
          setPendingTxns={setPendingTxns}
          onConnectWallet={onConnectWallet}
        />
      )}

      <OrderStatus
        isVisible={stage === "processing"}
        orderType={isSwap ? OrderType.MarketSwap : OrderType.MarketIncrease}
        marketAddress={isPosition ? p.marketAddress : undefined}
        initialCollateralAddress={isSwap ? fromTokenAddress : undefined}
        initialCollateralAmount={isSwap ? fromTokenAmount : undefined}
        toSwapTokenAddress={isSwap ? toTokenAddress : undefined}
        sizeDeltaUsd={increaseAmounts?.sizeDeltaUsd}
        isLong={isSwap ? undefined : isLong}
        onClose={() => setStage("trade")}
      />
    </>
  );
}
