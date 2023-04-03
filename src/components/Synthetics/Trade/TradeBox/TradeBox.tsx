import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Checkbox from "components/Checkbox/Checkbox";
import { Dropdown, DropdownOption } from "components/Dropdown/Dropdown";
import { LeverageSlider } from "components/LeverageSlider/LeverageSlider";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import Tab from "components/Tab/Tab";
import TokenSelector from "components/TokenSelector/TokenSelector";
import {
  KEEP_LEVERAGE_FOR_DECREASE_KEY,
  LEVERAGE_ENABLED_KEY,
  LEVERAGE_OPTION_KEY,
  SLIPPAGE_BPS_KEY,
  SYNTHETICS_ACCEPTABLE_PRICE_IMPACT_BPS_KEY,
} from "config/localStorage";
import { convertTokenAddress, getToken } from "config/tokens";
import {
  MarketInfo,
  getAvailableUsdLiquidityForCollateral,
  getAvailableUsdLiquidityForPosition,
  getMostLiquidMarketForPosition,
  getMostLiquidMarketForSwap,
  getTokenPoolType,
  useMarketsInfo,
} from "domain/synthetics/markets";
import { AggregatedOrdersData, OrderType, getAcceptablePrice } from "domain/synthetics/orders";
import { PositionInfo, PositionsInfoData, formatLeverage, getMarkPrice } from "domain/synthetics/positions";
import { TokensRatio, getTokenData, getTokensRatioByPrice, useAvailableTokensData } from "domain/synthetics/tokens";
import {
  getDecreasePositionTradeParams,
  getIncreasePositionTradeParams,
  getSwapTradeParams,
  getTradeFlags,
  useAvailableSwapOptions,
  useSwapRoute,
  useTokenInput,
} from "domain/synthetics/trade";
import { BigNumber } from "ethers";
import longImg from "img/long.svg";
import shortImg from "img/short.svg";
import swapImg from "img/swap.svg";
import { useChainId } from "lib/chains";
import {
  BASIS_POINTS_DIVISOR,
  DEFAULT_HIGHER_SLIPPAGE_AMOUNT,
  DEFAULT_SLIPPAGE_AMOUNT,
  MAX_ALLOWED_LEVERAGE,
  USD_DECIMALS,
} from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import {
  bigNumberify,
  expandDecimals,
  formatAmount,
  formatPercentage,
  formatTokenAmount,
  formatUsd,
  parseValue,
} from "lib/numbers";
import { useEffect, useMemo, useState } from "react";
import { IoMdSwap } from "react-icons/io";
import { MarketCard } from "../../MarketCard/MarketCard";

import { TradeFeesRow } from "components/Synthetics/TradeFeesRow/TradeFeesRow";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import {
  estimateExecuteDecreaseOrderGasLimit,
  estimateExecuteIncreaseOrderGasLimit,
  estimateExecuteSwapOrderGasLimit,
  getCappedPositionImpactUsd,
  getExecutionFee,
  getPriceImpactForPosition,
  useGasPrice,
} from "domain/synthetics/fees";
import { SwapCard } from "../../SwapCard/SwapCard";

import { SwapTradeParams, TradeMode, TradeType } from "domain/synthetics/trade/types";

import { OrderStatus } from "components/Synthetics/OrderStatus/OrderStatus";
import Tooltip from "components/Tooltip/Tooltip";
import { IS_NETWORK_DISABLED, getChainName } from "config/chains";
import { useGasLimits } from "domain/synthetics/fees";
import { usePositionsConstants } from "domain/synthetics/positions/usePositionsConstants";
import { usePrevious } from "lib/usePrevious";
import { AiOutlineEdit } from "react-icons/ai";
import { AcceptbablePriceImpactEditor } from "../AcceptablePriceImpactEditor/AcceptablePriceImpactEditor";
import { ConfirmationBox } from "../ConfirmationBox/ConfirmationBox";

import { useWeb3React } from "@web3-react/core";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { ClaimModal } from "components/Synthetics/ClaimModal/ClaimModal";
import { ClaimableCard } from "components/Synthetics/ClaimableCard/ClaimableCard";
import { DEFAULT_ACCEPABLE_PRICE_IMPACT_BPS } from "config/factors";
import { getByKey } from "lib/objects";
import "./TradeBox.scss";

