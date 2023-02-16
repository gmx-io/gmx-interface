import { Trans, t } from "@lingui/macro";
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
  SLIPPAGE_BPS_KEY,
  SYNTHETICS_ACCEPTABLE_PRICE_IMPACT_BPS_KEY,
  SYNTHETICS_TRADE_FROM_TOKEN_KEY,
  SYNTHETICS_TRADE_MODE_KEY,
  SYNTHETICS_TRADE_TO_TOKEN_KEY,
} from "config/localStorage";
import { convertTokenAddress, getToken } from "config/tokens";
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
import { AggregatedOrdersData, OrderType } from "domain/synthetics/orders";
import { AggregatedPositionData, formatLeverage, getMarkPrice } from "domain/synthetics/positions";
import { TokensRatio, getTokenData, getTokensRatio, useAvailableTokensData } from "domain/synthetics/tokens";
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
import cx from "classnames";
import { IoMdSwap } from "react-icons/io";
import { MarketCard } from "../../MarketCard/MarketCard";

import { TradeFeesRow } from "components/Synthetics/TradeFeesRow/TradeFeesRow";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { DEFAULT_ACCEPABLE_PRICE_IMPACT_BPS } from "config/synthetics";
import {
  estimateExecuteDecreaseOrderGasLimit,
  estimateExecuteIncreaseOrderGasLimit,
  estimateExecuteSwapOrderGasLimit,
  getExecutionFee,
  useGasPrice,
} from "domain/synthetics/fees";
import { useMarketsFeesConfigs } from "domain/synthetics/fees/useMarketsFeesConfigs";
import { SwapCard } from "../../SwapCard/SwapCard";

import { SwapTradeParams, TradeMode, TradeType } from "domain/synthetics/trade/types";

