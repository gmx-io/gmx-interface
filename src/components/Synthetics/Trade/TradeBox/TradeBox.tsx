import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Checkbox from "components/Checkbox/Checkbox";
import { Dropdown, DropdownOption } from "components/Dropdown/Dropdown";
import { InfoRow } from "components/InfoRow/InfoRow";
import { LeverageSlider } from "components/LeverageSlider/LeverageSlider";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import Tab from "components/Tab/Tab";
import TokenSelector from "components/TokenSelector/TokenSelector";
import {
  KEEP_LEVERAGE_FOR_DECREASE_KEY,
  LEVERAGE_ENABLED_KEY,
  LEVERAGE_OPTION_KEY,
  SYNTHETICS_ACCEPTABLE_PRICE_IMPACT_BPS_KEY,
  SYNTHETICS_TRADE_FROM_TOKEN_KEY,
  SYNTHETICS_TRADE_MODE_KEY,
  SYNTHETICS_TRADE_TO_TOKEN_KEY,
} from "config/localStorage";
import { convertTokenAddress, getToken } from "config/tokens";
import {
  getIncreaseOrderAmounts,
  getSwapAmounts,
  getTokensRatio,
  useAvailableSwapOptions,
  useTokenInput,
} from "domain/synthetics/exchange";
import {
  Market,
  getAvailableUsdLiquidityForCollateral,
  getAvailableUsdLiquidityForPosition,
  getMarket,
  getMarketName,
  getMostLiquidMarketForPosition,
  getMostLiquidMarketForSwap,
  isMarketCollateral,
  useMarketsData,
  useMarketsPoolsData,
  useOpenInterestData,
} from "domain/synthetics/markets";
import {
  AggregatedOrdersData,
  OrderType,
  getCollateralDeltaUsdForDecreaseOrder,
  getCollateralOutForDecreaseOrder,
  getNextCollateralUsdForDecreaseOrder,
} from "domain/synthetics/orders";
import {
  AggregatedPositionData,
  formatLeverage,
  getLeverage,
  getLiquidationPrice,
  getMarkPrice,
} from "domain/synthetics/positions";
import { convertToTokenAmount, convertToUsd, getTokenData, useAvailableTokensData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import longImg from "img/long.svg";
import shortImg from "img/short.svg";
import swapImg from "img/swap.svg";
import { useChainId } from "lib/chains";
import { BASIS_POINTS_DIVISOR, DUST_USD, MAX_ALLOWED_LEVERAGE, USD_DECIMALS } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import {
  bigNumberify,
  expandDecimals,
  formatAmount,
  formatPercentage,
  formatTokenAmount,
  formatUsd,
  getBasisPoints,
  parseValue,
} from "lib/numbers";
import { useEffect, useMemo, useState } from "react";
import { IoMdSwap } from "react-icons/io";
import { MarketCard } from "../../MarketCard/MarketCard";
import { OrderStatus } from "../../OrderStatus/OrderStatus";
import { ConfirmationBox } from "../ConfirmationBox/ConfirmationBox";

import { TradeFeesRow } from "components/Synthetics/TradeFeesRow/TradeFeesRow";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { DEFAULT_ACCEPABLE_PRICE_IMPACT_BPS } from "config/synthetics";
import {
  FeeItem,
  TradeFees,
  estimateExecuteDecreaseOrderGasLimit,
  estimateExecuteIncreaseOrderGasLimit,
  estimateExecuteSwapOrderGasLimit,
  getMarketFeesConfig,
  getMinExecutionFee,
  getTotalFeeItem,
  useGasPrice,
} from "domain/synthetics/fees";
import { useMarketsFeesConfigs } from "domain/synthetics/fees/useMarketsFeesConfigs";
import { useSwapRoute } from "domain/synthetics/routing/useSwapRoute";
import { SwapCard } from "../../SwapCard/SwapCard";

import {
  DecreaseTradeParams,
  IncreaseTradeParams,
  SwapTradeParams,
  TokensRatio,
  TradeMode,
  TradeType,
} from "domain/synthetics/exchange/types";

import { IS_NETWORK_DISABLED, getChainName } from "config/chains";
import { useGasLimitsConfig } from "domain/synthetics/fees/useGasLimitsConfig";
import { usePositionsConstants } from "domain/synthetics/positions/usePositionsConstants";
import { usePrevious } from "lib/usePrevious";
import { AiOutlineEdit } from "react-icons/ai";
import { AcceptbablePriceImpactEditor } from "../AcceptablePriceImpactEditor/AcceptablePriceImpactEditor";
import "./TradeBox.scss";

type Props = {
  ordersData: AggregatedOrdersData;
  selectedMarketAddress?: string;
  selectedCollateralAddress?: string;
  selectedTradeType?: TradeType;
  existingPosition?: AggregatedPositionData;
  onSelectMarketAddress: (marketAddress: string) => void;
  onSelectCollateralAddress: (collateralAddress: string) => void;
  onSelectTradeType: (tradeType: TradeType) => void;
  onConnectWallet: () => void;
  savedIsPnlInLeverage: boolean;
};

function getTradeTypeLabels() {
  return {
    [TradeType.Long]: t`Long`,
    [TradeType.Short]: t`Short`,
    [TradeType.Swap]: t`Swap`,
  };
}

function getTradeModeLabels() {
  return {
    [TradeMode.Market]: t`Market`,
    [TradeMode.Limit]: t`Limit`,
    [TradeMode.Trigger]: t`Trigger`,
  };
}

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
    onSelectMarketAddress,
    onSelectTradeType,
    onSelectCollateralAddress,
    onConnectWallet,
    selectedCollateralAddress,
    selectedMarketAddress,
    selectedTradeType,
    existingPosition,
    savedIsPnlInLeverage,
  } = p;
  const { chainId } = useChainId();
  const { tokensData } = useAvailableTokensData(chainId);
  const { marketsData } = useMarketsData(chainId);
  const { poolsData } = useMarketsPoolsData(chainId);
  const { openInterestData } = useOpenInterestData(chainId);
  const { marketsFeesConfigs } = useMarketsFeesConfigs(chainId);
  const { gasPrice } = useGasPrice(chainId);
  const { gasLimits } = useGasLimitsConfig(chainId);
  const { maxLeverage, minCollateralUsd } = usePositionsConstants(chainId);

  const [tradeMode, setTradeMode] = useLocalStorageSerializeKey([chainId, SYNTHETICS_TRADE_MODE_KEY], TradeMode.Market);

  const tradeTypeLabels = getTradeTypeLabels();
  const tradeModeLabels = getTradeModeLabels();

  const isLong = selectedTradeType === TradeType.Long;
  const isShort = selectedTradeType === TradeType.Short;
  const isSwap = selectedTradeType === TradeType.Swap;
  const isPosition = isLong || isShort;
  const isMarket = tradeMode === TradeMode.Market;
  const isLimit = tradeMode === TradeMode.Limit;
  const isTrigger = tradeMode === TradeMode.Trigger;
  const isIncrease = isPosition && (isMarket || isLimit);

  const [stage, setStage] = useState<"trade" | "confirmation" | "processing">("trade");
  const [focusedInput, setFocusedInput] = useState<"from" | "to">();

  const fromTokenInput = useTokenInput(tokensData, {
    priceType: "min",
    localStorageKey: [chainId, SYNTHETICS_TRADE_FROM_TOKEN_KEY, selectedTradeType],
  });

  const toTokenInput = useTokenInput(tokensData, {
    priceType: isShort ? "min" : "max",
    localStorageKey: [chainId, SYNTHETICS_TRADE_TO_TOKEN_KEY, selectedTradeType],
  });

  const prevToTokenAddress = usePrevious(toTokenInput.tokenAddress);
  const isToTokenChanged = prevToTokenAddress !== toTokenInput.tokenAddress;

  const collateralToken = getTokenData(tokensData, selectedCollateralAddress);
  const indexToken = getTokenData(tokensData, toTokenInput.token?.address);

  const [closeSizeInputValue, setCloseSizeInputValue] = useState("");
  const closeSizeUsd = parseValue(closeSizeInputValue || "0", USD_DECIMALS)!;

  const [triggerPriceInputValue, setTriggerPriceInputValue] = useState<string>("");
  const triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);
  const markPrice = getMarkPrice(indexToken?.prices, isIncrease, isLong);
  const entryPrice = isLimit ? triggerPrice : markPrice;

  const [triggerRatioInputValue, setTriggerRatioInputValue] = useState<string>("");
  const markRatio = getTokensRatio({ fromToken: fromTokenInput.token, toToken: toTokenInput.token });
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

  const marketsOptions: DropdownOption[] = Object.values(marketsData).map((markets) => ({
    label: getMarketName(marketsData, tokensData, markets.marketTokenAddress, false, false)!,
    value: markets.marketTokenAddress,
  }));

  const selectedMarket = getMarket(marketsData, selectedMarketAddress);
  const prevSelectedMarketAddress = usePrevious(selectedMarketAddress);
  const isMarketChanged = prevSelectedMarketAddress !== selectedMarketAddress;

  const feesConfig = getMarketFeesConfig(marketsFeesConfigs, p.selectedMarketAddress);

  const swapRoute = useSwapRoute({
    initialColltaralAddress: fromTokenInput.tokenAddress,
    targetCollateralAddress: isPosition ? selectedCollateralAddress : toTokenInput.tokenAddress,
  });

  const {
    swapParams,
    increaseParams,
    fees,
    acceptablePrice,
    priceImpactPriceBps,
    nextFromAmount,
    nextToAmount,
    ...tradeParams
  } = useMemo(() => {
    const tradeParams: {
      swapParams?: SwapTradeParams;
      increaseParams?: IncreaseTradeParams;
      decreaseParams?: DecreaseTradeParams;
      fees?: TradeFees;
      nextFromAmount?: BigNumber;
      nextToAmount?: BigNumber;
      nextMarketAddress?: string;
      acceptablePrice?: BigNumber;
      priceImpactPriceBps?: BigNumber;
      nextSizeUsd?: BigNumber;
      nextCollateralUsd?: BigNumber;
      nextLeverage?: BigNumber;
      nextLiqPrice?: BigNumber;
      collateralAfterFees?: BigNumber;
    } = {};

    if (!fromTokenInput.token?.prices || !toTokenInput.token?.prices) return tradeParams;

    if (isSwap) {
      const swapParams = getSwapAmounts({
        data: {
          marketsData,
          poolsData,
          tokensData,
          feesConfigs: marketsFeesConfigs,
        },
        fromToken: fromTokenInput.token,
        toToken: toTokenInput.token,
        fromAmount: focusedInput === "from" ? fromTokenInput.tokenAmount : undefined,
        toAmount: focusedInput === "to" ? toTokenInput.tokenAmount : undefined,
        triggerRatio: isLimit ? triggerRatio : undefined,
        findSwapPath: swapRoute.findSwapPath,
      });

      if (swapParams) {
        tradeParams.swapParams = swapParams;

        // TODO: less ifs
        if (swapParams?.swapFees) {
          tradeParams.fees = {
            totalFees: swapParams.swapFees.totalFee,
            swapFees: swapParams.swapFees,
          };
        }

        if (focusedInput === "from") {
          tradeParams.nextToAmount = swapParams.toAmount;
        } else {
          tradeParams.nextFromAmount = swapParams.fromAmount;
        }

        return tradeParams;
      }
    }

    if (isIncrease) {
      // todo decompose?
      const increaseParams = getIncreaseOrderAmounts({
        data: {
          marketsData,
          openInterestData,
          poolsData,
          tokensData,
          feesConfigs: marketsFeesConfigs,
        },
        market: selectedMarket,
        indexToken: toTokenInput.token,
        initialCollateral: fromTokenInput.token,
        targetCollateral: collateralToken,
        initialCollateralAmount: focusedInput === "from" ? fromTokenInput.tokenAmount : undefined,
        indexTokenAmount: focusedInput === "to" ? toTokenInput.tokenAmount : undefined,
        isLong,
        leverage: isLeverageEnabled ? leverage : undefined,
        triggerPrice: isLimit ? triggerPrice : undefined,
        findSwapPath: swapRoute.findSwapPath,
      });

      if (increaseParams) {
        tradeParams.increaseParams = increaseParams;

        if (
          !isLimit &&
          increaseParams.priceImpact?.deltaUsd &&
          increaseParams.sizeDeltaAfterFeesUsd?.gt(0) &&
          markPrice
        ) {
          const priceImpactDeltaUsd = increaseParams.priceImpact.deltaUsd;
          const sizeDeltaUsd = increaseParams.sizeDeltaAfterFeesUsd;
          const shouldFlipPriceImpact = isIncrease ? isLong : !isLong;
          const priceImpactForPriceAdjustment = shouldFlipPriceImpact
            ? priceImpactDeltaUsd.mul(-1)
            : priceImpactDeltaUsd;

          tradeParams.acceptablePrice = markPrice
            .mul(sizeDeltaUsd.add(priceImpactForPriceAdjustment))
            .div(sizeDeltaUsd);

          let priceDelta: BigNumber;

          if (shouldFlipPriceImpact) {
            priceDelta = markPrice.sub(tradeParams.acceptablePrice);
          } else {
            priceDelta = tradeParams.acceptablePrice.sub(markPrice);
          }

          tradeParams.priceImpactPriceBps = getBasisPoints(priceDelta, markPrice);
        }

        if ((isLimit || isTrigger) && triggerPrice && acceptablePriceImpactBps && markPrice) {
          const shouldFlipPriceImpact = isIncrease ? isLong : !isLong;

          let priceDelta = triggerPrice.mul(acceptablePriceImpactBps).div(BASIS_POINTS_DIVISOR);
          priceDelta = shouldFlipPriceImpact ? priceDelta?.mul(-1) : priceDelta;

          tradeParams.acceptablePrice = triggerPrice?.sub(priceDelta);
        }

        tradeParams.nextSizeUsd = existingPosition?.sizeInUsd
          ? existingPosition.sizeInUsd.add(increaseParams.sizeDeltaAfterFeesUsd)
          : increaseParams.sizeDeltaAfterFeesUsd;

        tradeParams.nextCollateralUsd = existingPosition?.collateralUsd
          ? existingPosition.collateralUsd.add(increaseParams.collateralUsd)
          : increaseParams.collateralUsd;

        // after fees + pnl + include pnl
        tradeParams.nextLeverage = getLeverage({
          sizeUsd: tradeParams.nextSizeUsd,
          collateralUsd: tradeParams.nextCollateralUsd,
          pnl: savedIsPnlInLeverage ? existingPosition?.pnl : undefined,
          pendingBorrowingFeesUsd: BigNumber.from(0), // deducted on order
          pendingFundingFeesUsd: BigNumber.from(0), // deducted on order
        });

        // TODO: average price?
        // getNextAveragePrice
        const feesConfig = getMarketFeesConfig(marketsFeesConfigs, increaseParams.market.marketTokenAddress);

        // TODO:
        tradeParams.nextLiqPrice = getLiquidationPrice({
          sizeUsd: tradeParams.nextSizeUsd,
          collateralUsd: tradeParams.nextCollateralUsd,
          averagePrice: isLimit ? triggerPrice : markPrice,
          positionFeeFactor: feesConfig?.positionFeeFactor,
          pendingBorrowingFeesUsd: BigNumber.from(0), // deducted on order
          pendingFundingFeesUsd: BigNumber.from(0), // deducted on order
          pnl: existingPosition?.pnl,
          isLong,
        });

        tradeParams.fees = {
          totalFees: getTotalFeeItem(
            [increaseParams.swapFees?.totalFee, increaseParams.positionFee, increaseParams.priceImpact].filter(
              Boolean
            ) as FeeItem[]
          ),
          swapFees: increaseParams.swapFees,
          positionFee: increaseParams.positionFee,
          positionPriceImpact: increaseParams.priceImpact,
        };

        tradeParams.collateralAfterFees = increaseParams.collateralUsd.add(tradeParams.fees.totalFees?.deltaUsd || 0);

        if (focusedInput === "from") {
          tradeParams.nextToAmount = increaseParams.sizeDeltaAfterFeesInTokens;
        } else {
          tradeParams.nextFromAmount = increaseParams.initialCollateralAmount;
        }

        return tradeParams;
      }
    }

    return tradeParams;
  }, [
    acceptablePriceImpactBps,
    collateralToken,
    existingPosition,
    focusedInput,
    fromTokenInput.token,
    fromTokenInput.tokenAmount,
    isIncrease,
    isLeverageEnabled,
    isLimit,
    isLong,
    isSwap,
    isTrigger,
    leverage,
    markPrice,
    marketsData,
    marketsFeesConfigs,
    openInterestData,
    poolsData,
    savedIsPnlInLeverage,
    selectedMarket,
    swapRoute.findSwapPath,
    toTokenInput.token,
    toTokenInput.tokenAmount,
    tokensData,
    triggerPrice,
    triggerRatio,
  ]);

  const swapMarket = useMemo(() => {
    if (swapParams?.swapPath?.length) {
      const marketAddress = swapParams.swapPath[swapParams.swapPath.length - 1];
      return getMarket(marketsData, marketAddress);
    }

    if (toTokenInput.tokenAddress) {
      const market = getMostLiquidMarketForSwap(
        marketsData,
        poolsData,
        openInterestData,
        tokensData,
        convertTokenAddress(chainId, toTokenInput.tokenAddress, "wrapped")
      );

      return market;
    }
  }, [chainId, marketsData, openInterestData, poolsData, swapParams?.swapPath, toTokenInput.tokenAddress, tokensData]);

  const swapOutLiquidity = getAvailableUsdLiquidityForCollateral(
    marketsData,
    poolsData,
    openInterestData,
    tokensData,
    swapMarket?.marketTokenAddress,
    toTokenInput.token?.wrappedAddress || toTokenInput.tokenAddress
  );

  const positionCollateralLiquidity = getAvailableUsdLiquidityForCollateral(
    marketsData,
    poolsData,
    openInterestData,
    tokensData,
    swapMarket?.marketTokenAddress,
    p.selectedCollateralAddress
  );

  const longLiquidity = getAvailableUsdLiquidityForPosition(
    marketsData,
    poolsData,
    openInterestData,
    tokensData,
    p.selectedMarketAddress,
    true
  );

  const shortLiquidity = getAvailableUsdLiquidityForPosition(
    marketsData,
    poolsData,
    openInterestData,
    tokensData,
    p.selectedMarketAddress,
    false
  );

  const receiveToken = collateralToken;

  const receiveTokenLiquidity = getAvailableUsdLiquidityForCollateral(
    marketsData,
    poolsData,
    openInterestData,
    tokensData,
    p.selectedMarketAddress,
    receiveToken?.address
  );

  const executionFee = useMemo(() => {
    if (!gasLimits || !gasPrice) return undefined;

    let estimatedGas: BigNumber;

    if (isSwap) {
      estimatedGas = estimateExecuteSwapOrderGasLimit(gasLimits, {
        swapPath: swapParams?.swapPath,
      });
    } else if (isIncrease) {
      estimatedGas = estimateExecuteIncreaseOrderGasLimit(gasLimits, {
        swapPath: increaseParams?.swapPath,
      });
    } else {
      estimatedGas = estimateExecuteDecreaseOrderGasLimit(gasLimits, {});
    }

    if (!estimatedGas) return undefined;

    return getMinExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice);
  }, [chainId, gasLimits, gasPrice, increaseParams?.swapPath, isIncrease, isSwap, swapParams?.swapPath, tokensData]);

  const isClosing = existingPosition?.sizeInUsd.sub(closeSizeUsd).lt(DUST_USD);

  const nextSizeUsd = isTrigger
    ? isClosing
      ? BigNumber.from(0)
      : existingPosition?.sizeInUsd.sub(closeSizeUsd)
    : increaseParams?.sizeDeltaUsd?.add(existingPosition?.sizeInUsd || BigNumber.from(0));

  const collateralDeltaUsd =
    isTrigger && existingPosition
      ? getCollateralDeltaUsdForDecreaseOrder({
          isClosing,
          keepLeverage,
          sizeDeltaUsd: closeSizeUsd,
          positionCollateralUsd: existingPosition.collateralUsd,
          positionSizeInUsd: existingPosition.sizeInUsd,
        })
      : BigNumber.from(0);

  const collateralDeltaAmount = convertToTokenAmount(
    collateralDeltaUsd,
    existingPosition?.collateralToken?.decimals,
    existingPosition?.collateralToken?.prices?.maxPrice
  );

  const nextCollateralUsd = isTrigger
    ? getNextCollateralUsdForDecreaseOrder({
        isClosing,
        collateralUsd: existingPosition?.collateralUsd,
        collateralDeltaUsd,
        sizeDeltaUsd: closeSizeUsd,
        pnl: existingPosition?.pnl,
      })
    : fromTokenInput.usdAmount?.add(existingPosition?.collateralUsd || BigNumber.from(0));

  const collateralOutAmount = isTrigger
    ? getCollateralOutForDecreaseOrder({
        position: existingPosition,
        indexToken: existingPosition?.indexToken,
        collateralToken: existingPosition?.collateralToken,
        sizeDeltaUsd: closeSizeUsd,
        collateralDeltaAmount: collateralDeltaAmount || BigNumber.from(0),
        pnlToken: existingPosition?.pnlToken,
        feesUsd: BigNumber.from(0),
        priceImpactUsd: BigNumber.from(0),
      })
    : undefined;

  const receiveUsd = convertToUsd(collateralOutAmount, collateralToken?.decimals, collateralToken?.prices?.minPrice);
  const receiveTokenAmount = convertToTokenAmount(
    collateralOutAmount,
    collateralToken?.decimals,
    collateralToken?.prices?.minPrice
  );

  const nextLiqPrice = getLiquidationPrice({
    sizeUsd: nextSizeUsd,
    collateralUsd: nextCollateralUsd,
    averagePrice: triggerPrice || markPrice,
    isLong,
    positionFeeFactor: feesConfig?.positionFeeFactor,
    pendingBorrowingFeesUsd: existingPosition?.pendingBorrowingFees,
    pendingFundingFeesUsd: existingPosition?.pendingFundingFeesUsd,
  });

  const nextPnl = existingPosition?.pnl;

  const nextLeverage = !isTrigger
    ? leverage
    : getLeverage({
        sizeUsd: nextSizeUsd,
        collateralUsd: nextCollateralUsd,
        pnl: savedIsPnlInLeverage ? nextPnl : undefined,
      });

  useEffect(
    function updateInputAmounts() {
      if (nextFromAmount) {
        fromTokenInput.setValueByTokenAmount(nextFromAmount);
      }

      if (nextToAmount) {
        toTokenInput.setValueByTokenAmount(nextToAmount);
      }
    },
    [fromTokenInput, nextFromAmount, nextToAmount, toTokenInput]
  );

  useEffect(
    function updateMode() {
      if (p.selectedTradeType && tradeMode && !avaialbleModes[p.selectedTradeType].includes(tradeMode)) {
        setTradeMode(avaialbleModes[p.selectedTradeType][0]);
      }
    },
    [p.selectedTradeType, setTradeMode, tradeMode]
  );

  useEffect(
    function updateSwapTokens() {
      if (!isSwap) return;

      const needFromUpdate = !availableSwapTokens.find((t) => t.address === fromTokenInput.tokenAddress);

      if (needFromUpdate && availableSwapTokens.length) {
        fromTokenInput.setTokenAddress(availableSwapTokens[0].address);
      }

      const needToUpdate = !availableSwapTokens.find((t) => t.address === toTokenInput.tokenAddress);

      if (needToUpdate && availableSwapTokens.length) {
        toTokenInput.setTokenAddress(availableSwapTokens[0].address);
      }
    },
    [availableSwapTokens, fromTokenInput, isSwap, toTokenInput]
  );

  useEffect(
    function updatePositionTokens() {
      if (!isPosition) return;

      const needFromUpdate = !availableSwapTokens.find((t) => t.address === fromTokenInput.tokenAddress);

      if (needFromUpdate && availableSwapTokens.length) {
        fromTokenInput.setTokenAddress(availableSwapTokens[0].address);
      }

      const needIndexUpdateByAvailableTokens = !availableIndexTokens.find(
        (t) => t.address === toTokenInput.tokenAddress
      );

      const needIndexUpdateByMarket =
        isMarketChanged &&
        !isToTokenChanged &&
        selectedMarket &&
        toTokenInput.tokenAddress &&
        convertTokenAddress(chainId, selectedMarket.indexTokenAddress, "native") !== toTokenInput.tokenAddress;

      if (needIndexUpdateByAvailableTokens) {
        if (selectedMarket) {
          toTokenInput.setTokenAddress(convertTokenAddress(chainId, selectedMarket.indexTokenAddress, "native"));
        } else if (availableIndexTokens.length) {
          toTokenInput.setTokenAddress(availableIndexTokens[0].address);
        }
      } else if (needIndexUpdateByMarket) {
        toTokenInput.setTokenAddress(convertTokenAddress(chainId, selectedMarket.indexTokenAddress, "native"));
      }

      const needCollateralUpdate = !availablePositionCollaterals.find((t) => t.address === selectedCollateralAddress);

      if (needCollateralUpdate && availablePositionCollaterals.length) {
        onSelectCollateralAddress(availablePositionCollaterals[0].address);
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
      selectedCollateralAddress,
      selectedMarket,
      toTokenInput,
    ]
  );

  useEffect(
    function updatePositionMarket() {
      if (!isPosition) return;

      const needInitMarket = !selectedMarketAddress;

      const needUpdateMarketByIndexToken =
        selectedMarket &&
        toTokenInput.tokenAddress &&
        convertTokenAddress(chainId, selectedMarket.indexTokenAddress, "native") !== toTokenInput.tokenAddress;

      const needUpdateMarketByCollateral =
        selectedCollateralAddress && selectedMarket && !isMarketCollateral(selectedMarket, selectedCollateralAddress);

      if (needInitMarket || needUpdateMarketByIndexToken || needUpdateMarketByCollateral) {
        let market: Market | undefined;

        if (toTokenInput.tokenAddress) {
          market = getMostLiquidMarketForPosition(
            marketsData,
            poolsData,
            openInterestData,
            tokensData,
            convertTokenAddress(chainId, toTokenInput.tokenAddress, "wrapped"),
            selectedCollateralAddress,
            isLong
          );
        }

        if (!market) {
          const markets = Object.values(marketsData);
          market = markets[0];
        }

        if (market) {
          onSelectMarketAddress(market.marketTokenAddress);
        }
      }
    },
    [
      chainId,
      isLong,
      isPosition,
      marketsData,
      onSelectMarketAddress,
      openInterestData,
      selectedCollateralAddress,
      selectedMarketAddress,
      poolsData,
      selectedMarket,
      toTokenInput.tokenAddress,
      tokensData,
    ]
  );

  const triggerPricePrefix = getTriggerPricePrefix();

  function getTriggerPricePrefix() {
    if (!triggerPrice || !markPrice) return "";

    if (isTrigger) {
      if (isLong) {
        return triggerPrice.gt(markPrice) ? ">" : "<";
      } else {
        return triggerPrice.lt(markPrice) ? ">" : "<";
      }
    } else {
      if (isLong) {
        return triggerPrice.lt(markPrice) ? ">" : "<";
      } else {
        return triggerPrice.gt(markPrice) ? ">" : "<";
      }
    }
  }

  function onSwitchTokens() {
    const fromToken = fromTokenInput.tokenAddress;
    const toToken = toTokenInput.tokenAddress;

    fromTokenInput.setTokenAddress(toToken);
    fromTokenInput.setInputValue(toTokenInput.inputValue || "");

    toTokenInput.setTokenAddress(fromToken);
    toTokenInput.setInputValue(fromTokenInput.inputValue || "");

    setFocusedInput((old) => (old === "from" ? "to" : "from"));
  }

  const submitButtonState = getSubmitButtonState();

  function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
    const [error] = getCommonError();

    if (typeof error === "string") {
      return {
        text: error,
        disabled: true,
      };
    }

    let text = "";

    if (isSwap) {
      text = `Swap ${fromTokenInput.token?.symbol}`;
    }

    if (isIncrease) {
      text = `${tradeTypeLabels[p.selectedTradeType!]} ${toTokenInput.token?.symbol}`;
    }

    if (isTrigger) {
      text = `Create Trigger order`;
    }

    return {
      text,
      onClick: () => setStage("confirmation"),
    };
  }

  function getCommonError() {
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

    return [false];
  }

  function getSwapError() {
    if (!isSwap) return [false];

    if (IS_NETWORK_DISABLED[chainId]) {
      return [t`Swaps disabled, pending ${getChainName(chainId)} upgrade`];
    }

    if (fromTokenInput.tokenAddress === toTokenInput.tokenAddress) {
      return [t`Select different tokens`];
    }

    if (!fromTokenInput.tokenAmount.gt(0)) {
      return [t`Enter an amount`];
    }

    // if (!toTokenInput.tokenAmount.gt(0)) {
    //   return [t`Enter an amount`];
    // }

    if (fromTokenInput.tokenAmount.gt(fromTokenInput.balance || BigNumber.from(0))) {
      return [t`Insufficient ${fromTokenInput.token?.symbol} balance`];
    }

    if (!swapParams?.swapPath?.length) {
      return [t`Couldn't find a swap path with enough liquidity`];
    }

    if (isMarket && swapOutLiquidity?.lt(toTokenInput.usdAmount)) {
      return [t`Insufficient liquidity`];
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

    return [false];
  }

  function getIncreaseOrderError() {
    if (!isIncrease) return [false];

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
      tradeParams.collateralAfterFees?.lt(minCollateralUsd || expandDecimals(10, USD_DECIMALS))
    ) {
      return [t`Min order: ${formatUsd(minCollateralUsd || expandDecimals(10, USD_DECIMALS))}`];
    }

    if (nextLeverage && nextLeverage.gt(maxLeverage || MAX_ALLOWED_LEVERAGE)) {
      const maxValue = Number(maxLeverage) || MAX_ALLOWED_LEVERAGE;
      return [t`Max leverage: ${(maxValue / BASIS_POINTS_DIVISOR).toFixed(1)}x`];
    }

    const fromAddress = fromTokenInput.tokenAddress
      ? convertTokenAddress(chainId, fromTokenInput.tokenAddress, "wrapped")
      : undefined;

    const collateralAddress = p.selectedCollateralAddress
      ? convertTokenAddress(chainId, p.selectedCollateralAddress, "wrapped")
      : undefined;

    const isNeedSwap = fromAddress && collateralAddress && fromAddress !== collateralAddress;

    if (isNeedSwap) {
      if (!increaseParams?.swapPath?.length) {
        return [t`Couldn't find a swap route with enough liquidity`];
      }

      if (positionCollateralLiquidity?.lt(increaseParams?.collateralUsd || BigNumber.from(0))) {
        return [t`Insufficient liquidity`];
      }
    }

    if (fees?.totalFees?.deltaUsd.abs().gt(fromTokenInput.usdAmount)) {
      return [t`Fees exceed amount`];
    }

    if (isLong && indexToken && longLiquidity?.lt(increaseParams?.sizeDeltaUsd || BigNumber.from(0))) {
      return [t`Max ${indexToken.symbol} long exceeded`];
    }

    if (isShort && indexToken && shortLiquidity?.lt(increaseParams?.sizeDeltaUsd || BigNumber.from(0))) {
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

    return [false];
  }

  function getTriggerOrderError() {
    if (!isTrigger) return [false];

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

    if (nextLeverage && nextLeverage.gt(maxLeverage || MAX_ALLOWED_LEVERAGE)) {
      const maxValue = Number(maxLeverage) || MAX_ALLOWED_LEVERAGE;
      return [t`Max leverage: ${(maxValue / BASIS_POINTS_DIVISOR).toFixed(1)}x`];
    }

    const collateralAddress = p.selectedCollateralAddress
      ? convertTokenAddress(chainId, p.selectedCollateralAddress, "wrapped")
      : undefined;
    const receiveAddress = receiveToken ? convertTokenAddress(chainId, receiveToken.address, "wrapped") : undefined;

    const needSwap = collateralAddress && receiveAddress && collateralAddress !== receiveAddress;

    if (needSwap) {
      if (receiveTokenLiquidity?.lt(receiveUsd || 0)) {
        return [t`Insufficient receive token liquidity`];
      }
    }

    // const isNotEnoughReceiveTokenLiquidity = receiveUsd && receiveTokenLiquidity?.lt(receiveUsd);

    // if (isNotEnoughReceiveTokenLiquidity) {
    //   return [t`Insufficient receive token liquidity`]
    // }

    return [false];
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
              onSelectToken={(token) => fromTokenInput.setTokenAddress(token.address)}
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
                onSelectToken={(token) => toTokenInput.setTokenAddress(token.address)}
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
            topLeftLabel={`${tradeTypeLabels[p.selectedTradeType!]}:`}
            topLeftValue={formatUsd(increaseParams?.sizeDeltaAfterFeesUsd)}
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
                label={tradeTypeLabels[p.selectedTradeType!]}
                chainId={chainId}
                tokenAddress={toTokenInput.tokenAddress}
                onSelectToken={(token) => toTokenInput.setTokenAddress(token.address)}
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

        <InfoRow
          label={t`Market`}
          className="SwapBox-info-row SwapBox-market-selector"
          value={
            <>
              {isTrigger && (
                <Dropdown
                  className="SwapBox-market-selector-dropdown"
                  selectedOption={marketsOptions.find((o) => o.value === p.selectedMarketAddress)}
                  placeholder={"-"}
                  options={marketsOptions}
                  onSelect={(option) => {
                    p.onSelectMarketAddress(option.value);
                  }}
                />
              )}
              {isIncrease && (getMarketName(marketsData, tokensData, p.selectedMarketAddress, false, false) || "-")}
            </>
          }
        />

        {selectedCollateralAddress && availablePositionCollaterals && (
          <InfoRow
            label={t`Collateral In`}
            className="SwapBox-info-row"
            value={
              <TokenSelector
                label={t`Collateral In`}
                className="GlpSwap-from-token"
                chainId={chainId}
                tokenAddress={selectedCollateralAddress}
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
    return (
      <>
        <InfoRow
          className="SwapBox-info-row"
          label={t`Leverage`}
          value={
            tradeParams.nextLeverage && toTokenInput.usdAmount.gt(0) ? (
              <ValueTransition
                from={formatLeverage(existingPosition?.leverage)}
                to={formatLeverage(tradeParams.nextLeverage) || "-"}
              />
            ) : (
              formatLeverage(leverage)
            )
          }
        />

        <InfoRow className="SwapBox-info-row" label={t`Entry Price`} value={formatUsd(entryPrice) || "-"} />

        <InfoRow className="SwapBox-info-row" label={t`Acceptable Price`} value={formatUsd(acceptablePrice) || "-"} />

        {isMarket && (
          <InfoRow
            className="SwapBox-info-row"
            label={t`Price Impact`}
            value={
              <span className={cx({ positive: priceImpactPriceBps?.gt(0) })}>
                {formatPercentage(priceImpactPriceBps) || "-"}
              </span>
            }
          />
        )}
        {isLimit && (
          <InfoRow
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
        <InfoRow
          className="SwapBox-info-row"
          label={t`Liq. Price`}
          value={
            <ValueTransition
              from={tradeParams.nextLiqPrice ? formatUsd(existingPosition?.liqPrice) : undefined}
              to={formatUsd(tradeParams.nextLiqPrice) || "-"}
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
          <InfoRow
            className="SwapBox-info-row"
            label={t`Leverage`}
            value={
              tradeParams.nextLeverage && toTokenInput.usdAmount.gt(0) ? (
                <ValueTransition
                  from={formatLeverage(existingPosition?.leverage)}
                  to={formatLeverage(tradeParams.nextLeverage) || "-"}
                />
              ) : (
                formatLeverage(leverage)
              )
            }
          />
        )}

        {existingPosition?.sizeInUsd.gt(0) && (
          <InfoRow
            className="SwapBox-info-row"
            label={t`Size`}
            value={<ValueTransition from={formatUsd(existingPosition.sizeInUsd)!} to={undefined} />}
          />
        )}

        {existingPosition && (
          <InfoRow
            className="SwapBox-info-row"
            label={t`Collateral (${existingPosition?.collateralToken?.symbol})`}
            value={<ValueTransition from={formatUsd(existingPosition.collateralUsd)} to={undefined} />}
          />
        )}

        <InfoRow className="SwapBox-info-row" label={t`Mark Price`} value={formatUsd(markPrice) || "-"} />

        <InfoRow className="SwapBox-info-row" label={t`Trigger Price`} value={formatUsd(triggerPrice) || "-"} />
        <InfoRow className="SwapBox-info-row" label={t`Acceptable Price`} value={formatUsd(acceptablePrice) || "-"} />

        <InfoRow
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

        {existingPosition && (
          <InfoRow
            className="SwapBox-info-row"
            label={t`Liq. Price`}
            value={<ValueTransition from={formatUsd(existingPosition.liqPrice)!} to={undefined} />}
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
          option={p.selectedTradeType}
          onChange={onSelectTradeType}
          className="SwapBox-option-tabs"
        />

        <Tab
          options={avaialbleModes[p.selectedTradeType!]}
          optionLabels={tradeModeLabels}
          className="SwapBox-asset-options-tabs"
          type="inline"
          option={tradeMode}
          onChange={setTradeMode}
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
            totalFees={fees?.totalFees}
            swapPathStats={fees?.swapFees}
            positionFee={fees?.positionFee}
            positionPriceImpact={fees?.positionPriceImpact}
            positionFeeFactor={feesConfig?.positionFeeFactor}
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

      <div className="SwapBox-section">
        {isSwap && (
          <SwapCard
            marketAddress={swapMarket?.marketTokenAddress}
            fromTokenAddress={fromTokenInput.tokenAddress}
            toTokenAddress={toTokenInput.tokenAddress}
            markRatio={markRatio}
          />
        )}
        {isPosition && <MarketCard isLong={isLong} marketAddress={selectedMarketAddress} />}
      </div>

      {isAcceptablePriceImpactEditing && (
        <AcceptbablePriceImpactEditor
          savedAcceptablePriceImpactBps={savedAcceptablePriceImpactBps!}
          saveAcceptablePriceImpactBps={saveAcceptablePriceImpactBps}
          onClose={() => setIsAcceptablePriceImpactEditing(false)}
        />
      )}

      {stage === "confirmation" && (
        <ConfirmationBox
          fromTokenAddress={fromTokenInput.tokenAddress!}
          fromTokenAmount={fromTokenInput.tokenAmount}
          fromTokenPrice={fromTokenInput.price}
          toTokenAddress={toTokenInput.tokenAddress!}
          toTokenAmount={toTokenInput.tokenAmount}
          toTokenPrice={toTokenInput.price}
          collateralTokenAddress={p.selectedCollateralAddress}
          selectedMarketAddress={p.selectedMarketAddress}
          collateralDeltaAmount={collateralDeltaAmount}
          triggerPricePrefix={triggerPricePrefix}
          triggerPrice={triggerPrice}
          entryPrice={entryPrice}
          existingPosition={existingPosition}
          markPrice={markPrice}
          nextLiqPrice={nextLiqPrice}
          triggerRatio={triggerRatio}
          markRatio={markRatio}
          nextLeverage={nextLeverage}
          keepLeverage={keepLeverage}
          nextSizeUsd={nextSizeUsd}
          nextCollateralUsd={nextCollateralUsd}
          collateralAfterFees={tradeParams.collateralAfterFees}
          acceptablePrice={toTokenInput.price!}
          closeSizeUsd={closeSizeUsd}
          ordersData={p.ordersData}
          sizeDeltaUsd={increaseParams?.sizeDeltaUsd}
          collateralDeltaUsd={collateralDeltaUsd}
          receiveToken={collateralToken}
          receiveTokenAmount={receiveTokenAmount}
          receiveUsd={receiveUsd}
          executionFee={executionFee}
          fees={fees as any}
          swapPath={swapParams?.swapPath || increaseParams?.swapPath}
          mode={tradeMode!}
          operationType={p.selectedTradeType!}
          onSubmitted={() => {
            if (isMarket) {
              setStage("processing");
            } else {
              setStage("trade");
            }
          }}
          onClose={() => setStage("trade")}
          setKeepLeverage={setKeepLeverage}
        />
      )}

      {stage === "processing" && (
        <OrderStatus
          orderType={isSwap ? OrderType.MarketSwap : OrderType.MarketIncrease}
          marketAddress={p.selectedMarketAddress}
          initialCollateralAddress={isSwap ? fromTokenInput.tokenAddress : undefined}
          initialCollateralAmount={isSwap ? fromTokenInput.tokenAmount : undefined}
          toSwapTokenAddress={isSwap ? toTokenInput.tokenAddress : undefined}
          sizeDeltaUsd={increaseParams?.sizeDeltaUsd}
          isLong={isSwap ? undefined : isLong}
          onClose={() => setStage("trade")}
        />
      )}
    </>
  );
}
