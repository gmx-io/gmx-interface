import { Trans, t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { BigNumber } from "ethers";
import { ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import { IoMdSwap } from "react-icons/io";
import { useKey, useLatest, usePrevious } from "react-use";

import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { LeverageSlider } from "components/LeverageSlider/LeverageSlider";
import { MarketSelector } from "components/MarketSelector/MarketSelector";
import { ConfirmationBox } from "components/Synthetics/ConfirmationBox/ConfirmationBox";
import Tab from "components/Tab/Tab";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import TokenWithIcon from "components/TokenIcon/TokenWithIcon";
import TokenSelector from "components/TokenSelector/TokenSelector";
import Tooltip from "components/Tooltip/Tooltip";
import { ValueTransition } from "components/ValueTransition/ValueTransition";
import { BASIS_POINTS_DIVISOR, MAX_ALLOWED_LEVERAGE } from "config/factors";
import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { MAX_METAMASK_MOBILE_DECIMALS, V2_LEVERAGE_SLIDER_MARKS } from "config/ui";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import {
  useMarketsInfoData,
  useTokensData,
  useUiFeeFactor,
  useUserReferralInfo,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useSwapRoutes, useTradeRatios } from "context/SyntheticsStateContext/hooks/tradeHooks";
import {
  useTradeboxDecreasePositionAmounts,
  useTradeboxExistingOrder,
  useTradeboxIncreasePositionAmounts,
  useTradeboxLeverage,
  useTradeboxNextLeverageWithoutPnl,
  useTradeboxNextPositionValues,
  useTradeboxSelectedPosition,
  useTradeboxState,
  useTradeboxSwapAmounts,
  useTradeboxTradeFlags,
} from "context/SyntheticsStateContext/hooks/tradeboxHooks";
import { selectSavedAcceptablePriceImpactBuffer } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { selectTradeboxSwapRoutes } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useHasOutdatedUi } from "domain/legacy";
import {
  estimateExecuteDecreaseOrderGasLimit,
  estimateExecuteIncreaseOrderGasLimit,
  estimateExecuteSwapOrderGasLimit,
  getExecutionFee,
  useGasLimits,
  useGasPrice,
} from "domain/synthetics/fees";
import { getAvailableUsdLiquidityForPosition, getMarketIndexName } from "domain/synthetics/markets";
import { DecreasePositionSwapType } from "domain/synthetics/orders";
import {
  formatLeverage,
  formatLiquidationPrice,
  getTriggerNameByOrderType,
  substractMaxLeverageSlippage,
  usePositionsConstantsRequest,
} from "domain/synthetics/positions";
import { convertToUsd } from "domain/synthetics/tokens";
import {
  AvailableTokenOptions,
  TradeFeesType,
  TradeMode,
  TradeType,
  getExecutionPriceForDecrease,
  getIncreasePositionAmounts,
  getMarkPrice,
  getNextPositionValuesForIncreaseTrade,
  getTradeFees,
} from "domain/synthetics/trade";
import { useAvailableMarketsOptions } from "domain/synthetics/trade/useAvailableMarketsOptions";
import { usePriceImpactWarningState } from "domain/synthetics/trade/usePriceImpactWarningState";
import {
  ValidationResult,
  getCommonError,
  getDecreaseError,
  getIncreaseError,
  getSwapError,
  getIsMaxLeverageExceeded,
} from "domain/synthetics/trade/utils/validation";
import { getMinResidualAmount } from "domain/tokens";
import longImg from "img/long.svg";
import shortImg from "img/short.svg";
import swapImg from "img/swap.svg";
import { numericBinarySearch } from "lib/binarySearch";
import { useChainId } from "lib/chains";
import { USD_DECIMALS } from "lib/legacy";
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
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import { mustNeverExist } from "lib/types";
import useIsMetamaskMobile from "lib/wallets/useIsMetamaskMobile";
import useWallet from "lib/wallets/useWallet";

import { HighPriceImpactWarning } from "../HighPriceImpactWarning/HighPriceImpactWarning";
import { MarketCard } from "../MarketCard/MarketCard";
import { SwapCard } from "../SwapCard/SwapCard";
import { TradeFeesRow } from "../TradeFeesRow/TradeFeesRow";
import { CollateralSelectorRow } from "./CollateralSelectorRow";
import { MarketPoolSelectorRow } from "./MarketPoolSelectorRow";
import { NetworkFeeRow } from "../NetworkFeeRow/NetworkFeeRow";

import "./TradeBox.scss";
import { useHistory } from "react-router-dom";
import { helperToast } from "lib/helperToast";
import { useCursorInside } from "lib/useCursorInside";

export type Props = {
  avaialbleTokenOptions: AvailableTokenOptions;
  allowedSlippage: number;
  isHigherSlippageAllowed: boolean;
  shouldDisableValidation?: boolean;
  setIsHigherSlippageAllowed: (value: boolean) => void;
  setPendingTxns: (txns: any) => void;
};

const tradeTypeIcons = {
  [TradeType.Long]: longImg,
  [TradeType.Short]: shortImg,
  [TradeType.Swap]: swapImg,
};

const tradeModeLabels = {
  [TradeMode.Market]: t`Market`,
  [TradeMode.Limit]: t`Limit`,
  [TradeMode.Trigger]: t`TP/SL`,
};

const tradeTypeLabels = {
  [TradeType.Long]: t`Long`,
  [TradeType.Short]: t`Short`,
  [TradeType.Swap]: t`Swap`,
};

export function TradeBox(p: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const isCursorInside = useCursorInside(formRef);

  const { avaialbleTokenOptions, shouldDisableValidation, allowedSlippage, setPendingTxns } = p;

  const { openConnectModal } = useConnectModal();
  const history = useHistory();
  const {
    swapTokens,
    indexTokens,
    infoTokens,
    sortedIndexTokensWithPoolValue,
    sortedLongAndShortTokens,
    sortedAllMarkets,
  } = avaialbleTokenOptions;
  const tokensData = useTokensData();
  const marketsInfoData = useMarketsInfoData();

  const tradeFlags = useTradeboxTradeFlags();
  const { isLong, isSwap, isIncrease, isPosition, isLimit, isTrigger, isMarket } = tradeFlags;

  const { chainId } = useChainId();
  const { account } = useWallet();
  const isMetamaskMobile = useIsMetamaskMobile();
  const { gasPrice } = useGasPrice(chainId);
  const { gasLimits } = useGasLimits(chainId);
  const { showDebugValues } = useSettings();
  const { data: hasOutdatedUi } = useHasOutdatedUi();

  const { minCollateralUsd } = usePositionsConstantsRequest(chainId);

  const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS);
  const minResidualAmount = getMinResidualAmount(nativeToken?.decimals, nativeToken?.prices.maxPrice);
  const {
    fromTokenInputValue,
    setFromTokenInputValue: setFromTokenInputValueRaw,
    toTokenInputValue,
    setToTokenInputValue: setToTokenInputValueRaw,
    setMarketAddress: onSelectMarketAddress,
    setCollateralAddress: onSelectCollateralAddress,
    setFromTokenAddress: onSelectFromTokenAddress,
    setToTokenAddress: onSelectToTokenAddress,
    setTradeType: onSelectTradeType,
    setTradeMode: onSelectTradeMode,
    stage,
    setStage,
    focusedInput,
    setFocusedInput,
    fixedTriggerThresholdType,
    setFixedTriggerThresholdType,
    fixedTriggerOrderType,
    setFixedTriggerOrderType,
    setDefaultTriggerAcceptablePriceImpactBps,
    selectedTriggerAcceptablePriceImpactBps,
    setSelectedAcceptablePriceImpactBps,
    closeSizeInputValue,
    setCloseSizeInputValue,
    triggerPriceInputValue,
    setTriggerPriceInputValue,
    triggerRatioInputValue,
    setTriggerRatioInputValue,
    leverageOption,
    setLeverageOption,
    isLeverageEnabled,
    setIsLeverageEnabled,
    keepLeverage,
    setKeepLeverage,
    isWrapOrUnwrap,
    switchTokenAddresses,
    tradeMode,
    tradeType,
    collateralAddress,
    collateralToken,
    fromTokenAddress,
    marketAddress,
    marketInfo,
    toTokenAddress,
    avaialbleTradeModes: availalbleTradeModes,
  } = useTradeboxState();

  const fromToken = getByKey(tokensData, fromTokenAddress);
  const toToken = getByKey(tokensData, toTokenAddress);
  const fromTokenAmount = fromToken ? parseValue(fromTokenInputValue || "0", fromToken.decimals)! : BigNumber.from(0);
  const toTokenAmount = toToken ? parseValue(toTokenInputValue || "0", toToken.decimals)! : BigNumber.from(0);
  const fromTokenPrice = fromToken?.prices.minPrice;
  const fromUsd = convertToUsd(fromTokenAmount, fromToken?.decimals, fromTokenPrice);
  const isNotMatchAvailableBalance =
    fromToken?.balance?.gt(0) &&
    !fromToken.balance.eq(fromTokenAmount) &&
    (fromToken?.isNative ? minResidualAmount && fromToken.balance.gt(minResidualAmount) : true);

  const nextLeverageWithoutPnl = useTradeboxNextLeverageWithoutPnl();

  const markPrice = useMemo(() => {
    if (!toToken) {
      return undefined;
    }

    if (isSwap) {
      return toToken.prices.minPrice;
    }

    return getMarkPrice({ prices: toToken.prices, isIncrease, isLong });
  }, [isIncrease, isLong, isSwap, toToken]);

  const closeSizeUsd = parseValue(closeSizeInputValue || "0", USD_DECIMALS)!;
  const triggerPrice = parseValue(triggerPriceInputValue, USD_DECIMALS);

  const uiFeeFactor = useUiFeeFactor();

  const swapRoute = useSwapRoutes(fromTokenAddress, isPosition ? collateralAddress : toTokenAddress);
  const swapAmounts = useTradeboxSwapAmounts();
  const increaseAmounts = useTradeboxIncreasePositionAmounts();
  const decreaseAmounts = useTradeboxDecreasePositionAmounts();
  const selectedPosition = useTradeboxSelectedPosition();
  const existingOrder = useTradeboxExistingOrder();
  const leverage = useTradeboxLeverage();

  const nextPositionValues = useTradeboxNextPositionValues();

  const { fees, feesType, executionFee } = useMemo(() => {
    if (!gasLimits || !gasPrice || !tokensData) {
      return {};
    }

    if (isSwap && swapAmounts?.swapPathStats) {
      const estimatedGas = estimateExecuteSwapOrderGasLimit(gasLimits, {
        swapsCount: swapAmounts.swapPathStats.swapPath.length,
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
          priceImpactDiffUsd: BigNumber.from(0),
          borrowingFeeUsd: BigNumber.from(0),
          fundingFeeUsd: BigNumber.from(0),
          feeDiscountUsd: BigNumber.from(0),
          swapProfitFeeUsd: BigNumber.from(0),
          uiFeeFactor,
        }),
        executionFee: getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice),
        feesType: "swap" as TradeFeesType,
      };
    }

    if (isIncrease && increaseAmounts) {
      const estimatedGas = estimateExecuteIncreaseOrderGasLimit(gasLimits, {
        swapsCount: increaseAmounts.swapPathStats?.swapPath.length,
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
          priceImpactDiffUsd: BigNumber.from(0),
          borrowingFeeUsd: selectedPosition?.pendingBorrowingFeesUsd || BigNumber.from(0),
          fundingFeeUsd: selectedPosition?.pendingFundingFeesUsd || BigNumber.from(0),
          feeDiscountUsd: increaseAmounts.feeDiscountUsd,
          swapProfitFeeUsd: BigNumber.from(0),
          uiFeeFactor,
        }),
        executionFee: getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice),
        feesType: "increase" as TradeFeesType,
      };
    }

    if (isTrigger && decreaseAmounts) {
      const swapsCount = decreaseAmounts.decreaseSwapType === DecreasePositionSwapType.NoSwap ? 0 : 1;
      const estimatedGas = estimateExecuteDecreaseOrderGasLimit(gasLimits, {
        swapsCount,
      });

      return {
        fees: getTradeFees({
          isIncrease: false,
          initialCollateralUsd: selectedPosition?.collateralUsd || BigNumber.from(0),
          sizeDeltaUsd: decreaseAmounts.sizeDeltaUsd,
          swapSteps: [],
          positionFeeUsd: decreaseAmounts.positionFeeUsd,
          swapPriceImpactDeltaUsd: BigNumber.from(0),
          positionPriceImpactDeltaUsd: decreaseAmounts.positionPriceImpactDeltaUsd,
          priceImpactDiffUsd: decreaseAmounts.priceImpactDiffUsd,
          borrowingFeeUsd: decreaseAmounts.borrowingFeeUsd,
          fundingFeeUsd: decreaseAmounts.fundingFeeUsd,
          feeDiscountUsd: decreaseAmounts.feeDiscountUsd,
          swapProfitFeeUsd: decreaseAmounts.swapProfitFeeUsd,
          uiFeeFactor,
        }),
        executionFee: getExecutionFee(chainId, gasLimits, tokensData, estimatedGas, gasPrice),
        feesType: "decrease" as TradeFeesType,
      };
    }

    return {};
  }, [
    gasLimits,
    gasPrice,
    tokensData,
    isSwap,
    swapAmounts,
    isIncrease,
    increaseAmounts,
    isTrigger,
    decreaseAmounts,
    uiFeeFactor,
    chainId,
    selectedPosition?.pendingBorrowingFeesUsd,
    selectedPosition?.pendingFundingFeesUsd,
    selectedPosition?.collateralUsd,
  ]);

  const priceImpactWarningState = usePriceImpactWarningState({
    positionPriceImpact: fees?.positionPriceImpact,
    swapPriceImpact: fees?.swapPriceImpact,
    place: "tradeBox",
    tradeFlags,
  });

  const setIsHighPositionImpactAcceptedRef = useLatest(priceImpactWarningState.setIsHighPositionImpactAccepted);
  const setIsHighSwapImpactAcceptedRef = useLatest(priceImpactWarningState.setIsHighSwapImpactAccepted);

  const setFromTokenInputValue = useCallback(
    (value: string, shouldResetPriceImpactWarning: boolean) => {
      setFromTokenInputValueRaw(value);
      if (shouldResetPriceImpactWarning) {
        setIsHighPositionImpactAcceptedRef.current(false);
        setIsHighSwapImpactAcceptedRef.current(false);
      }
    },
    [setFromTokenInputValueRaw, setIsHighPositionImpactAcceptedRef, setIsHighSwapImpactAcceptedRef]
  );
  const setToTokenInputValue = useCallback(
    (value: string, shouldResetPriceImpactWarning: boolean) => {
      setToTokenInputValueRaw(value);
      if (shouldResetPriceImpactWarning) {
        setIsHighPositionImpactAcceptedRef.current(false);
        setIsHighSwapImpactAcceptedRef.current(false);
      }
    },
    [setToTokenInputValueRaw, setIsHighPositionImpactAcceptedRef, setIsHighSwapImpactAcceptedRef]
  );

  const marketsOptions = useAvailableMarketsOptions({
    isIncrease,
    disable: !isPosition,
    indexToken: toToken,
    isLong,
    increaseSizeUsd: increaseAmounts?.sizeDeltaUsd,
    hasExistingOrder: Boolean(existingOrder),
    hasExistingPosition: Boolean(selectedPosition),
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
  const triggerRatioValue = useMemo(() => parseValue(triggerRatioInputValue, USD_DECIMALS), [triggerRatioInputValue]);

  const { markRatio, triggerRatio } = useTradeRatios({
    fromTokenAddress,
    toTokenAddress,
    tradeMode,
    tradeType,
    triggerRatioValue,
  });

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

  const swapRoutes = useSelector(selectTradeboxSwapRoutes);
  const userReferralInfo = useUserReferralInfo();
  const acceptablePriceImpactBuffer = useSelector(selectSavedAcceptablePriceImpactBuffer);

  const detectAndSetAvailableMaxLeverage = useCallback(() => {
    if (!collateralToken || !toToken || !fromToken || !marketInfo || !minCollateralUsd) return;

    const { result: maxLeverage, returnValue: sizeDeltaInTokens } = numericBinarySearch<BigNumber | undefined>(
      1,
      // "10 *" means we do 1..50 search but with 0.1x step
      (10 * MAX_ALLOWED_LEVERAGE) / BASIS_POINTS_DIVISOR,
      (lev) => {
        const leverage = BigNumber.from((lev / 10) * BASIS_POINTS_DIVISOR);
        const increaseAmounts = getIncreasePositionAmounts({
          collateralToken,
          findSwapPath: swapRoutes.findSwapPath,
          indexToken: toToken,
          indexTokenAmount: toTokenAmount,
          initialCollateralAmount: fromTokenAmount,
          initialCollateralToken: fromToken,
          isLong,
          marketInfo,
          position: selectedPosition,
          strategy: "leverageByCollateral",
          uiFeeFactor,
          userReferralInfo,
          acceptablePriceImpactBuffer,
          fixedAcceptablePriceImpactBps: selectedTriggerAcceptablePriceImpactBps,
          leverage,
          triggerPrice,
        });

        const nextPositionValues = getNextPositionValuesForIncreaseTrade({
          collateralDeltaAmount: increaseAmounts.collateralDeltaAmount,
          collateralDeltaUsd: increaseAmounts.collateralDeltaUsd,
          collateralToken,
          existingPosition: selectedPosition,
          indexPrice: increaseAmounts.indexPrice,
          isLong,
          marketInfo,
          minCollateralUsd,
          showPnlInLeverage: false,
          sizeDeltaInTokens: increaseAmounts.sizeDeltaInTokens,
          sizeDeltaUsd: increaseAmounts.sizeDeltaUsd,
          userReferralInfo,
        });

        if (nextPositionValues.nextLeverage) {
          const isMaxLeverageExceeded = getIsMaxLeverageExceeded(
            nextPositionValues.nextLeverage,
            marketInfo,
            isLong,
            increaseAmounts.sizeDeltaUsd
          );

          return {
            isValid: !isMaxLeverageExceeded,
            returnValue: increaseAmounts.sizeDeltaInTokens,
          };
        }

        return {
          isValid: false,
          returnValue: increaseAmounts.sizeDeltaInTokens,
        };
      }
    );

    if (sizeDeltaInTokens) {
      if (isLeverageEnabled) {
        // round to int if it's > 1x
        const resultLeverage = maxLeverage > 10 ? Math.floor(maxLeverage / 10) : Math.floor(maxLeverage) / 10;

        setLeverageOption(resultLeverage);
      } else {
        setToTokenInputValue(
          formatAmountFree(substractMaxLeverageSlippage(sizeDeltaInTokens), toToken.decimals, 8),
          true
        );
      }
    } else {
      helperToast.error(t`No available leverage found`);
    }
  }, [
    acceptablePriceImpactBuffer,
    collateralToken,
    fromToken,
    fromTokenAmount,
    isLeverageEnabled,
    isLong,
    marketInfo,
    minCollateralUsd,
    selectedPosition,
    selectedTriggerAcceptablePriceImpactBps,
    setLeverageOption,
    setToTokenInputValue,
    swapRoutes.findSwapPath,
    toToken,
    toTokenAmount,
    triggerPrice,
    uiFeeFactor,
    userReferralInfo,
  ]);

  const { buttonErrorText, tooltipContent } = useMemo(() => {
    const commonError = getCommonError({
      chainId,
      isConnected: Boolean(account),
      hasOutdatedUi,
    });

    let tradeError: ValidationResult = [undefined];

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
        priceImpactWarning: priceImpactWarningState,
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
        existingPosition: selectedPosition,
        fees,
        swapPathStats: increaseAmounts?.swapPathStats,
        collateralLiquidity: swapOutLiquidity,
        minCollateralUsd,
        longLiquidity,
        shortLiquidity,
        isLong,
        markPrice,
        triggerPrice,
        priceImpactWarning: priceImpactWarningState,
        isLimit,
        nextPositionValues,
        nextLeverageWithoutPnl,
      });
    } else if (isTrigger) {
      tradeError = getDecreaseError({
        marketInfo,
        inputSizeUsd: closeSizeUsd,
        sizeDeltaUsd: decreaseAmounts?.sizeDeltaUsd,
        triggerPrice,
        markPrice,
        existingPosition: selectedPosition,
        isContractAccount: false,
        receiveToken: selectedPosition?.collateralToken,
        nextPositionValues: nextPositionValues,
        isLong,
        isTrigger: true,
        minCollateralUsd,
        priceImpactWarning: priceImpactWarningState,
        isNotEnoughReceiveTokenLiquidity: false,
        fixedTriggerThresholdType: stage === "confirmation" ? fixedTriggerThresholdType : undefined,
      });
    }

    const buttonErrorText = commonError[0] || tradeError[0];
    const tooltipName = commonError[1] || tradeError[1];

    let tooltipContent: ReactNode = null;
    if (tooltipName) {
      switch (tooltipName) {
        case "maxLeverage": {
          tooltipContent = (
            <>
              {isLeverageEnabled ? (
                <Trans>Decrease the leverage to match the max. allowed leverage.</Trans>
              ) : (
                <Trans>Decrease the size to match the max. allowed leverage:</Trans>
              )}{" "}
              <ExternalLink href="https://docs.gmx.io/docs/trading/v2/#max-leverage">Read more</ExternalLink>.
              <br />
              <br />
              <span onClick={detectAndSetAvailableMaxLeverage} className="Tradebox-handle">
                <Trans>Set Max Leverage</Trans>
              </span>
            </>
          );

          break;
        }

        default:
          mustNeverExist(tooltipName);
      }
    }

    return { buttonErrorText, tooltipContent };
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
    swapAmounts?.usdIn,
    swapAmounts?.usdOut,
    swapAmounts?.swapPathStats,
    toTokenAmount,
    swapOutLiquidity,
    priceImpactWarningState,
    isLimit,
    isWrapOrUnwrap,
    triggerRatio,
    markRatio,
    fees,
    marketInfo,
    increaseAmounts?.initialCollateralUsd,
    increaseAmounts?.collateralDeltaUsd,
    increaseAmounts?.sizeDeltaUsd,
    increaseAmounts?.swapPathStats,
    collateralToken,
    selectedPosition,
    minCollateralUsd,
    longLiquidity,
    shortLiquidity,
    isLong,
    markPrice,
    triggerPrice,
    nextPositionValues,
    nextLeverageWithoutPnl,
    closeSizeUsd,
    decreaseAmounts?.sizeDeltaUsd,
    stage,
    fixedTriggerThresholdType,
    isLeverageEnabled,
    detectAndSetAvailableMaxLeverage,
  ]);

  const isSubmitButtonDisabled = useMemo(() => {
    if (!account) {
      return false;
    }
    if (buttonErrorText) {
      return true;
    }
  }, [buttonErrorText, account]);

  const submitButtonText = useMemo(() => {
    if (buttonErrorText) {
      return buttonErrorText;
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
      return t`Create ${getTriggerNameByOrderType(decreaseAmounts?.triggerOrderType)} Order`;
    }
  }, [
    decreaseAmounts?.triggerOrderType,
    buttonErrorText,
    fromToken?.symbol,
    isLimit,
    isMarket,
    isSwap,
    toToken?.symbol,
    tradeType,
  ]);

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
      setSelectedAcceptablePriceImpactBps(decreaseAmounts.recommendedAcceptablePriceDeltaBps.abs());
      setDefaultTriggerAcceptablePriceImpactBps(decreaseAmounts.recommendedAcceptablePriceDeltaBps.abs());
    }

    if (isLimit && increaseAmounts?.acceptablePrice) {
      setSelectedAcceptablePriceImpactBps(increaseAmounts.acceptablePriceDeltaBps.abs());
      setDefaultTriggerAcceptablePriceImpactBps(increaseAmounts.acceptablePriceDeltaBps.abs());
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
        setFromTokenInputValue("", true);
        return;
      }

      if (isSwap && swapAmounts) {
        if (focusedInput === "from") {
          setToTokenInputValue(
            swapAmounts.amountOut.gt(0) ? formatAmountFree(swapAmounts.amountOut, toToken.decimals) : "",
            false
          );
        } else {
          setFromTokenInputValue(
            swapAmounts.amountIn.gt(0) ? formatAmountFree(swapAmounts.amountIn, fromToken.decimals) : "",
            false
          );
        }
      }

      if (isIncrease && increaseAmounts) {
        if (focusedInput === "from") {
          setToTokenInputValue(
            increaseAmounts.indexTokenAmount?.gt(0)
              ? formatAmountFree(increaseAmounts.indexTokenAmount, toToken.decimals)
              : "",
            false
          );
        } else {
          setFromTokenInputValue(
            increaseAmounts.initialCollateralAmount.gt(0)
              ? formatAmountFree(increaseAmounts.initialCollateralAmount, fromToken.decimals)
              : "",
            false
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
      setFocusedInput,
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
    [setTriggerPriceInputValue, toTokenAddress, tradeMode]
  );

  function onSwitchTokens() {
    setFocusedInput((old) => (old === "from" ? "to" : "from"));
    switchTokenAddresses();
    setFromTokenInputValue(toTokenInputValue || "", true);
    setToTokenInputValue(fromTokenInputValue || "", true);
  }

  function onTradeTypeChange(type: TradeType) {
    onSelectTradeType(type);
    if (tradeType !== type) {
      history.push(`/trade/${type.toLowerCase()}`);
    }
  }

  const onConfirmationClose = useCallback(() => {
    setSelectedAcceptablePriceImpactBps(undefined);
    setDefaultTriggerAcceptablePriceImpactBps(undefined);
    setFixedTriggerOrderType(undefined);
    setFixedTriggerThresholdType(undefined);
    setStage("trade");
  }, [
    setDefaultTriggerAcceptablePriceImpactBps,
    setFixedTriggerOrderType,
    setFixedTriggerThresholdType,
    setSelectedAcceptablePriceImpactBps,
    setStage,
  ]);

  const onConfirmed = useCallback(() => {
    if (isMarket) {
      setStage("processing");
      return;
    }
    setStage("trade");
  }, [isMarket, setStage]);

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
      let maxAvailableAmount = fromToken?.isNative
        ? fromToken.balance.sub(BigNumber.from(minResidualAmount || 0))
        : fromToken.balance;

      if (maxAvailableAmount.isNegative()) {
        maxAvailableAmount = BigNumber.from(0);
      }

      setFocusedInput("from");
      const formattedAmount = formatAmountFree(maxAvailableAmount, fromToken.decimals);
      const finalAmount = isMetamaskMobile
        ? limitDecimals(formattedAmount, MAX_METAMASK_MOBILE_DECIMALS)
        : formattedAmount;
      setFromTokenInputValue(finalAmount, true);
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
            setFromTokenInputValue(e.target.value, true);
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
              setToTokenInputValue(e.target.value, true);
            }}
            showMaxButton={false}
            preventFocusOnLabelClick="right"
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
              setToTokenInputValue(e.target.value, true);
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
        topRightLabel={selectedPosition?.sizeInUsd ? `Max` : undefined}
        topRightValue={selectedPosition?.sizeInUsd ? formatUsd(selectedPosition.sizeInUsd) : undefined}
        inputValue={closeSizeInputValue}
        onInputValueChange={(e) => setCloseSizeInputValue(e.target.value)}
        onClickTopRightLabel={() => setCloseSizeInputValue(formatAmount(selectedPosition?.sizeInUsd, USD_DECIMALS, 2))}
        showMaxButton={selectedPosition?.sizeInUsd.gt(0) && !closeSizeUsd?.eq(selectedPosition.sizeInUsd)}
        onClickMax={() => setCloseSizeInputValue(formatAmount(selectedPosition?.sizeInUsd, USD_DECIMALS, 2))}
        showPercentSelector={selectedPosition?.sizeInUsd.gt(0)}
        onPercentChange={(percent) =>
          setCloseSizeInputValue(formatAmount(selectedPosition?.sizeInUsd.mul(percent).div(100), USD_DECIMALS, 2))
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
            <TokenWithIcon symbol={markRatio.smallestToken.symbol} displaySize={20} /> per{" "}
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
              <LeverageSlider
                marks={V2_LEVERAGE_SLIDER_MARKS}
                value={leverageOption}
                onChange={setLeverageOption}
                isPositive={isLong}
              />
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
                markets={sortedAllMarkets ?? EMPTY_ARRAY}
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
          hasExistingPosition={Boolean(selectedPosition)}
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
          hasExistingPosition={Boolean(selectedPosition)}
          onSelectCollateralAddress={onSelectCollateralAddress}
          isMarket={isMarket}
        />
      </>
    );
  }

  function renderLeverageInfo() {
    if (isIncrease) {
      return (
        <ExchangeInfoRow
          className="SwapBox-info-row"
          label={t`Leverage`}
          value={
            nextPositionValues?.nextLeverage && increaseAmounts?.sizeDeltaUsd.gt(0) ? (
              <ValueTransition
                from={formatLeverage(selectedPosition?.leverage)}
                to={formatLeverage(nextPositionValues?.nextLeverage) || "-"}
              />
            ) : (
              formatLeverage(isLeverageEnabled ? leverage : increaseAmounts?.estimatedLeverage) || "-"
            )
          }
        />
      );
    } else if (isTrigger && selectedPosition) {
      let leverageValue: ReactNode = "-";

      if (decreaseAmounts?.isFullClose) {
        leverageValue = t`NA`;
      } else if (selectedPosition.sizeInUsd.eq(decreaseAmounts?.sizeDeltaUsd || 0)) {
        leverageValue = "-";
      } else {
        leverageValue = (
          <ValueTransition
            from={formatLeverage(selectedPosition.leverage)}
            to={formatLeverage(nextPositionValues?.nextLeverage)}
          />
        );
      }

      const keepLeverageChecked = decreaseAmounts?.isFullClose ? false : keepLeverage ?? false;

      return (
        <>
          <ExchangeInfoRow className="SwapBox-info-row" label={t`Leverage`} value={leverageValue} />
          {selectedPosition?.leverage && (
            <ToggleSwitch
              isChecked={keepLeverageChecked}
              setIsChecked={setKeepLeverage}
              disabled={decreaseAmounts?.isFullClose}
            >
              <span className="text-gray font-sm">
                <Trans>Keep leverage at {formatLeverage(selectedPosition.leverage)}</Trans>
              </span>
            </ToggleSwitch>
          )}
        </>
      );
    }
  }

  function renderIncreaseOrderInfo() {
    return (
      <>
        <ExchangeInfoRow
          className="SwapBox-info-row"
          label={t`Entry Price`}
          value={
            nextPositionValues?.nextEntryPrice || selectedPosition?.entryPrice ? (
              <ValueTransition
                from={formatUsd(selectedPosition?.entryPrice, {
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

        <ExchangeInfoRow
          className="SwapBox-info-row"
          label={t`Liq. Price`}
          value={
            <ValueTransition
              from={
                selectedPosition
                  ? formatLiquidationPrice(selectedPosition?.liquidationPrice, {
                      displayDecimals: selectedPosition?.indexToken?.priceDecimals,
                    })
                  : undefined
              }
              to={
                increaseAmounts?.sizeDeltaUsd.gt(0)
                  ? formatLiquidationPrice(nextPositionValues?.nextLiqPrice, {
                      displayDecimals: toToken?.priceDecimals,
                    })
                  : selectedPosition
                  ? undefined
                  : "-"
              }
            />
          }
        />
      </>
    );
  }

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
          label={t`Execution Price`}
          value={
            executionPriceUsd
              ? formatUsd(executionPriceUsd, {
                  displayDecimals: toToken?.priceDecimals,
                })
              : "-"
          }
        />

        {selectedPosition && (
          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Liq. Price`}
            value={
              <ValueTransition
                from={
                  selectedPosition
                    ? formatLiquidationPrice(selectedPosition?.liquidationPrice, {
                        displayDecimals: selectedPosition?.indexToken?.priceDecimals,
                      })
                    : undefined
                }
                to={
                  decreaseAmounts?.isFullClose
                    ? "-"
                    : decreaseAmounts?.sizeDeltaUsd.gt(0)
                    ? formatLiquidationPrice(nextPositionValues?.nextLiqPrice, {
                        displayDecimals: toToken?.priceDecimals,
                      })
                    : undefined
                }
              />
            }
          />
        )}
      </>
    );
  }

  function renderExistingPositionInfo() {
    return (
      <>
        {selectedPosition?.sizeInUsd.gt(0) && (
          <ExchangeInfoRow
            className="SwapBox-info-row"
            label={t`Size`}
            value={
              <ValueTransition
                from={formatUsd(selectedPosition.sizeInUsd)!}
                to={formatUsd(nextPositionValues?.nextSizeUsd)}
              />
            }
          />
        )}
        {!isIncrease && (
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
        <ExchangeInfoRow
          className="SwapBox-info-row"
          label={t`Collateral (${selectedPosition?.collateralToken?.symbol})`}
          value={
            <ValueTransition
              from={formatUsd(selectedPosition?.collateralUsd)}
              to={formatUsd(nextPositionValues?.nextCollateralUsd)}
            />
          }
        />
      </>
    );
  }

  useKey(
    "Enter",
    () => {
      if (isCursorInside && (!isSubmitButtonDisabled || shouldDisableValidation)) {
        onSubmit();
      }
    },
    {},
    [isSubmitButtonDisabled, shouldDisableValidation, isCursorInside]
  );

  const buttonContent = (
    <Button
      variant="primary-action"
      className="w-full"
      onClick={onSubmit}
      disabled={isSubmitButtonDisabled && !shouldDisableValidation}
    >
      {buttonErrorText || submitButtonText}
    </Button>
  );
  const button = tooltipContent ? (
    <Tooltip
      className="w-full"
      renderContent={() => tooltipContent}
      handle={buttonContent}
      handleClassName="w-full"
      position="bottom"
    />
  ) : (
    buttonContent
  );

  return (
    <>
      <div>
        <div className={`App-box SwapBox`}>
          <Tab
            icons={tradeTypeIcons}
            options={Object.values(TradeType)}
            optionLabels={tradeTypeLabels}
            option={tradeType}
            onChange={onTradeTypeChange}
            className="SwapBox-option-tabs"
          />

          <Tab
            options={availalbleTradeModes}
            optionLabels={tradeModeLabels}
            className="SwapBox-asset-options-tabs"
            type="inline"
            option={tradeMode}
            onChange={onSelectTradeMode}
          />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isCursorInside && (!isSubmitButtonDisabled || shouldDisableValidation)) {
                onSubmit();
              }
            }}
            ref={formRef}
          >
            {(isSwap || isIncrease) && renderTokenInputs()}
            {isTrigger && renderDecreaseSizeInput()}

            {isSwap && isLimit && renderTriggerRatioInput()}
            {isPosition && (isLimit || isTrigger) && renderTriggerPriceInput()}

            <ExchangeInfo className="SwapBox-info-section" dividerClassName="App-card-divider">
              <ExchangeInfo.Group>{isPosition && renderPositionControls()}</ExchangeInfo.Group>

              <ExchangeInfo.Group>{renderLeverageInfo()}</ExchangeInfo.Group>

              <ExchangeInfo.Group>
                {isIncrease && renderIncreaseOrderInfo()}
                {isTrigger && renderTriggerOrderInfo()}
              </ExchangeInfo.Group>

              <ExchangeInfo.Group>
                {selectedPosition && !isSwap && renderExistingPositionInfo()}
                {feesType && (
                  <>
                    <TradeFeesRow {...fees} feesType={feesType} />
                    <NetworkFeeRow executionFee={executionFee} />
                  </>
                )}
              </ExchangeInfo.Group>

              <ExchangeInfo.Group>
                {isTrigger && selectedPosition && decreaseAmounts?.receiveUsd && (
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
              </ExchangeInfo.Group>

              <ExchangeInfo.Group>
                {priceImpactWarningState.shouldShowWarning && (
                  <HighPriceImpactWarning
                    priceImpactWarinigState={priceImpactWarningState}
                    className="PositionEditor-allow-higher-slippage"
                  />
                )}
              </ExchangeInfo.Group>
            </ExchangeInfo>
            <div className="Exchange-swap-button-container">{button}</div>
          </form>
        </div>
      </div>

      {isSwap && <SwapCard maxLiquidityUsd={swapOutLiquidity} fromToken={fromToken} toToken={toToken} />}
      <div className="Exchange-swap-info-group">
        {isPosition && <MarketCard isLong={isLong} marketInfo={marketInfo} allowedSlippage={allowedSlippage} />}
      </div>

      <ConfirmationBox
        isVisible={stage === "confirmation"}
        triggerRatioValue={triggerRatioValue}
        triggerPrice={triggerPrice}
        fixedTriggerThresholdType={fixedTriggerThresholdType}
        fixedTriggerOrderType={fixedTriggerOrderType}
        selectedTriggerAcceptablePriceImpactBps={selectedTriggerAcceptablePriceImpactBps}
        setSelectedTriggerAcceptablePriceImpactBps={setSelectedAcceptablePriceImpactBps}
        marketsOptions={marketsOptions}
        swapLiquidityUsd={swapOutLiquidity}
        longLiquidityUsd={longLiquidity}
        shortLiquidityUsd={shortLiquidity}
        fees={fees}
        executionFee={executionFee}
        error={buttonErrorText}
        existingPosition={selectedPosition}
        shouldDisableValidation={shouldDisableValidation!}
        onClose={onConfirmationClose}
        onSubmitted={onConfirmed}
        setPendingTxns={setPendingTxns}
        markPrice={markPrice}
      />
    </>
  );
}