import { IS_NETWORK_DISABLED, getChainName } from "config/chains";
import { useGasLimitsConfig } from "domain/synthetics/fees/useGasLimitsConfig";
import { usePositionsConstants } from "domain/synthetics/positions/usePositionsConstants";
import { usePrevious } from "lib/usePrevious";
import { AiOutlineEdit } from "react-icons/ai";
import { AcceptbablePriceImpactEditor } from "../AcceptablePriceImpactEditor/AcceptablePriceImpactEditor";
import { ConfirmationBox } from "../ConfirmationBox/ConfirmationBox";
import { OrderStatus } from "components/Synthetics/OrderStatus/OrderStatus";

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
  setSelectedToTokenAddress: (toTokenAddress: string) => void;
  selectedToTokenAddress?: string;
  shouldDisableValidation?: boolean;
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
    onSelectMarketAddress,
    onSelectTradeType,
    onSelectCollateralAddress,
    onConnectWallet,
    selectedCollateralAddress,
    selectedMarketAddress,
    selectedTradeType,
    existingPosition,
    ordersData,
    savedIsPnlInLeverage,
    shouldDisableValidation,
    setSelectedToTokenAddress,
    selectedToTokenAddress,
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
    selectedTradeType!,
    tradeMode!
  );

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

  const marketsOptions: DropdownOption[] = Object.values(marketsData).map((markets) => ({
    label: getMarketName(marketsData, tokensData, markets.marketTokenAddress, false, false)!,
    value: markets.marketTokenAddress,
  }));

  const selectedMarket = getMarket(marketsData, selectedMarketAddress);
  const prevSelectedMarketAddress = usePrevious(selectedMarketAddress);
  const isMarketChanged = prevSelectedMarketAddress !== selectedMarketAddress;

  const mostLiquidSwapMarket = useMemo(() => {
    if (!isSwap || !toTokenInput.tokenAddress) {
      return undefined;
    }

    return getMostLiquidMarketForSwap(
      marketsData,
      poolsData,
      openInterestData,
      tokensData,
      convertTokenAddress(chainId, toTokenInput.tokenAddress, "wrapped")
    );
  }, [chainId, isSwap, marketsData, openInterestData, poolsData, toTokenInput.tokenAddress, tokensData]);

  const swapRoute = useSwapRoute({
    fromTokenAddress: fromTokenInput.tokenAddress,
    toTokenAddress: isPosition ? selectedCollateralAddress : toTokenInput.tokenAddress,
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
          marketsData,
          poolsData,
          tokensData,
          feesConfigs: marketsFeesConfigs,
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
          marketsData,
          poolsData,
          tokensData,
          openInterestData: openInterestData,
          feesConfigs: marketsFeesConfigs,
          initialCollateralToken: fromTokenInput.token,
          collateralToken: collateralToken,
          market: selectedMarket,
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
          marketsData,
          poolsData,
          tokensData,
          openInterestData: openInterestData,
          feesConfigs: marketsFeesConfigs,
          market: selectedMarket,
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
      marketsData,
      marketsFeesConfigs,
      maxLeverage,
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
    ]
  );

  const fees = swapParams?.fees || increasePositionParams?.fees || decreasePositionParams?.fees;

  const swapOutLiquidity = getAvailableUsdLiquidityForCollateral(
    marketsData,
    poolsData,
    openInterestData,
    tokensData,
    swapParams?.swapPathStats?.targetMarketAddress,
    toTokenInput.token?.wrappedAddress || toTokenInput.tokenAddress
  );

  const positionCollateralLiquidity = getAvailableUsdLiquidityForCollateral(
    marketsData,
    poolsData,
    openInterestData,
    tokensData,
    increasePositionParams?.swapPathStats?.targetMarketAddress,
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

  const executionFee = useMemo(() => {
    if (!gasLimits || !gasPrice) return undefined;

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
    [focusedInput, fromTokenInput, increasePositionParams, isIncrease, isSwap, swapParams, toTokenInput]
  );

  useEffect(
    function updateMode() {
      if (selectedTradeType && tradeMode && !avaialbleModes[selectedTradeType].includes(tradeMode)) {
        setTradeMode(avaialbleModes[selectedTradeType][0]);
      }
    },
    [selectedTradeType, setTradeMode, tradeMode]
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

      if (toTokenInput.tokenAddress && selectedToTokenAddress !== toTokenInput.tokenAddress) {
        setSelectedToTokenAddress(toTokenInput.tokenAddress);
      }
    },
    [availableSwapTokens, fromTokenInput, isSwap, selectedToTokenAddress, setSelectedToTokenAddress, toTokenInput]
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

  function onSwitchTokens() {
    const fromToken = fromTokenInput.tokenAddress;
    const toToken = toTokenInput.tokenAddress;

    fromTokenInput.setTokenAddress(toToken);
    fromTokenInput.setInputValue(toTokenInput.inputValue || "");

    toTokenInput.setTokenAddress(fromToken);
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

    const collateralAddress = p.selectedCollateralAddress
      ? convertTokenAddress(chainId, p.selectedCollateralAddress, "wrapped")
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
    const { nextPositionValues, acceptablePrice, acceptablePriceImpactBps, entryMarkPrice } =
      increasePositionParams || {};

    return (
      <>
        <InfoRow
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

        <InfoRow className="SwapBox-info-row" label={t`Entry Price`} value={formatUsd(entryMarkPrice) || "-"} />

        <InfoRow className="SwapBox-info-row" label={t`Acceptable Price`} value={formatUsd(acceptablePrice) || "-"} />

        {isMarket && (
          <InfoRow
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
          <InfoRow
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
          <InfoRow
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
          <InfoRow
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

        <InfoRow
          className="SwapBox-info-row"
          label={t`Mark Price`}
          value={formatUsd(decreasePositionParams?.exitMarkPrice) || "-"}
        />

        <InfoRow
          className="SwapBox-info-row"
          label={t`Trigger Price`}
          value={formatUsd(decreasePositionParams?.triggerPrice) || "-"}
        />

        <InfoRow
          className="SwapBox-info-row"
          label={t`Acceptable Price`}
          value={formatUsd(decreasePositionParams?.acceptablePrice) || "-"}
        />

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
            swapFees={fees?.swapFees}
            positionFee={fees?.positionFee}
            swapPriceImpact={fees?.swapPriceImpact}
            positionPriceImpact={fees?.positionPriceImpact}
            positionFeeFactor={fees?.positionFeeFactor}
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
            marketAddress={swapParams?.swapPathStats?.targetMarketAddress || mostLiquidSwapMarket?.marketTokenAddress}
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

      <ConfirmationBox
        isVisible={stage === "confirmation"}
        tradeType={selectedTradeType!}
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
        marketAddress={isPosition ? p.selectedMarketAddress : undefined}
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