type Props = {
  tradeType?: TradeType;
  tradeMode?: TradeMode;
  fromTokenAddress?: string;
  toTokenAddress?: string;
  marketAddress?: string;
  collateralAddress?: string;
  savedIsPnlInLeverage: boolean;
  ordersData: AggregatedOrdersData;
  positionsData: PositionsInfoData;
  existingPosition?: PositionInfo;
  shouldDisableValidation?: boolean;
  onSelectFromTokenAddress: (fromTokenAddress?: string) => void;
  onSelectToTokenAddress: (toTokenAddress?: string) => void;
  onSelectTradeType: (tradeType: TradeType) => void;
  onSelectTradeMode: (tradeMode: TradeMode) => void;
  setPendingTxns: (txns: any) => void;
  onSelectMarketAddress: (marketAddress?: string) => void;
  onSelectCollateralAddress: (collateralAddress?: string) => void;
  onConnectWallet: () => void;
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
    tradeType,
    tradeMode,
    fromTokenAddress,
    toTokenAddress,
    marketAddress,
    collateralAddress,
    existingPosition,
    ordersData,
    positionsData,
    savedIsPnlInLeverage,
    shouldDisableValidation,
    onSelectTradeType,
    onSelectTradeMode,
    onSelectFromTokenAddress,
    onSelectToTokenAddress,
    onSelectMarketAddress,
    onSelectCollateralAddress,
    onConnectWallet,
    setPendingTxns,
  } = p;

  const { chainId } = useChainId();
  const { account } = useWeb3React();
  const { tokensData } = useAvailableTokensData(chainId);

  const { marketsInfoData } = useMarketsInfo(chainId);

  const { gasPrice } = useGasPrice(chainId);
  const { gasLimits } = useGasLimits(chainId);
  const { maxLeverage, minCollateralUsd } = usePositionsConstants(chainId);

  const isDataLoading = !tokensData || !marketsInfoData;

  const tradeTypeLabels = {
    [TradeType.Long]: t`Long`,
    [TradeType.Short]: t`Short`,
    [TradeType.Swap]: t`Swap`,
  };

  const tradeModeLabels = {
    [TradeMode.Market]: t`Market`,
    [TradeMode.Limit]: t`Limit`,
    [TradeMode.Trigger]: t`Trigger`,
  };

  const { isLong, isSwap, isShort, isPosition, isIncrease, isTrigger, isMarket, isLimit } = getTradeFlags(
    tradeType!,
    tradeMode!
  );

  const prevIsISwap = usePrevious(isSwap);

  const [isClaiming, setIsClaiming] = useState(false);

  const [stage, setStage] = useState<"trade" | "confirmation" | "processing">("trade");
  const [focusedInput, setFocusedInput] = useState<"from" | "to">();

  const fromTokenInput = useTokenInput(tokensData, {
    priceType: "min",
    tokenAddress: fromTokenAddress,
  });

  const toTokenInput = useTokenInput(tokensData, {
    priceType: isShort ? "min" : "max",
    tokenAddress: toTokenAddress,
  });

  const prevToTokenAddress = usePrevious(toTokenInput.tokenAddress);
  const isToTokenChanged = prevToTokenAddress !== toTokenInput.tokenAddress;

  const collateralToken = getTokenData(tokensData, collateralAddress);
  const indexToken = getTokenData(tokensData, toTokenInput.token?.address);

  const [closeSizeInputValue, setCloseSizeInputValue] = useState("");
  const closeSizeUsd = parseValue(closeSizeInputValue || "0", USD_DECIMALS)!;

  const [triggerPriceInputValue, setTriggerPriceInputValue] = useState<string>("");
  const triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);
  const markPrice = getMarkPrice(indexToken?.prices, isIncrease, isLong);

  const [triggerRatioInputValue, setTriggerRatioInputValue] = useState<string>("");

  const markRatio =
    fromTokenInput.token &&
    toTokenInput.token &&
    getTokensRatioByPrice({
      fromToken: fromTokenInput.token,
      toToken: toTokenInput.token,
      fromPrice: fromTokenInput.token.prices.minPrice,
      toPrice: toTokenInput.token.prices.maxPrice,
    });

  const triggerRatio = useMemo(() => {
    if (!markRatio) return undefined;

    const ratio = parseValue(triggerRatioInputValue, USD_DECIMALS);

    return {
      ratio: ratio?.gt(0) ? ratio : markRatio.ratio,
      largestAddress: markRatio.largestAddress,
      smallestAddress: markRatio.smallestAddress,
    } as TokensRatio;
  }, [markRatio, triggerRatioInputValue]);

  const [leverageOption, setLeverageOption] = useLocalStorageSerializeKey([chainId, LEVERAGE_OPTION_KEY], 2);
  const [isLeverageEnabled, setIsLeverageEnabled] = useLocalStorageSerializeKey([chainId, LEVERAGE_ENABLED_KEY], true);
  const [keepLeverage, setKeepLeverage] = useLocalStorageSerializeKey([chainId, KEEP_LEVERAGE_FOR_DECREASE_KEY], true);
  const leverage = bigNumberify(parseInt(String(Number(leverageOption!) * BASIS_POINTS_DIVISOR)));

  const [savedSlippageAmount] = useLocalStorageSerializeKey([chainId, SLIPPAGE_BPS_KEY], DEFAULT_SLIPPAGE_AMOUNT);
  const [isHigherSlippageAllowed, setIsHigherSlippageAllowed] = useState(false);
  let allowedSlippage = savedSlippageAmount;
  if (isHigherSlippageAllowed) {
    allowedSlippage = DEFAULT_HIGHER_SLIPPAGE_AMOUNT;
  }

  const [isAcceptablePriceImpactEditing, setIsAcceptablePriceImpactEditing] = useState(false);
  const [savedAcceptablePriceImpactBps, saveAcceptablePriceImpactBps] = useLocalStorageSerializeKey(
    [chainId, SYNTHETICS_ACCEPTABLE_PRICE_IMPACT_BPS_KEY],
    DEFAULT_ACCEPABLE_PRICE_IMPACT_BPS
  );
  const acceptablePriceImpactBps = bigNumberify(savedAcceptablePriceImpactBps!);

  const { availableSwapTokens, availableIndexTokens, availablePositionCollaterals, infoTokens } =
    useAvailableSwapOptions({
      selectedIndexTokenAddress: isPosition ? toTokenInput.tokenAddress : undefined,
    });

  const availableMarkets: MarketInfo[] = useMemo(() => {
    if (!toTokenAddress || !marketsInfoData) return [];

    let markets = Object.values(marketsInfoData);

    if (isSwap) {
      return markets;
    }

    markets = Object.values(marketsInfoData).filter(
      (market) => market.indexTokenAddress === convertTokenAddress(chainId, toTokenAddress, "wrapped")
    );

    return markets;
  }, [chainId, isSwap, marketsInfoData, toTokenAddress]);

  const marketsOptions: DropdownOption[] = availableMarkets.map((marketInfo) => ({
    label: marketInfo.name,
    value: marketInfo.marketTokenAddress,
  }));

  const selectedMarket = getByKey(marketsInfoData, marketAddress);
  const prevMarketAddress = usePrevious(marketAddress);
  const isMarketChanged = prevMarketAddress !== marketAddress;

  const swapRoute = useSwapRoute({
    fromTokenAddress: fromTokenInput.tokenAddress,
    toTokenAddress: isPosition ? collateralAddress : toTokenInput.tokenAddress,
  });

  const isWrapOrUnwrap = useMemo(() => {
    if (!isSwap) {
      return false;
    }

    return (
      (fromTokenInput.token?.isNative && toTokenInput.token?.isWrapped) ||
      (fromTokenInput.token?.isWrapped && toTokenInput.token?.isNative)
    );
  }, [
    fromTokenInput.token?.isNative,
    fromTokenInput.token?.isWrapped,
    isSwap,
    toTokenInput.token?.isNative,
    toTokenInput.token?.isWrapped,
  ]);

  const { swapParams, increasePositionParams, decreasePositionParams } = useMemo(
    function getTradeParams() {
      if (isWrapOrUnwrap) {
        if (!fromTokenInput.token?.prices || !toTokenInput.token?.prices) {
          return {};
        }

        const tokenAmount = focusedInput === "from" ? fromTokenInput.tokenAmount : toTokenInput.tokenAmount;
        const usdAmount = focusedInput === "from" ? fromTokenInput.usdAmount : toTokenInput.usdAmount;

        const swapParams: SwapTradeParams = {
          amountIn: tokenAmount,
          usdIn: usdAmount,
          amountOut: tokenAmount,
          usdOut: usdAmount,
          swapPathStats: undefined,
          tokenIn: fromTokenInput.token,
          tokenOut: toTokenInput.token,
          tokenInPrice: fromTokenInput.token.prices?.minPrice,
          tokenOutPrice: toTokenInput.token.prices?.minPrice,
          minOutputAmount: tokenAmount,
        };

        return {
          swapParams,
        };
      }

      if (isSwap) {
        if (!fromTokenInput.token || !toTokenInput.token) return {};

        const swapParams = getSwapTradeParams({
          tokenIn: fromTokenInput.token,
          tokenOut: toTokenInput.token,
          tokenInAmount: focusedInput === "from" ? fromTokenInput.tokenAmount : undefined,
          tokenOutAmount: focusedInput === "to" ? toTokenInput.tokenAmount : undefined,
          triggerRatio: triggerRatio,
          isLimit,
          findSwapPath: swapRoute.findSwapPath,
        });

        return {
          swapParams,
        };
      }

      if (isIncrease) {
        if (!fromTokenInput.token || !toTokenInput.token || !collateralToken || !selectedMarket) return {};

        const increasePositionParams = getIncreasePositionTradeParams({
          marketInfo: selectedMarket,
          initialCollateralToken: fromTokenInput.token,
          collateralToken: collateralToken,
          indexToken: toTokenInput.token,
          initialCollateralAmount: focusedInput === "from" ? fromTokenInput.tokenAmount : undefined,
          indexTokenAmount: focusedInput === "to" ? toTokenInput.tokenAmount : undefined,
          isLong,
          leverage: isLeverageEnabled ? leverage : undefined,
          triggerPrice,
          showPnlInLeverage: savedIsPnlInLeverage,
          allowedSlippage,
          acceptablePriceImpactBps,
          isLimit,
          existingPosition,
          maxLeverage,
          findSwapPath: swapRoute.findSwapPath,
        });

        return {
          increasePositionParams,
        };
      }

      if (isTrigger) {
        if (!collateralToken || !selectedMarket) return {};

        const decreasePositionParams = getDecreasePositionTradeParams({
          marketInfo: selectedMarket,
          collateralToken: collateralToken,
          receiveToken: collateralToken,
          existingPosition,
          sizeDeltaUsd: closeSizeUsd,
          triggerPrice,
          keepLeverage,
          showPnlInLeverage: savedIsPnlInLeverage,
          allowedSlippage,
          acceptablePriceImpactBps,
          maxLeverage,
          isTrigger,
          isLong,
        });

        return {
          decreasePositionParams,
        };
      }

      return {};
    },
    [
      acceptablePriceImpactBps,
      allowedSlippage,
      closeSizeUsd,
      collateralToken,
      existingPosition,
      focusedInput,
      fromTokenInput.token,
      fromTokenInput.tokenAmount,
      fromTokenInput.usdAmount,
      isIncrease,
      isLeverageEnabled,
      isLimit,
      isLong,
      isSwap,
      isTrigger,
      isWrapOrUnwrap,
      keepLeverage,
      leverage,
      maxLeverage,
      savedIsPnlInLeverage,
      selectedMarket,
      swapRoute.findSwapPath,
      toTokenInput.token,
      toTokenInput.tokenAmount,
      toTokenInput.usdAmount,
      triggerPrice,
      triggerRatio,
    ]
  );

  const { swapOutLiquidity, positionCollateralLiquidity, longLiquidity, shortLiquidity } = useMemo(() => {
    if (!selectedMarket) return {};

    return {
      swapOutLiquidity: toTokenInput.tokenAddress
        ? getAvailableUsdLiquidityForCollateral(
            selectedMarket,
            getTokenPoolType(selectedMarket, toTokenInput.tokenAddress) === "long"
          )
        : undefined,
      positionCollateralLiquidity: collateralAddress
        ? getAvailableUsdLiquidityForCollateral(
            selectedMarket,
            getTokenPoolType(selectedMarket, collateralAddress) === "long"
          )
        : undefined,
      longLiquidity: getAvailableUsdLiquidityForPosition(selectedMarket, true),
      shortLiquidity: getAvailableUsdLiquidityForPosition(selectedMarket, false),
    };
  }, [collateralAddress, selectedMarket, toTokenInput.tokenAddress]);

  const mostLiquidSwapMarket = useMemo(() => {
    if (!toTokenInput.tokenAddress) {
      return undefined;
    }

    return getMostLiquidMarketForSwap(availableMarkets, toTokenInput.tokenAddress);
  }, [availableMarkets, toTokenInput.tokenAddress]);

  const isOutPositionLiquidity = isIncrease
    ? isLong
      ? longLiquidity?.lt(increasePositionParams?.sizeDeltaUsd || 0)
      : shortLiquidity?.lt(increasePositionParams?.sizeDeltaUsd || 0)
    : false;

  const optimalPositionMarkets = useMemo(() => {
    const result: {
      marketWithPosition?: MarketInfo;
      collateralWithPosition?: string;
      maxLiquidityMarket?: MarketInfo;
      minPriceImpactMarket?: MarketInfo;
      minAcceptablePriceImpactBps?: BigNumber;
      noSufficientLiquidityInAnyMarket?: boolean;
      shouldShowMarketTooltip?: boolean;
      shouldShowCollateralTooltip?: boolean;
    } = {};

    if (!isPosition || isDataLoading || !toTokenAddress) {
      return result;
    }

    if (isTrigger) {
      if (!existingPosition) {
        const positions = Object.values(positionsData);
        const availablePosition = positions.find(
          (pos) =>
            pos.isLong === isLong && availableMarkets.some((market) => market.marketTokenAddress === pos.marketAddress)
        );

        if (availablePosition) {
          result.marketWithPosition = getByKey(marketsInfoData, availablePosition.marketAddress);
          result.collateralWithPosition = availablePosition.collateralTokenAddress;
        }
      }

      result.shouldShowMarketTooltip =
        Boolean(result.marketWithPosition) && marketAddress !== result.marketWithPosition?.marketTokenAddress;

      result.shouldShowCollateralTooltip =
        Boolean(result.collateralWithPosition) &&
        marketAddress === result.marketWithPosition?.marketTokenAddress &&
        collateralAddress !== result.collateralWithPosition;

      return result;
    }

    result.maxLiquidityMarket = getMostLiquidMarketForPosition(availableMarkets, toTokenAddress, undefined, isLong);

    // initialize with default value;
    const sizeDeltaUsd = increasePositionParams?.sizeDeltaUsd || expandDecimals(1000, USD_DECIMALS)!;

    let liquidMarkets = availableMarkets.filter((marketInfo) => {
      const liquidity = getAvailableUsdLiquidityForPosition(marketInfo, isLong);

      return liquidity?.gt(sizeDeltaUsd);
    });

    if (!liquidMarkets.length) {
      result.noSufficientLiquidityInAnyMarket = true;
      result.shouldShowMarketTooltip = true;

      return result;
    }

    if (!existingPosition) {
      const positions = Object.values(positionsData);
      const availablePosition = positions.find(
        (pos) =>
          pos.isLong === isLong && liquidMarkets.some((market) => market.marketTokenAddress === pos.marketAddress)
      );

      if (availablePosition) {
        result.marketWithPosition = getByKey(marketsInfoData, availablePosition.marketAddress);
        result.collateralWithPosition = availablePosition.collateralTokenAddress;
      }
    }

    let minPriceImpactMarket: MarketInfo | undefined = undefined;
    let minNegativePriceImpactDeltaUsd: BigNumber | undefined = undefined;

    for (const market of liquidMarkets) {
      let priceImpactDeltaUsd = getPriceImpactForPosition(market, sizeDeltaUsd, isLong);

      if (!priceImpactDeltaUsd) {
        continue;
      }

      priceImpactDeltaUsd = getCappedPositionImpactUsd(market, priceImpactDeltaUsd, sizeDeltaUsd);

      if (
        !minNegativePriceImpactDeltaUsd ||
        !minPriceImpactMarket ||
        priceImpactDeltaUsd.gt(minNegativePriceImpactDeltaUsd)
      ) {
        minNegativePriceImpactDeltaUsd = priceImpactDeltaUsd;
        minPriceImpactMarket = market;
      }
    }

    if (
      minPriceImpactMarket &&
      minNegativePriceImpactDeltaUsd &&
      minNegativePriceImpactDeltaUsd.gt(increasePositionParams?.positionPriceImpactDeltaUsd || 0) &&
      minPriceImpactMarket.marketTokenAddress !== selectedMarket?.marketTokenAddress
    ) {
      result.minPriceImpactMarket = minPriceImpactMarket;

      const acceptablePriceData = getAcceptablePrice({
        isIncrease: true,
        isLong,
        sizeDeltaUsd,
        indexPrice: markPrice,
        acceptablePriceImpactBps: isLimit ? acceptablePriceImpactBps : undefined,
        priceImpactDeltaUsd: minNegativePriceImpactDeltaUsd,
        allowedSlippage: isMarket ? allowedSlippage : 0,
      })!;

      result.minAcceptablePriceImpactBps = acceptablePriceData.acceptablePriceImpactBps;
    }

    result.shouldShowMarketTooltip =
      (Boolean(result.marketWithPosition) && marketAddress !== result.marketWithPosition?.marketTokenAddress) ||
      Boolean(result.minPriceImpactMarket);

    result.shouldShowCollateralTooltip =
      Boolean(result.collateralWithPosition) &&
      marketAddress === result.marketWithPosition?.marketTokenAddress &&
      collateralAddress !== result.collateralWithPosition;

    return result;
  }, [
    acceptablePriceImpactBps,
    allowedSlippage,
    availableMarkets,
    collateralAddress,
    existingPosition,
    increasePositionParams?.positionPriceImpactDeltaUsd,
    increasePositionParams?.sizeDeltaUsd,
    isDataLoading,
    isLimit,
    isLong,
    isMarket,
    isPosition,
    isTrigger,
    markPrice,
    marketAddress,
    marketsInfoData,
    positionsData,
    selectedMarket?.marketTokenAddress,
    toTokenAddress,
  ]);

  const fees = swapParams?.fees || increasePositionParams?.fees || decreasePositionParams?.fees;
  const feesType = (() => {
    if (isSwap) return "swap";
    if (isIncrease) return "open";
    return "close";
  })();

  const executionFee = useMemo(() => {
    if (!tokensData || !gasLimits || !gasPrice) return undefined;

    let estimatedGas: BigNumber | undefined;

    if (isSwap) {
      estimatedGas = estimateExecuteSwapOrderGasLimit(gasLimits, {
        swapPath: swapParams?.swapPathStats?.swapPath,
      });
    }

    if (isIncrease) {
      estimatedGas = estimateExecuteIncreaseOrderGasLimit(gasLimits, {
        swapPath: increasePositionParams?.swapPathStats?.swapPath,
      });
    }

    if (isTrigger) {
      estimatedGas = estimateExecuteDecreaseOrderGasLimit(gasLimits, {});
    }

    if (!estimatedGas) return undefined;

    return getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice);
  }, [
    chainId,
    gasLimits,
    gasPrice,
    increasePositionParams?.swapPathStats?.swapPath,
    isIncrease,
    isSwap,
    isTrigger,
    swapParams?.swapPathStats?.swapPath,
    tokensData,
  ]);

  useEffect(
    function updateInputAmounts() {
      if (isSwap !== prevIsISwap) {
        setFocusedInput("from");
        fromTokenInput.setInputValue("");
        return;
      }

      if (isSwap && swapParams) {
        if (focusedInput === "from") {
          toTokenInput.setValueByTokenAmount(swapParams.amountOut);
        } else {
          fromTokenInput.setValueByTokenAmount(swapParams.amountIn);
        }
      }

      if (isIncrease && increasePositionParams) {
        if (focusedInput === "from") {
          toTokenInput.setValueByTokenAmount(increasePositionParams.sizeDeltaAfterFeesInTokens);
        } else {
          fromTokenInput.setValueByTokenAmount(increasePositionParams.initialCollateralAmount);
        }
      }
    },
    [focusedInput, fromTokenInput, increasePositionParams, isIncrease, isSwap, prevIsISwap, swapParams, toTokenInput]
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

      const needFromUpdate = !availableSwapTokens.find((t) => t.address === fromTokenInput.tokenAddress);

      if (needFromUpdate && availableSwapTokens.length) {
        onSelectFromTokenAddress(availableSwapTokens[0].address);
      }

      const needToUpdate = !availableSwapTokens.find((t) => t.address === toTokenInput.tokenAddress);

      if (needToUpdate && availableSwapTokens.length) {
        onSelectToTokenAddress(availableSwapTokens[0].address);
      }
    },
    [availableSwapTokens, fromTokenInput, isSwap, onSelectFromTokenAddress, onSelectToTokenAddress, toTokenInput]
  );

  useEffect(
    function updatePositionTokens() {
      if (!isPosition) return;

      const needFromUpdate = !availableSwapTokens.find((t) => t.address === fromTokenInput.tokenAddress);

      if (needFromUpdate && availableSwapTokens.length) {
        onSelectFromTokenAddress(availableSwapTokens[0].address);
      }

      const needIndexUpdateByAvailableTokens = !availableIndexTokens.find(
        (t) => t.address === toTokenInput.tokenAddress
      );

      if (needIndexUpdateByAvailableTokens && availableIndexTokens.length) {
        onSelectToTokenAddress(availableIndexTokens[0].address);
      }

      const needCollateralUpdate =
        !collateralAddress ||
        (selectedMarket &&
          ![selectedMarket.longTokenAddress, selectedMarket.shortTokenAddress].includes(collateralAddress));

      if (needCollateralUpdate && selectedMarket) {
        onSelectCollateralAddress(isLong ? selectedMarket.longTokenAddress : selectedMarket.shortTokenAddress);
      }
    },
    [
      availableIndexTokens,
      availablePositionCollaterals,
      availableSwapTokens,
      chainId,
      fromTokenInput,
      fromTokenInput.tokenAddress,
      isMarketChanged,
      isPosition,
      isToTokenChanged,
      onSelectCollateralAddress,
      onSelectFromTokenAddress,
      onSelectToTokenAddress,
      collateralAddress,
      selectedMarket,
      toTokenInput,
      isLong,
    ]
  );

  useEffect(
    function updatePositionMarket() {
      if (!isPosition) return;

      const needUpdateMarket = !marketAddress || !availableMarkets.some((m) => m.marketTokenAddress === marketAddress);

      const optimalMarket = optimalPositionMarkets.minPriceImpactMarket || optimalPositionMarkets.maxLiquidityMarket;

      if (needUpdateMarket) {
        onSelectMarketAddress(optimalMarket?.marketTokenAddress);
      }
    },
    [
      availableMarkets,
      chainId,
      isLong,
      isPosition,
      marketAddress,
      onSelectMarketAddress,
      optimalPositionMarkets.maxLiquidityMarket,
      optimalPositionMarkets.minPriceImpactMarket,
    ]
  );

  function onSwitchTokens() {
    const fromToken = fromTokenInput.tokenAddress;
    const toToken = toTokenInput.tokenAddress;

    onSelectFromTokenAddress(toToken);
    fromTokenInput.setInputValue(toTokenInput.inputValue || "");

    onSelectToTokenAddress(fromToken);
    toTokenInput.setInputValue(fromTokenInput.inputValue || "");

    setFocusedInput((old) => (old === "from" ? "to" : "from"));
  }

  const [error] = getError();

  const submitButtonState = getSubmitButtonState();

  function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
    if (typeof error === "string") {
      return {
        text: error,
        disabled: shouldDisableValidation ? false : true,
        onClick: () => setStage("confirmation"),
      };
    }

    let text = "";

    if (isSwap) {
      text = `Swap ${fromTokenInput.token?.symbol}`;
    }

    if (isIncrease) {
      text = `${tradeTypeLabels[tradeType!]} ${toTokenInput.token?.symbol}`;
    }

    if (isTrigger) {
      text = `Create Trigger order`;
    }

    return {
      text,
      onClick: () => setStage("confirmation"),
    };
  }

  function getError() {
    if (IS_NETWORK_DISABLED[chainId]) {
      return [t`App disabled, pending ${getChainName(chainId)} upgrade`];
    }

    // if (hasOutdatedUi) {
    //   return [t`Page outdated, please refresh`];
    // }

    if (isSwap) {
      return getSwapError();
    }

    if (isIncrease) {
      return getIncreaseOrderError();
    }

    if (isTrigger) {
      return getTriggerOrderError();
    }

    return [undefined];
  }

  function getSwapError() {
    if (!isSwap) return [undefined];

    if (IS_NETWORK_DISABLED[chainId]) {
      return [t`Swaps disabled, pending ${getChainName(chainId)} upgrade`];
    }

    if (fromTokenInput.tokenAddress === toTokenInput.tokenAddress || (isWrapOrUnwrap && isLimit)) {
      return [t`Select different tokens`];
    }

    if (!fromTokenInput.tokenAmount.gt(0)) {
      return [t`Enter an amount`];
    }

    if (fromTokenInput.tokenAmount.gt(fromTokenInput.balance || BigNumber.from(0))) {
      return [t`Insufficient ${fromTokenInput.token?.symbol} balance`];
    }

    if (isWrapOrUnwrap) {
      return [undefined];
    }

    if (isMarket && swapOutLiquidity?.lt(toTokenInput.usdAmount)) {
      return [t`Insufficient liquidity`];
    }

    if (
      !swapParams?.swapPathStats?.swapPath ||
      (isMarket && swapParams.swapPathStats.swapSteps.some((step) => step.isOutLiquidity))
    ) {
      return [t`Couldn't find a swap path with enough liquidity`];
    }

    if (fees?.totalFees?.deltaUsd.abs().gt(fromTokenInput.usdAmount)) {
      return [t`Fees exceed amount`];
    }

    if (isLimit) {
      if (!triggerRatio?.ratio.gt(0)) {
        return [t`Enter a  price`];
      }

      const isRatioInverted = [fromTokenInput.token?.wrappedAddress, fromTokenInput.token?.address].includes(
        triggerRatio.largestAddress
      );

      if (triggerRatio && !isRatioInverted && markRatio?.ratio.lt(triggerRatio.ratio)) {
        return [t`Price above Mark Price`];
      }

      if (triggerRatio && isRatioInverted && markRatio?.ratio.gt(triggerRatio.ratio)) {
        return [t`Price below Mark Price`];
      }
    }

    return [undefined];
  }

  function getIncreaseOrderError() {
    if (!isIncrease) return [undefined];

    if (!selectedMarket) {
      return [t`Select a market`];
    }

    if (!fromTokenInput.tokenAmount.gt(0)) {
      return [t`Enter an amount`];
    }

    if (fromTokenInput.tokenAmount.gt(fromTokenInput.balance || BigNumber.from(0))) {
      return [t`Insufficient ${fromTokenInput.token?.symbol} balance`];
    }

    if (
      !existingPosition &&
      increasePositionParams?.collateralUsd?.lt(minCollateralUsd || expandDecimals(10, USD_DECIMALS))
    ) {
      return [t`Min order: ${formatUsd(minCollateralUsd || expandDecimals(10, USD_DECIMALS))}`];
    }

    const { nextPositionValues } = increasePositionParams || {};

    if (nextPositionValues?.nextLeverage && nextPositionValues?.nextLeverage.gt(maxLeverage || MAX_ALLOWED_LEVERAGE)) {
      const maxValue = Number(maxLeverage) || MAX_ALLOWED_LEVERAGE;
      return [t`Max leverage: ${(maxValue / BASIS_POINTS_DIVISOR).toFixed(1)}x`];
    }

    const fromAddress = fromTokenInput.tokenAddress
      ? convertTokenAddress(chainId, fromTokenInput.tokenAddress, "wrapped")
      : undefined;

    const collateralAddress = p.collateralAddress
      ? convertTokenAddress(chainId, p.collateralAddress, "wrapped")
      : undefined;

    const isNeedSwap = fromAddress && collateralAddress && fromAddress !== collateralAddress;

    if (isNeedSwap) {
      if (!increasePositionParams?.swapPathStats?.swapPath?.length) {
        return [t`Couldn't find a swap route with enough liquidity`];
      }

      if (positionCollateralLiquidity?.lt(increasePositionParams?.collateralUsd || BigNumber.from(0))) {
        return [t`Insufficient liquidity`];
      }
    }

    if (fees?.totalFees?.deltaUsd.abs().gt(fromTokenInput.usdAmount)) {
      return [t`Fees exceed amount`];
    }

    const indexToken = getTokenData(tokensData, increasePositionParams?.market.indexTokenAddress, "native");

    if (isLong && indexToken && longLiquidity?.lt(increasePositionParams?.sizeDeltaUsd || BigNumber.from(0))) {
      return [t`Max ${indexToken.symbol} long exceeded`];
    }

    if (isShort && indexToken && shortLiquidity?.lt(increasePositionParams?.sizeDeltaUsd || BigNumber.from(0))) {
      return [t`Max ${indexToken.symbol} short exceeded`];
    }

    if (isLimit) {
      if (!triggerPrice?.gt(0)) {
        return [t`Enter a price`];
      }

      if (isLong && markPrice?.lt(triggerPrice)) {
        return [t`Price above Mark Price`];
      }

      if (!isLong && markPrice?.gt(triggerPrice)) {
        return [t`Price below Mark Price`];
      }
    }

    return [undefined];
  }

  function getTriggerOrderError() {
    if (!isTrigger) return [undefined];

    // if (isSwapAllowed && isContractAccount && isAddressZero(receiveToken?.address)) {
    //   return t`${nativeTokenSymbol} can not be sent to smart contract addresses. Select another token.`;
    // }

    if (!closeSizeUsd?.gt(0)) {
      return [t`Enter a size`];
    }

    if (!triggerPrice?.gt(0)) {
      return [t`Enter a trigger price`];
    }

    if (existingPosition?.liqPrice) {
      if (isLong && triggerPrice?.lte(existingPosition.liqPrice)) {
        return [t`Price below Liq. Price`];
      }

      if (isShort && triggerPrice?.gte(existingPosition.liqPrice)) {
        return [t`Price above Liq. Price`];
      }
    }

    const { nextPositionValues } = decreasePositionParams || {};

    if (nextPositionValues?.nextLeverage && nextPositionValues?.nextLeverage.gt(maxLeverage || MAX_ALLOWED_LEVERAGE)) {
      const maxValue = Number(maxLeverage) || MAX_ALLOWED_LEVERAGE;
      return [t`Max leverage: ${(maxValue / BASIS_POINTS_DIVISOR).toFixed(1)}x`];
    }

    return [undefined];
  }

  function renderTokenInputs() {
    return (
      <>
        <BuyInputSection
          topLeftLabel={t`Pay:`}
          topLeftValue={formatUsd(fromTokenInput.usdAmount)}
          topRightLabel={t`Balance:`}
          topRightValue={formatTokenAmount(fromTokenInput.balance, fromTokenInput.token?.decimals)}
          inputValue={fromTokenInput.inputValue}
          onInputValueChange={(e) => {
            setFocusedInput("from");
            fromTokenInput.setInputValue(e.target.value);
          }}
          showMaxButton={fromTokenInput.isNotMatchAvailableBalance}
          onClickMax={() => {
            setFocusedInput("from");
            fromTokenInput.setValueByTokenAmount(fromTokenInput.balance);
          }}
        >
          {fromTokenInput.tokenAddress && (
            <TokenSelector
              label={t`Pay`}
              chainId={chainId}
              tokenAddress={fromTokenInput.tokenAddress}
              onSelectToken={(token) => onSelectFromTokenAddress(token.address)}
              tokens={availableSwapTokens}
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
            topLeftValue={formatUsd(toTokenInput.usdAmount)}
            topRightLabel={t`Balance:`}
            topRightValue={formatTokenAmount(toTokenInput.balance, toTokenInput.token?.decimals)}
            inputValue={toTokenInput.inputValue}
            onInputValueChange={(e) => {
              setFocusedInput("to");
              toTokenInput.setInputValue(e.target.value);
            }}
            showMaxButton={false}
          >
            {toTokenInput.tokenAddress && (
              <TokenSelector
                label={t`Receive:`}
                chainId={chainId}
                tokenAddress={toTokenInput.tokenAddress}
                onSelectToken={(token) => onSelectToTokenAddress(token.address)}
                tokens={availableSwapTokens}
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
            topLeftValue={formatUsd(increasePositionParams?.sizeDeltaAfterFeesUsd)}
            topRightLabel={t`Leverage:`}
            topRightValue={formatLeverage(leverage)}
            inputValue={toTokenInput.inputValue}
            onInputValueChange={(e) => {
              setFocusedInput("to");
              toTokenInput.setInputValue(e.target.value);
            }}
            showMaxButton={false}
          >
            {toTokenInput.tokenAddress && (
              <TokenSelector
                label={tradeTypeLabels[tradeType!]}
                chainId={chainId}
                tokenAddress={toTokenInput.tokenAddress}
                onSelectToken={(token) => onSelectToTokenAddress(token.address)}
                tokens={availableIndexTokens}
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
        topRightValue={formatUsd(toTokenInput.price)}
        onClickTopRightLabel={() => {
          setTriggerPriceInputValue(formatAmount(toTokenInput.price, USD_DECIMALS, 2));
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
            {getToken(chainId, markRatio.smallestAddress).symbol} per 
            {getToken(chainId, markRatio.largestAddress).symbol}
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
              `${indexToken?.symbol}/USD`
            ) : (
              <Dropdown
                className="SwapBox-market-selector-dropdown"
                selectedOption={{ label: `${indexToken?.symbol}/USD`, value: indexToken?.address }}
                placeholder={"-"}
                options={availableIndexTokens.map((token) => ({ label: `${token.symbol}/USD`, value: token.address }))}
                onSelect={(option) => {
                  onSelectToTokenAddress(option.value);
                }}
              />
            )
          }
        />

        <ExchangeInfoRow
          className="SwapBox-info-row"
          label={
            optimalPositionMarkets.shouldShowMarketTooltip ? (
              <Tooltip
                handle={t`Pool`}
                position="left-bottom"
                className="MarketSelector-tooltip"
                renderContent={() => (
                  <div className="MarketSelector-tooltip-content">
                    {selectedMarket &&
                      isOutPositionLiquidity &&
                      optimalPositionMarkets.maxLiquidityMarket &&
                      optimalPositionMarkets.maxLiquidityMarket.marketTokenAddress !==
                        selectedMarket.marketTokenAddress && (
                        <div className="MarketSelector-tooltip-row">
                          <Trans>
                            Insufficient liquidity in {selectedMarket.name} market pool. <br />
                            <div
                              className="MarketSelector-tooltip-row-action clickable underline muted "
                              onClick={() =>
                                onSelectMarketAddress(optimalPositionMarkets.maxLiquidityMarket!.marketTokenAddress)
                              }
                            >
                              Switch to {optimalPositionMarkets.maxLiquidityMarket.name} market pool.
                            </div>
                          </Trans>
                        </div>
                      )}

                    {optimalPositionMarkets.minPriceImpactMarket && (
                      <div className="MarketSelector-tooltip-row">
                        <Trans>
                          You can get a{" "}
                          {formatPercentage(
                            increasePositionParams?.acceptablePriceImpactBps?.sub(
                              optimalPositionMarkets.minAcceptablePriceImpactBps!
                            )
                          )}{" "}
                          better execution price in the {optimalPositionMarkets.minPriceImpactMarket.name} market pool.
                          <div
                            className="MarketSelector-tooltip-row-action clickable underline muted"
                            onClick={() =>
                              onSelectMarketAddress(optimalPositionMarkets.minPriceImpactMarket!.marketTokenAddress)
                            }
                          >
                            Switch to {optimalPositionMarkets.minPriceImpactMarket.name} market pool.
                          </div>
                        </Trans>
                      </div>
                    )}

                    {!existingPosition && optimalPositionMarkets.marketWithPosition && (
                      <div className="MarketSelector-tooltip-row">
                        <Trans>
                          You have an existing position in the {optimalPositionMarkets.marketWithPosition.name} market
                          pool.{" "}
                          <div
                            className="MarketSelector-tooltip-row-action clickable underline muted"
                            onClick={() => {
                              onSelectMarketAddress(optimalPositionMarkets.marketWithPosition!.marketTokenAddress);
                            }}
                          >
                            Switch to {optimalPositionMarkets.marketWithPosition.name} market pool.
                          </div>{" "}
                        </Trans>
                      </div>
                    )}

                    {optimalPositionMarkets.noSufficientLiquidityInAnyMarket && (
                      <div className="MarketSelector-tooltip-row">
                        <Trans>
                          Insufficient liquidity in any {indexToken?.symbol}/USD market pools for your order.
                        </Trans>
                      </div>
                    )}
                  </div>
                )}
              />
            ) : (
              t`Pool`
            )
          }
          value={
            <>
              <Dropdown
                className="SwapBox-market-selector-dropdown"
                selectedOption={marketsOptions.find((o) => o.value === p.marketAddress)}
                placeholder={"-"}
                options={marketsOptions}
                onSelect={(option) => {
                  p.onSelectMarketAddress(option.value);
                }}
              />
            </>
          }
        />

        {collateralAddress && availablePositionCollaterals && (
          <ExchangeInfoRow
            label={
              optimalPositionMarkets.shouldShowCollateralTooltip ? (
                <Tooltip
                  handle={t`Collateral In`}
                  position="left-bottom"
                  className="MarketSelector-tooltip"
                  renderContent={() => (
                    <div className="MarketSelector-tooltip-content">
                      {optimalPositionMarkets.collateralWithPosition && (
                        <div className="MarketSelector-tooltip-row">
                          <Trans>
                            You have an existing position with{" "}
                            {getToken(chainId, optimalPositionMarkets.collateralWithPosition).symbol} as collateral.{" "}
                            <div
                              className="MarketSelector-tooltip-row-action clickable underline muted"
                              onClick={() => {
                                onSelectCollateralAddress(optimalPositionMarkets.collateralWithPosition);
                              }}
                            >
                              Switch to {getToken(chainId, optimalPositionMarkets.collateralWithPosition).symbol}{" "}
                              collateral.
                            </div>{" "}
                          </Trans>
                        </div>
                      )}
                    </div>
                  )}
                />
              ) : (
                t`Collateral In`
              )
            }
            className="SwapBox-info-row"
            value={
              <TokenSelector
                label={t`Collateral In`}
                className="GlpSwap-from-token"
                chainId={chainId}
                tokenAddress={collateralAddress}
                onSelectToken={(token) => {
                  onSelectCollateralAddress(token.address);
                }}
                tokens={availablePositionCollaterals}
                showTokenImgInDropdown={true}
              />
            }
          />
        )}

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
    const { nextPositionValues, acceptablePrice, acceptablePriceImpactBps, entryMarkPrice } =
      increasePositionParams || {};

    return (
      <>
        <ExchangeInfoRow
          className="SwapBox-info-row"
          label={t`Leverage`}
          value={
            nextPositionValues?.nextLeverage && toTokenInput.usdAmount.gt(0) ? (
              <ValueTransition
                from={formatLeverage(existingPosition?.leverage)}
                to={formatLeverage(nextPositionValues?.nextLeverage) || "-"}
              />
            ) : (
              formatLeverage(leverage)
            )
          }
        />

        <ExchangeInfoRow className="SwapBox-info-row" label={t`Entry Price`} value={formatUsd(entryMarkPrice) || "-"} />

        {isMarket && (
          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Price Impact`}
            value={
              <span className={cx({ positive: acceptablePriceImpactBps?.gt(0) })}>
                {formatPercentage(acceptablePriceImpactBps) || "-"}
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
                onClick={() => setIsAcceptablePriceImpactEditing(true)}
              >
                {formatPercentage(acceptablePriceImpactBps?.mul(-1))}
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
          value={formatUsd(acceptablePrice) || "-"}
        />

        <ExchangeInfoRow
          className="SwapBox-info-row"
          label={t`Liq. Price`}
          value={
            <ValueTransition
              from={nextPositionValues?.nextLiqPrice ? formatUsd(existingPosition?.liqPrice) : undefined}
              to={formatUsd(nextPositionValues?.nextLiqPrice) || "-"}
            />
          }
        />

        <div className="App-card-divider" />
      </>
    );
  }

  function renderTriggerOrderInfo() {
    const { nextPositionValues, isClosing } = decreasePositionParams || {};

    return (
      <>
        {existingPosition && (
          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Leverage`}
            value={
              isClosing ? (
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
                from={formatUsd(existingPosition.collateralUsd)}
                to={formatUsd(nextPositionValues?.nextCollateralUsd)}
              />
            }
          />
        )}

        <ExchangeInfoRow
          className="SwapBox-info-row"
          label={t`Mark Price`}
          value={formatUsd(decreasePositionParams?.exitMarkPrice) || "-"}
        />

        <ExchangeInfoRow
          className="SwapBox-info-row"
          label={t`Trigger Price`}
          value={formatUsd(decreasePositionParams?.triggerPrice) || "-"}
        />

        <ExchangeInfoRow
          className="SwapBox-info-row"
          label={t`Acceptable Price Impact`}
          value={
            <span className="TradeBox-acceptable-price-impact" onClick={() => setIsAcceptablePriceImpactEditing(true)}>
              {formatPercentage(acceptablePriceImpactBps?.mul(-1))}
              <span className="edit-icon" onClick={() => null}>
                <AiOutlineEdit fontSize={16} />
              </span>
            </span>
          }
        />

        <ExchangeInfoRow
          className="SwapBox-info-row"
          label={t`Acceptable Price`}
          value={formatUsd(decreasePositionParams?.acceptablePrice) || "-"}
        />

        {existingPosition && (
          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Liq. Price`}
            value={
              isClosing ? (
                "-"
              ) : (
                <ValueTransition
                  from={formatUsd(existingPosition.liqPrice)!}
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
        </div>

        <div className="Exchange-swap-button-container">
          <SubmitButton
            authRequired
            onConnectWallet={onConnectWallet}
            onClick={submitButtonState.onClick}
            disabled={submitButtonState.disabled}
          >
            {submitButtonState.text}
          </SubmitButton>
        </div>
      </div>

      {isSwap && (
        <SwapCard
          marketAddress={swapParams?.swapPathStats?.targetMarketAddress || mostLiquidSwapMarket?.marketTokenAddress}
          fromTokenAddress={fromTokenInput.tokenAddress}
          toTokenAddress={toTokenInput.tokenAddress}
          markRatio={markRatio}
        />
      )}

      {isPosition && <MarketCard isLong={isLong} marketAddress={marketAddress} />}

      {account && <ClaimableCard onClaimClick={() => setIsClaiming(true)} />}

      {isClaiming && <ClaimModal onClose={() => setIsClaiming(false)} setPendingTxns={setPendingTxns} />}

      {isAcceptablePriceImpactEditing && (
        <AcceptbablePriceImpactEditor
          savedAcceptablePriceImpactBps={savedAcceptablePriceImpactBps!}
          saveAcceptablePriceImpactBps={saveAcceptablePriceImpactBps}
          onClose={() => setIsAcceptablePriceImpactEditing(false)}
        />
      )}

      <ConfirmationBox
        isVisible={stage === "confirmation"}
        tradeType={tradeType!}
        tradeMode={tradeMode!}
        swapParams={swapParams}
        increasePositionParams={increasePositionParams}
        decreasePositionParams={decreasePositionParams}
        markPrice={markPrice}
        markRatio={markRatio}
        ordersData={ordersData}
        executionFee={executionFee}
        existingPosition={existingPosition}
        keepLeverage={keepLeverage}
        setKeepLeverage={setKeepLeverage}
        error={error}
        isWrapOrUnwrap={isWrapOrUnwrap}
        shouldDisableValidation={shouldDisableValidation}
        allowedSlippage={allowedSlippage}
        isHigherSlippageAllowed={isHigherSlippageAllowed}
        setIsHigherSlippageAllowed={setIsHigherSlippageAllowed}
        setPendingTxns={setPendingTxns}
        onSubmitted={() => {
          if (isMarket && !isWrapOrUnwrap) {
            setStage("processing");
          } else {
            setStage("trade");
          }
        }}
        onClose={() => setStage("trade")}
      />

      <OrderStatus
        isVisible={stage === "processing"}
        orderType={isSwap ? OrderType.MarketSwap : OrderType.MarketIncrease}
        marketAddress={isPosition ? p.marketAddress : undefined}
        initialCollateralAddress={isSwap ? fromTokenInput.tokenAddress : undefined}
        initialCollateralAmount={isSwap ? fromTokenInput.tokenAmount : undefined}
        toSwapTokenAddress={isSwap ? toTokenInput.tokenAddress : undefined}
        sizeDeltaUsd={increasePositionParams?.sizeDeltaUsd}
        isLong={isSwap ? undefined : isLong}
        onClose={() => setStage("trade")}
      />
    </>
  );
}
