import { Trans, msg, t } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import cx from "classnames";
import { ChangeEvent, KeyboardEvent, ReactNode, useCallback, useEffect, useMemo, useRef } from "react";
import { IoMdSwap } from "react-icons/io";
import { useHistory } from "react-router-dom";
import { useKey, useLatest, usePrevious } from "react-use";

import { getBridgingOptionsForToken } from "config/bridging";
import { BASIS_POINTS_DIVISOR, USD_DECIMALS } from "config/factors";
import { get1InchSwapUrlFromAddresses } from "config/links";
import { NATIVE_TOKEN_ADDRESS, getTokenVisualMultiplier } from "config/tokens";
import { MAX_METAMASK_MOBILE_DECIMALS } from "config/ui";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccount } from "context/SubaccountContext/SubaccountContext";
import {
  useMarketsInfoData,
  usePositionsConstants,
  useTokensData,
  useUiFeeFactor,
  useUserReferralInfo,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectSavedAcceptablePriceImpactBuffer } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import {
  selectTradeboxAllowedSlippage,
  selectTradeboxAvailableTokensOptions,
  selectTradeboxChooseSuitableMarket,
  selectTradeboxDecreasePositionAmounts,
  selectTradeboxExecutionFee,
  selectTradeboxExecutionPrice,
  selectTradeboxFees,
  selectTradeboxFindSwapPath,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxLeverage,
  selectTradeboxLeverageSliderMarks,
  selectTradeboxLiquidity,
  selectTradeboxMarkPrice,
  selectTradeboxMaxLeverage,
  selectTradeboxMaxLiquidityPath,
  selectTradeboxNextLeverageWithoutPnl,
  selectTradeboxNextPositionValues,
  selectTradeboxSelectedPosition,
  selectTradeboxSelectedPositionKey,
  selectTradeboxState,
  selectTradeboxSwapAmounts,
  selectTradeboxToTokenAmount,
  selectTradeboxTradeFeesType,
  selectTradeboxTradeFlags,
  selectTradeboxTradeRatios,
  selectTradeboxTriggerPrice,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useHasOutdatedUi } from "domain/legacy";
import { MarketInfo, getMarketIndexName } from "domain/synthetics/markets";
import {
  formatLeverage,
  formatLiquidationPrice,
  getTriggerNameByOrderType,
  substractMaxLeverageSlippage,
} from "domain/synthetics/positions";
import { convertToUsd } from "domain/synthetics/tokens";
import {
  TradeMode,
  TradeType,
  applySlippageToPrice,
  getIncreasePositionAmounts,
  getNextPositionValuesForIncreaseTrade,
} from "domain/synthetics/trade";
import { useMaxAutoCancelOrdersState } from "domain/synthetics/trade/useMaxAutoCancelOrdersState";
import { usePriceImpactWarningState } from "domain/synthetics/trade/usePriceImpactWarningState";
import {
  ValidationResult,
  getCommonError,
  getDecreaseError,
  getIncreaseError,
  getIsMaxLeverageExceeded,
  getSwapError,
} from "domain/synthetics/trade/utils/validation";
import { Token, getMinResidualAmount } from "domain/tokens";
import { numericBinarySearch } from "lib/binarySearch";
import { helperToast } from "lib/helperToast";
import { useLocalizedMap } from "lib/i18n";
import {
  calculateDisplayDecimals,
  formatAmount,
  formatAmountFree,
  formatDeltaUsd,
  formatTokenAmount,
  formatTokenAmountWithUsd,
  formatUsd,
  formatUsdPrice,
  limitDecimals,
  parseValue,
} from "lib/numbers";
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import { sleep } from "lib/sleep";
import { mustNeverExist } from "lib/types";
import { useCursorInside } from "lib/useCursorInside";
import useIsMetamaskMobile from "lib/wallets/useIsMetamaskMobile";
import useWallet from "lib/wallets/useWallet";

import TokenIcon from "components/TokenIcon/TokenIcon";
import { ExecutionPriceRow } from "../ExecutionPriceRow";
import { NetworkFeeRow } from "../NetworkFeeRow/NetworkFeeRow";
import { SwapCard } from "../SwapCard/SwapCard";
import { TradeFeesRow } from "../TradeFeesRow/TradeFeesRow";
import { MarketPoolSelectorRow } from "./MarketPoolSelectorRow";
import { CollateralSelectorRow } from "./TradeBoxRows/CollateralSelectorRow";

import { useRequiredActions } from "./hooks/useRequiredActions";
import { useTPSLSummaryExecutionFee } from "./hooks/useTPSLSummaryExecutionFee";
import { useTradeboxButtonState } from "./hooks/useTradeButtonState";
import { useTradeboxWarningsRows } from "./hooks/useTradeWarningsRows";
import { useTradeboxAvailablePriceImpactValues } from "./hooks/useTradeboxAvailablePriceImpactValues";
import { useTradeboxTPSLReset } from "./hooks/useTradeboxTPSLReset";
import { useTradeboxTransactions } from "./hooks/useTradeboxTransactions";
import { useTriggerOrdersConsent } from "./hooks/useTriggerOrdersConsent";

import { AlertInfo } from "components/AlertInfo/AlertInfo";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { ExchangeInfo } from "components/Exchange/ExchangeInfo";
import ExchangeInfoRow from "components/Exchange/ExchangeInfoRow";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { LeverageSlider } from "components/LeverageSlider/LeverageSlider";
import { MarketSelector } from "components/MarketSelector/MarketSelector";
import SuggestionInput from "components/SuggestionInput/SuggestionInput";
import { BridgingInfo } from "components/Synthetics/BridgingInfo/BridgingInfo";
import Tab from "components/Tab/Tab";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import TokenWithIcon from "components/TokenIcon/TokenWithIcon";
import TokenSelector from "components/TokenSelector/TokenSelector";
import Tooltip from "components/Tooltip/Tooltip";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import { TradeBoxAdvancedGroups } from "./TradeBoxRows/AdvancedDisplayRows";
import { LimitAndTPSLGroup } from "./TradeBoxRows/LimitAndTPSLRows";
import { LimitPriceRow } from "./TradeBoxRows/LimitPriceRow";
import { MinReceiveRow } from "./TradeBoxRows/MinReceiveRow";
import { TradeBoxOneClickTrading } from "./TradeBoxRows/OneClickTrading";

import LongIcon from "img/long.svg?react";
import ShortIcon from "img/short.svg?react";
import SwapIcon from "img/swap.svg?react";

import { MissedCoinsPlace } from "domain/synthetics/userFeedback";
import { sendUserAnalyticsConnectWalletClickEvent } from "lib/userAnalytics";
import { MissedCoinsHint } from "../MissedCoinsHint/MissedCoinsHint";
import "./TradeBox.scss";

export type Props = {
  setPendingTxns: (txns: any) => void;
};

const tradeTypeIcons = {
  [TradeType.Long]: <LongIcon />,
  [TradeType.Short]: <ShortIcon />,
  [TradeType.Swap]: <SwapIcon />,
};

const tradeModeLabels = {
  [TradeMode.Market]: msg`Market`,
  [TradeMode.Limit]: msg`Limit`,
  [TradeMode.Trigger]: msg`TP/SL`,
};

const tradeTypeLabels = {
  [TradeType.Long]: msg`Long`,
  [TradeType.Short]: msg`Short`,
  [TradeType.Swap]: msg`Swap`,
};

export function TradeBox(p: Props) {
  const localizedTradeModeLabels = useLocalizedMap(tradeModeLabels);
  const localizedTradeTypeLabels = useLocalizedMap(tradeTypeLabels);

  const avaialbleTokenOptions = useSelector(selectTradeboxAvailableTokensOptions);
  const formRef = useRef<HTMLFormElement>(null);
  const isCursorInside = useCursorInside(formRef);

  const allowedSlippage = useSelector(selectTradeboxAllowedSlippage);
  const { setPendingTxns } = p;

  const { openConnectModal } = useConnectModal();
  const history = useHistory();
  const { swapTokens, infoTokens, sortedLongAndShortTokens, sortedAllMarkets } = avaialbleTokenOptions;
  const tokensData = useTokensData();
  const marketsInfoData = useMarketsInfoData();

  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const { isLong, isSwap, isIncrease, isPosition, isLimit, isTrigger, isMarket } = tradeFlags;

  const chainId = useSelector(selectChainId);
  const { account } = useWallet();
  const isMetamaskMobile = useIsMetamaskMobile();
  const {
    showDebugValues,
    shouldDisableValidationForTesting,
    shouldDisableValidationForTesting: shouldDisableValidation,
  } = useSettings();
  const { data: hasOutdatedUi } = useHasOutdatedUi();
  const { minCollateralUsd } = usePositionsConstants();

  const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS);
  const minResidualAmount = useMemo(
    () => getMinResidualAmount(nativeToken?.decimals, nativeToken?.prices.maxPrice),
    [nativeToken?.decimals, nativeToken?.prices.maxPrice]
  );
  const {
    fromTokenInputValue,
    setFromTokenInputValue: setFromTokenInputValueRaw,
    toTokenInputValue,
    setToTokenInputValue: setToTokenInputValueRaw,
    setCollateralAddress: onSelectCollateralAddress,
    setFromTokenAddress: onSelectFromTokenAddress,
    setTradeType: onSelectTradeType,
    setTradeMode: onSelectTradeMode,
    stage,
    setStage,
    focusedInput,
    setFocusedInput,
    selectedTriggerAcceptablePriceImpactBps,
    closeSizeInputValue,
    setCloseSizeInputValue,
    triggerPriceInputValue,
    setTriggerPriceInputValue,
    triggerRatioInputValue,
    setTriggerRatioInputValue,
    leverageInputValue,
    setLeverageInputValue,
    leverageOption,
    setLeverageOption,
    isLeverageEnabled,
    setIsLeverageEnabled,
    isWrapOrUnwrap,
    isSwitchTokensAllowed,
    switchTokenAddresses,
    tradeMode,
    tradeType,
    collateralToken,
    fromTokenAddress,
    marketInfo,
    toTokenAddress,
    avaialbleTradeModes: availableTradeModes,
  } = useSelector(selectTradeboxState);

  const fromToken = getByKey(tokensData, fromTokenAddress);
  const toToken = getByKey(tokensData, toTokenAddress);
  const fromTokenAmount = fromToken ? parseValue(fromTokenInputValue || "0", fromToken.decimals)! : 0n;
  const toTokenAmount = useSelector(selectTradeboxToTokenAmount);
  const fromTokenPrice = fromToken?.prices.minPrice;
  const fromUsd = convertToUsd(fromTokenAmount, fromToken?.decimals, fromTokenPrice);
  const isNotMatchAvailableBalance = useMemo(
    () =>
      ((fromToken?.balance ?? 0n) > 0n &&
        fromToken?.balance !== fromTokenAmount &&
        (fromToken?.isNative
          ? minResidualAmount !== undefined && (fromToken?.balance ?? 0n) > minResidualAmount
          : true)) ||
      false,
    [fromToken?.balance, fromToken?.isNative, fromTokenAmount, minResidualAmount]
  );

  const closeSizeUsd = parseValue(closeSizeInputValue || "0", USD_DECIMALS)!;
  const triggerPrice = useSelector(selectTradeboxTriggerPrice);

  const uiFeeFactor = useUiFeeFactor();

  const markPrice = useSelector(selectTradeboxMarkPrice);
  const nextLeverageWithoutPnl = useSelector(selectTradeboxNextLeverageWithoutPnl);
  const swapAmounts = useSelector(selectTradeboxSwapAmounts);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const decreaseAmounts = useSelector(selectTradeboxDecreasePositionAmounts);
  const selectedPositionKey = useSelector(selectTradeboxSelectedPositionKey);
  const selectedPosition = useSelector(selectTradeboxSelectedPosition);
  const leverage = useSelector(selectTradeboxLeverage);
  const nextPositionValues = useSelector(selectTradeboxNextPositionValues);
  const fees = useSelector(selectTradeboxFees);
  const feesType = useSelector(selectTradeboxTradeFeesType);
  const executionFee = useSelector(selectTradeboxExecutionFee);
  const { markRatio, triggerRatio } = useSelector(selectTradeboxTradeRatios);
  const findSwapPath = useSelector(selectTradeboxFindSwapPath);
  const { maxLiquidity: swapOutLiquidity } = useSelector(selectTradeboxMaxLiquidityPath);

  const acceptablePriceImpactBuffer = useSelector(selectSavedAcceptablePriceImpactBuffer);
  const { longLiquidity, shortLiquidity } = useSelector(selectTradeboxLiquidity);
  const leverageSliderMarks = useSelector(selectTradeboxLeverageSliderMarks);
  const maxLeverage = useSelector(selectTradeboxMaxLeverage);
  const executionPrice = useSelector(selectTradeboxExecutionPrice);

  const maxAllowedLeverage = maxLeverage / 2;

  const priceImpactWarningState = usePriceImpactWarningState({
    positionPriceImpact: fees?.positionCollateralPriceImpact,
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

  const userReferralInfo = useUserReferralInfo();

  const detectAndSetAvailableMaxLeverage = useCallback(() => {
    if (!collateralToken || !toToken || !fromToken || !marketInfo || minCollateralUsd === undefined) return;

    const { result: maxLeverage, returnValue: sizeDeltaInTokens } = numericBinarySearch<bigint | undefined>(
      1,
      // "10 *" means we do 1..50 search but with 0.1x step
      (10 * maxAllowedLeverage) / BASIS_POINTS_DIVISOR,
      (lev) => {
        const leverage = BigInt((lev / 10) * BASIS_POINTS_DIVISOR);
        const increaseAmounts = getIncreasePositionAmounts({
          collateralToken,
          findSwapPath,
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

        if (nextPositionValues.nextLeverage !== undefined) {
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

    if (sizeDeltaInTokens !== undefined) {
      if (isLeverageEnabled) {
        // round to int if it's > 1x
        const resultLeverage = maxLeverage > 10 ? Math.floor(maxLeverage / 10) : Math.floor(maxLeverage) / 10;

        setLeverageOption(resultLeverage);
      } else {
        const visualMultiplier = BigInt(toToken.visualMultiplier ?? 1);

        setToTokenInputValue(
          formatAmountFree(substractMaxLeverageSlippage(sizeDeltaInTokens / visualMultiplier), toToken.decimals, 8),
          true
        );
      }
    } else {
      helperToast.error(t`No available leverage found`);
    }
  }, [
    acceptablePriceImpactBuffer,
    collateralToken,
    findSwapPath,
    fromToken,
    fromTokenAmount,
    isLeverageEnabled,
    isLong,
    marketInfo,
    maxAllowedLeverage,
    minCollateralUsd,
    selectedPosition,
    selectedTriggerAcceptablePriceImpactBps,
    setLeverageOption,
    setToTokenInputValue,
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
        triggerThresholdType: stage !== "trade" ? decreaseAmounts?.triggerThresholdType : undefined,
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

        case "liqPrice > markPrice":
          tooltipContent = (
            <Trans>The position would be immediately liquidated upon order execution. Try reducing the size.</Trans>
          );
          break;

        case "noSwapPath":
          tooltipContent = (
            <>
              <Trans>
                {collateralToken?.assetSymbol ?? collateralToken?.symbol} is required for collateral.
                <br />
                <br />
                There is no swap path found for {fromToken?.assetSymbol ?? fromToken?.symbol} to{" "}
                {collateralToken?.assetSymbol ?? collateralToken?.symbol} within GMX.
                <br />
                <br />
                <ExternalLink
                  href={get1InchSwapUrlFromAddresses(chainId, fromToken?.address, collateralToken?.address)}
                >
                  You can buy {collateralToken?.assetSymbol ?? collateralToken?.symbol} on 1inch.
                </ExternalLink>
              </Trans>
              {getBridgingOptionsForToken(collateralToken?.symbol) && (
                <>
                  <br />
                  <br />
                  <BridgingInfo chainId={chainId} tokenSymbol={collateralToken?.symbol} textOpaque />
                </>
              )}
            </>
          );
          break;

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
    decreaseAmounts?.triggerThresholdType,
    stage,
    isLeverageEnabled,
    detectAndSetAvailableMaxLeverage,
  ]);

  const [tradeboxWarningRows, consentError] = useTradeboxWarningsRows(priceImpactWarningState);
  const { warning: maxAutoCancelOrdersWarning } = useMaxAutoCancelOrdersState({ positionKey: selectedPositionKey });
  const [triggerConsentRows, triggerConsent, setTriggerConsent] = useTriggerOrdersConsent();

  const submitButtonText = useMemo(() => {
    if (buttonErrorText) {
      return buttonErrorText;
    }

    if (stage === "processing") {
      return t`Creating Order...`;
    }

    if (isMarket) {
      if (isSwap) {
        return t`Swap ${fromToken?.symbol}`;
      } else {
        return `${localizedTradeTypeLabels[tradeType!]} ${toToken?.symbol}`;
      }
    } else if (isLimit) {
      return t`Create Limit order`;
    } else {
      return t`Create ${getTriggerNameByOrderType(decreaseAmounts?.triggerOrderType)} Order`;
    }
  }, [
    buttonErrorText,
    isMarket,
    isLimit,
    isSwap,
    fromToken?.symbol,
    localizedTradeTypeLabels,
    tradeType,
    toToken?.symbol,
    decreaseAmounts?.triggerOrderType,
    stage,
  ]);

  const submitButtonState = useTradeboxButtonState({
    stage,
    text: submitButtonText,
    isTriggerWarningAccepted: triggerConsent,
    error: buttonErrorText || consentError,
    account,
  });

  const { summaryExecutionFee } = useTPSLSummaryExecutionFee();
  const { requiredActions } = useRequiredActions();
  const subaccount = useSubaccount(summaryExecutionFee?.feeTokenAmount ?? null, requiredActions);

  useTradeboxAvailablePriceImpactValues();
  useTradeboxTPSLReset(setTriggerConsent);

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
            swapAmounts.amountOut > 0 ? formatAmountFree(swapAmounts.amountOut, toToken.decimals) : "",
            false
          );
        } else {
          setFromTokenInputValue(
            swapAmounts.amountIn > 0 ? formatAmountFree(swapAmounts.amountIn, fromToken.decimals) : "",
            false
          );
        }
      }

      if (isIncrease && increaseAmounts) {
        const visualMultiplier = BigInt(toToken.visualMultiplier ?? 1);
        if (focusedInput === "from") {
          setToTokenInputValue(
            increaseAmounts.indexTokenAmount > 0
              ? formatAmountFree(increaseAmounts.indexTokenAmount / visualMultiplier, toToken.decimals)
              : "",
            false
          );
        } else {
          setFromTokenInputValue(
            increaseAmounts.initialCollateralAmount > 0
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
    function resetTriggerPrice() {
      setTriggerPriceInputValue("");
    },
    [setTriggerPriceInputValue, toTokenAddress, tradeMode]
  );

  useEffect(
    function validateLeverageOption() {
      if (leverageOption && leverageOption > maxAllowedLeverage / BASIS_POINTS_DIVISOR) {
        setLeverageOption(maxAllowedLeverage / BASIS_POINTS_DIVISOR);
      }
    },
    [leverageOption, maxAllowedLeverage, setLeverageOption]
  );

  const onSwitchTokens = useCallback(() => {
    setFocusedInput((old) => (old === "from" ? "to" : "from"));
    switchTokenAddresses();
    setFromTokenInputValue(toTokenInputValue || "", true);
    setToTokenInputValue(fromTokenInputValue || "", true);
  }, [
    fromTokenInputValue,
    setFocusedInput,
    setFromTokenInputValue,
    setToTokenInputValue,
    switchTokenAddresses,
    toTokenInputValue,
  ]);

  function onTradeTypeChange(type: TradeType) {
    onSelectTradeType(type);
    if (tradeType !== type) {
      history.push(`/trade/${type.toLowerCase()}`);
    }
  }

  const { onSubmitWrapOrUnwrap, onSubmitSwap, onSubmitIncreaseOrder, onSubmitDecreaseOrder } = useTradeboxTransactions({
    setPendingTxns,
  });

  const onSubmit = useCallback(async () => {
    if (!account) {
      sendUserAnalyticsConnectWalletClickEvent("ActionButton");
      openConnectModal?.();
      return;
    }

    setStage("processing");

    let txnPromise: Promise<any>;

    if (isWrapOrUnwrap) {
      txnPromise = onSubmitWrapOrUnwrap();
    } else if (isSwap) {
      txnPromise = onSubmitSwap();
    } else if (isIncrease) {
      txnPromise = onSubmitIncreaseOrder();
    } else {
      txnPromise = onSubmitDecreaseOrder();
    }

    if (subaccount) {
      /**
       * Wait 2 seconds to prevent double click on button
       * waiting for txnPromise may not be enough because it's sometimes resolves very fast
       */
      await sleep(2000);
      setStage("trade");

      return;
    }

    txnPromise.finally(() => {
      setStage("trade");
    });
  }, [
    account,
    setStage,
    isWrapOrUnwrap,
    isSwap,
    isIncrease,
    subaccount,
    openConnectModal,
    onSubmitWrapOrUnwrap,
    onSubmitSwap,
    onSubmitIncreaseOrder,
    onSubmitDecreaseOrder,
  ]);

  const onSelectToTokenAddress = useSelector(selectTradeboxChooseSuitableMarket);

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

  const onMaxClick = useCallback(() => {
    if (fromToken?.balance) {
      let maxAvailableAmount = fromToken?.isNative
        ? fromToken.balance - BigInt(minResidualAmount ?? 0n)
        : fromToken.balance;

      if (maxAvailableAmount < 0) {
        maxAvailableAmount = 0n;
      }

      setFocusedInput("from");
      const formattedAmount = formatAmountFree(maxAvailableAmount, fromToken.decimals);
      const finalAmount = isMetamaskMobile
        ? limitDecimals(formattedAmount, MAX_METAMASK_MOBILE_DECIMALS)
        : formattedAmount;
      setFromTokenInputValue(finalAmount, true);
    }
  }, [
    fromToken?.balance,
    fromToken?.decimals,
    fromToken?.isNative,
    isMetamaskMobile,
    minResidualAmount,
    setFocusedInput,
    setFromTokenInputValue,
  ]);

  const handleFromInputTokenChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setFocusedInput("from");
      setFromTokenInputValue(event.target.value, true);
    },
    [setFocusedInput, setFromTokenInputValue]
  );
  const handleToInputTokenChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setFocusedInput("to");
      setToTokenInputValue(event.target.value, true);
    },
    [setFocusedInput, setToTokenInputValue]
  );
  const handleSelectFromTokenAddress = useCallback(
    (token: Token) => onSelectFromTokenAddress(token.address),
    [onSelectFromTokenAddress]
  );
  const handleSelectToTokenAddress = useCallback(
    (token: Token) => onSelectToTokenAddress(token.address),
    [onSelectToTokenAddress]
  );
  const handleCloseInputChange = useCallback((e) => setCloseSizeInputValue(e.target.value), [setCloseSizeInputValue]);
  const setMaxCloseSize = useCallback(
    () => setCloseSizeInputValue(formatAmount(selectedPosition?.sizeInUsd, USD_DECIMALS, 2)),
    [selectedPosition?.sizeInUsd, setCloseSizeInputValue]
  );
  const handleClosePercentageChange = useCallback(
    (percent: number) =>
      setCloseSizeInputValue(
        formatAmount(((selectedPosition?.sizeInUsd ?? 0n) * BigInt(percent)) / 100n, USD_DECIMALS, 2)
      ),
    [selectedPosition?.sizeInUsd, setCloseSizeInputValue]
  );

  const handleTriggerPriceInputChange = useCallback(
    (e) => setTriggerPriceInputValue(e.target.value),
    [setTriggerPriceInputValue]
  );

  const setMarkPriceAsTriggerPrice = useCallback(() => {
    if (markPrice === undefined) {
      return;
    }

    setTriggerPriceInputValue(
      formatAmount(
        markPrice,
        USD_DECIMALS,
        calculateDisplayDecimals(markPrice, undefined, toToken?.visualMultiplier),
        undefined,
        undefined,
        toToken?.visualMultiplier
      )
    );
  }, [markPrice, setTriggerPriceInputValue, toToken?.visualMultiplier]);

  const handleTriggerMarkPriceClick = useCallback(
    () => setTriggerRatioInputValue(formatAmount(markRatio?.ratio, USD_DECIMALS, 10)),
    [markRatio?.ratio, setTriggerRatioInputValue]
  );
  const handleTriggerRatioInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setTriggerRatioInputValue(e.target.value);
    },
    [setTriggerRatioInputValue]
  );

  const handleSelectMarket = useCallback(
    (indexName: string, marketInfo: MarketInfo) => onSelectToTokenAddress(marketInfo.indexToken.address),
    [onSelectToTokenAddress]
  );

  const handleFormSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (!isCursorInside && (!submitButtonState.disabled || shouldDisableValidation)) {
        onSubmit();
      }
    },
    [isCursorInside, submitButtonState.disabled, onSubmit, shouldDisableValidation]
  );

  const handleLeverageInputBlur = useCallback(() => {
    if (leverageOption === 0) {
      setLeverageOption(leverageSliderMarks[0]);
      return;
    }

    if (leverageInputValue === "" && leverageOption !== undefined) {
      setLeverageInputValue(leverageOption.toString());
    }
  }, [leverageInputValue, leverageOption, leverageSliderMarks, setLeverageInputValue, setLeverageOption]);

  const handleLeverageInputKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();

        const isAlt = e.altKey;
        const direction = e.key === "ArrowUp" ? 1 : -1;
        const increment = isAlt ? 0.1 : 1;
        const diff = direction * increment;
        const newValue = Math.round(((leverageOption ?? leverageSliderMarks[0]) + diff) * 10) / 10;
        const clampedValue = Math.min(Math.max(newValue, leverageSliderMarks[0]), leverageSliderMarks.at(-1)!);

        setLeverageOption(clampedValue);
      }
    },
    [leverageOption, leverageSliderMarks, setLeverageOption]
  );

  function renderTokenInputs() {
    return (
      <>
        <BuyInputSection
          topLeftLabel={t`Pay`}
          topLeftValue={
            fromUsd !== undefined && fromUsd > 0
              ? formatUsd(isIncrease ? increaseAmounts?.initialCollateralUsd : fromUsd)
              : ""
          }
          topRightLabel={t`Balance`}
          topRightValue={formatTokenAmount(fromToken?.balance, fromToken?.decimals, "", {
            useCommas: true,
          })}
          onClickTopRightLabel={onMaxClick}
          inputValue={fromTokenInputValue}
          onInputValueChange={handleFromInputTokenChange}
          showMaxButton={isNotMatchAvailableBalance}
          onClickMax={onMaxClick}
          qa="pay"
        >
          {fromTokenAddress && (
            <TokenSelector
              label={t`Pay`}
              chainId={chainId}
              tokenAddress={fromTokenAddress}
              onSelectToken={handleSelectFromTokenAddress}
              tokens={swapTokens}
              infoTokens={infoTokens}
              className="GlpSwap-from-token"
              showSymbolImage={true}
              showTokenImgInDropdown={true}
              missedCoinsPlace={MissedCoinsPlace.payToken}
              extendedSortSequence={sortedLongAndShortTokens}
              qa="collateral-selector"
              footerContent={<MissedCoinsHint place={MissedCoinsPlace.payToken} className="!my-12 mx-15" withIcon />}
            />
          )}
        </BuyInputSection>

        <div className="Exchange-swap-ball-container">
          <button
            type="button"
            disabled={!isSwitchTokensAllowed}
            className="Exchange-swap-ball bg-blue-500"
            onClick={onSwitchTokens}
            data-qa="swap-ball"
          >
            <IoMdSwap className="Exchange-swap-ball-icon" />
          </button>
        </div>

        {isSwap && (
          <BuyInputSection
            topLeftLabel={t`Receive`}
            topLeftValue={swapAmounts?.usdOut && swapAmounts.usdOut > 0 ? formatUsd(swapAmounts?.usdOut) : ""}
            topRightLabel={t`Balance`}
            topRightValue={formatTokenAmount(toToken?.balance, toToken?.decimals, "", {
              useCommas: true,
            })}
            inputValue={toTokenInputValue}
            onInputValueChange={handleToInputTokenChange}
            showMaxButton={false}
            preventFocusOnLabelClick="right"
            qa="swap-receive"
          >
            {toTokenAddress && (
              <TokenSelector
                label={t`Receive`}
                chainId={chainId}
                tokenAddress={toTokenAddress}
                onSelectToken={handleSelectToTokenAddress}
                tokens={swapTokens}
                infoTokens={infoTokens}
                className="GlpSwap-from-token"
                showSymbolImage={true}
                showBalances={true}
                showTokenImgInDropdown={true}
                extendedSortSequence={sortedLongAndShortTokens}
                qa="receive-selector"
              />
            )}
          </BuyInputSection>
        )}

        {isIncrease && (
          <BuyInputSection
            topLeftLabel={localizedTradeTypeLabels[tradeType!]}
            topLeftValue={
              increaseAmounts?.sizeDeltaUsd && increaseAmounts.sizeDeltaUsd > 0
                ? formatUsd(increaseAmounts?.sizeDeltaUsd, { fallbackToZero: true })
                : ""
            }
            topRightLabel={t`Leverage`}
            topRightValue={formatLeverage(isLeverageEnabled ? leverage : increaseAmounts?.estimatedLeverage) || "-"}
            inputValue={toTokenInputValue}
            onInputValueChange={handleToInputTokenChange}
            showMaxButton={false}
            qa="buy"
          >
            {toTokenAddress && (
              <MarketSelector
                label={localizedTradeTypeLabels[tradeType!]}
                selectedIndexName={toToken ? getMarketIndexName({ indexToken: toToken, isSpotOnly: false }) : undefined}
                selectedMarketLabel={
                  toToken && (
                    <>
                      <span className="inline-flex items-center">
                        <TokenIcon className="mr-5" symbol={toToken.symbol} importSize={24} displaySize={20} />
                        <span className="Token-symbol-text">
                          {getTokenVisualMultiplier(toToken)}
                          {toToken.symbol}
                        </span>
                      </span>
                    </>
                  )
                }
                markets={sortedAllMarkets ?? EMPTY_ARRAY}
                isSideMenu
                missedCoinsPlace={MissedCoinsPlace.marketDropdown}
                onSelectMarket={(_indexName, marketInfo) => onSelectToTokenAddress(marketInfo.indexToken.address)}
                footerContent={
                  <MissedCoinsHint place={MissedCoinsPlace.marketDropdown} className="!my-12 mx-15" withIcon />
                }
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
        onInputValueChange={handleCloseInputChange}
        onClickTopRightLabel={setMaxCloseSize}
        showMaxButton={Boolean(
          selectedPosition?.sizeInUsd && selectedPosition.sizeInUsd > 0 && closeSizeUsd != selectedPosition.sizeInUsd
        )}
        onClickMax={setMaxCloseSize}
        showPercentSelector={selectedPosition?.sizeInUsd ? selectedPosition.sizeInUsd > 0 : false}
        onPercentChange={handleClosePercentageChange}
        qa="close"
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
        topRightValue={formatUsdPrice(markPrice, {
          visualMultiplier: toToken?.visualMultiplier,
        })}
        onClickTopRightLabel={setMarkPriceAsTriggerPrice}
        inputValue={triggerPriceInputValue}
        onInputValueChange={handleTriggerPriceInputChange}
        qa="trigger-price"
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
        onClickTopRightLabel={handleTriggerMarkPriceClick}
        inputValue={triggerRatioInputValue}
        onInputValueChange={handleTriggerRatioInputChange}
        qa="trigger-price"
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
              beforeSwitchContent={
                <div className={cx({ invisible: !isLeverageEnabled })}>
                  <SuggestionInput
                    inputClassName="w-40 text-right"
                    value={leverageInputValue}
                    setValue={setLeverageInputValue}
                    onBlur={handleLeverageInputBlur}
                    onKeyDown={handleLeverageInputKeyDown}
                    symbol="x"
                  />
                </div>
              }
            >
              <span className="muted">
                <Trans>Leverage slider</Trans>
              </span>
            </ToggleSwitch>

            {isLeverageEnabled && (
              <LeverageSlider
                marks={leverageSliderMarks}
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
                className="-mr-4"
                selectedIndexName={toToken ? getMarketIndexName({ indexToken: toToken, isSpotOnly: false }) : undefined}
                markets={sortedAllMarkets ?? EMPTY_ARRAY}
                isSideMenu
                onSelectMarket={handleSelectMarket}
              />
            }
          />
        )}

        <MarketPoolSelectorRow />

        <CollateralSelectorRow
          selectedMarketAddress={marketInfo?.marketTokenAddress}
          onSelectCollateralAddress={onSelectCollateralAddress}
          isMarket={isMarket}
        />
      </>
    );
  }

  function renderIncreaseOrderInfo() {
    const acceptablePrice =
      isMarket && increaseAmounts?.acceptablePrice
        ? applySlippageToPrice(allowedSlippage, increaseAmounts.acceptablePrice, true, isLong)
        : increaseAmounts?.acceptablePrice;

    return (
      <>
        <ExecutionPriceRow
          tradeFlags={tradeFlags}
          fees={fees}
          acceptablePrice={acceptablePrice}
          executionPrice={executionPrice ?? undefined}
          visualMultiplier={toToken?.visualMultiplier}
        />
        <ExchangeInfoRow
          label={t`Liq. Price`}
          value={
            <ValueTransition
              from={
                selectedPosition
                  ? formatLiquidationPrice(selectedPosition?.liquidationPrice, {
                      visualMultiplier: toToken?.visualMultiplier,
                    })
                  : undefined
              }
              to={
                increaseAmounts?.sizeDeltaUsd && increaseAmounts.sizeDeltaUsd > 0
                  ? formatLiquidationPrice(nextPositionValues?.nextLiqPrice, {
                      visualMultiplier: toToken?.visualMultiplier,
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

  function renderTriggerOrderInfo() {
    let formattedTriggerPrice = "-";

    if (decreaseAmounts && decreaseAmounts.triggerPrice !== undefined && decreaseAmounts.triggerPrice !== 0n) {
      formattedTriggerPrice = `${decreaseAmounts.triggerThresholdType || ""} ${formatUsdPrice(
        decreaseAmounts.triggerPrice,
        {
          visualMultiplier: toToken?.visualMultiplier,
        }
      )}`;
    }

    return (
      <>
        <ExchangeInfoRow label={t`Trigger Price`} value={formattedTriggerPrice} />

        <ExecutionPriceRow
          tradeFlags={tradeFlags}
          fees={fees}
          executionPrice={executionPrice ?? undefined}
          triggerOrderType={decreaseAmounts?.triggerOrderType}
          acceptablePrice={decreaseAmounts?.acceptablePrice}
          visualMultiplier={toToken?.visualMultiplier}
        />

        {selectedPosition && (
          <ExchangeInfoRow
            label={t`Liq. Price`}
            value={
              <ValueTransition
                from={
                  selectedPosition
                    ? formatLiquidationPrice(selectedPosition?.liquidationPrice, {
                        visualMultiplier: toToken?.visualMultiplier,
                      })
                    : undefined
                }
                to={
                  decreaseAmounts?.isFullClose
                    ? "-"
                    : decreaseAmounts?.sizeDeltaUsd && decreaseAmounts.sizeDeltaUsd > 0
                      ? formatLiquidationPrice(nextPositionValues?.nextLiqPrice, {
                          visualMultiplier: toToken?.visualMultiplier,
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

  useKey(
    "Enter",
    () => {
      if (isCursorInside && (!submitButtonState.disabled || shouldDisableValidation)) {
        onSubmit();
      }
    },
    {},
    [submitButtonState.disabled, shouldDisableValidation, isCursorInside, onSubmit]
  );

  const buttonContent = (
    <Button
      qa="confirm-trade-button"
      variant="primary-action"
      className="mt-4 w-full [text-decoration:inherit]"
      onClick={onSubmit}
      disabled={submitButtonState.disabled && !shouldDisableValidationForTesting}
    >
      {submitButtonState.text}
    </Button>
  );
  const button = tooltipContent ? (
    <Tooltip
      className="w-full"
      content={tooltipContent}
      handle={buttonContent}
      isHandlerDisabled
      handleClassName="w-full"
      position="bottom"
    />
  ) : (
    buttonContent
  );

  return (
    <>
      <div>
        <div data-qa="tradebox" className={`App-box SwapBox`}>
          <Tab
            icons={tradeTypeIcons}
            options={Object.values(TradeType)}
            optionLabels={localizedTradeTypeLabels}
            option={tradeType}
            onChange={onTradeTypeChange}
            className="SwapBox-option-tabs"
            qa="trade-direction"
          />

          <Tab
            options={availableTradeModes}
            optionLabels={localizedTradeModeLabels}
            className="SwapBox-asset-options-tabs"
            type="inline"
            option={tradeMode}
            onChange={onSelectTradeMode}
            qa="trade-mode"
          />
          <form onSubmit={handleFormSubmit} ref={formRef}>
            {(isSwap || isIncrease) && renderTokenInputs()}
            {isTrigger && renderDecreaseSizeInput()}

            {isSwap && isLimit && renderTriggerRatioInput()}
            {isPosition && (isLimit || isTrigger) && renderTriggerPriceInput()}

            <ExchangeInfo className="SwapBox-info-section" dividerClassName="App-card-divider">
              <ExchangeInfo.Group>
                {maxAutoCancelOrdersWarning}
                {isSwap && isLimit && (
                  <AlertInfo key="showHasBetterOpenFeesAndNetFeesWarning" type="info" compact>
                    <Trans>
                      The execution price will constantly vary based on fees and price impact to guarantee that you
                      receive the minimum receive amount.
                    </Trans>
                  </AlertInfo>
                )}
              </ExchangeInfo.Group>

              <ExchangeInfo.Group>{isPosition && renderPositionControls()}</ExchangeInfo.Group>
              <ExchangeInfo.Group>
                <TradeBoxOneClickTrading />
              </ExchangeInfo.Group>
              <ExchangeInfo.Group>
                <LimitAndTPSLGroup />
              </ExchangeInfo.Group>

              <ExchangeInfo.Group>
                <LimitPriceRow />
                {isIncrease && renderIncreaseOrderInfo()}
                {isTrigger && renderTriggerOrderInfo()}
              </ExchangeInfo.Group>

              <ExchangeInfo.Group>
                <TradeBoxAdvancedGroups className="-my-[1.05rem]" />
              </ExchangeInfo.Group>

              <ExchangeInfo.Group>
                <TradeFeesRow {...fees} feesType={feesType} />
                <NetworkFeeRow executionFee={executionFee} />
              </ExchangeInfo.Group>

              {isTrigger && selectedPosition && decreaseAmounts?.receiveUsd !== undefined && (
                <ExchangeInfo.Group>
                  <ExchangeInfoRow
                    label={t`Receive`}
                    value={formatTokenAmountWithUsd(
                      decreaseAmounts.receiveTokenAmount,
                      decreaseAmounts.receiveUsd,
                      collateralToken?.symbol,
                      collateralToken?.decimals
                    )}
                  />
                </ExchangeInfo.Group>
              )}

              {isSwap && (
                <ExchangeInfo.Group>
                  <MinReceiveRow allowedSlippage={allowedSlippage} />
                </ExchangeInfo.Group>
              )}

              {tradeboxWarningRows && <ExchangeInfo.Group>{tradeboxWarningRows}</ExchangeInfo.Group>}
              {triggerConsentRows && <ExchangeInfo.Group>{triggerConsentRows}</ExchangeInfo.Group>}
            </ExchangeInfo>
            <div className="Exchange-swap-button-container">{button}</div>
          </form>
        </div>
      </div>

      {isSwap && <SwapCard maxLiquidityUsd={swapOutLiquidity} fromToken={fromToken} toToken={toToken} />}
    </>
  );
}
