import { t, Trans } from "@lingui/macro";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import cx from "classnames";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef } from "react";
import { useKey, useLatest, usePrevious } from "react-use";

import { BASIS_POINTS_DIVISOR, USD_DECIMALS } from "config/factors";
import { isSettlementChain } from "config/multichain";
import { useOpenMultichainDepositModal } from "context/GmxAccountContext/useOpenMultichainDepositModal";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChartHeaderInfo } from "context/SyntheticsStateContext/selectors/chartSelectors";
import { selectGasPaymentToken } from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectChainId,
  selectMarketsInfoData,
  selectSrcChainId,
  selectSubaccountState,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectExpressOrdersEnabled,
  selectGasPaymentTokenAddress,
  selectSetExpressOrdersEnabled,
  selectSettingsWarningDotVisible,
  selectShowDebugValues,
} from "context/SyntheticsStateContext/selectors/settingsSelectors";
import {
  selectTradeboxAllowedSlippage,
  selectTradeboxAvailableTokensOptions,
  selectTradeboxChooseSuitableMarket,
  selectTradeboxDecreasePositionAmounts,
  selectTradeboxExecutionFee,
  selectTradeboxFees,
  selectTradeboxFromToken,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxIsWrapOrUnwrap,
  selectTradeboxKeepLeverage,
  selectTradeboxLeverage,
  selectTradeboxMarkPrice,
  selectTradeboxMaxLeverage,
  selectTradeboxNextPositionValues,
  selectTradeboxSelectedPosition,
  selectTradeboxSelectedPositionKey,
  selectTradeboxSetDefaultAllowedSwapSlippageBps,
  selectTradeboxSetKeepLeverage,
  selectTradeboxSetSelectedAllowedSwapSlippageBps,
  selectTradeboxState,
  selectTradeboxSwapAmounts,
  selectTradeboxTradeFlags,
  selectTradeboxTradeRatios,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { toastEnableExpress } from "domain/multichain/toastEnableExpress";
import { useGmxAccountShowDepositButton } from "domain/multichain/useGmxAccountShowDepositButton";
import { getMinResidualGasPaymentTokenAmount } from "domain/synthetics/express/getMinResidualGasPaymentTokenAmount";
import { getMarketIndexName, MarketInfo } from "domain/synthetics/markets";
import { formatLeverage, formatLiquidationPrice } from "domain/synthetics/positions";
import { convertToTokenAmount, convertToUsd } from "domain/synthetics/tokens";
import { getTwapRecommendation } from "domain/synthetics/trade/twapRecommendation";
import { useMaxAutoCancelOrdersState } from "domain/synthetics/trade/useMaxAutoCancelOrdersState";
import { usePriceImpactWarningState } from "domain/synthetics/trade/usePriceImpactWarningState";
import { MissedCoinsPlace } from "domain/synthetics/userFeedback";
import { Token } from "domain/tokens";
import { useMaxAvailableAmount } from "domain/tokens/useMaxAvailableAmount";
import { helperToast } from "lib/helperToast";
import { useLocalizedMap } from "lib/i18n";
import { throttleLog } from "lib/logging";
import {
  calculateDisplayDecimals,
  expandDecimals,
  formatAmount,
  formatAmountFree,
  formatBalanceAmount,
  formatDeltaUsd,
  formatPercentage,
  formatTokenAmountWithUsd,
  formatUsd,
  formatUsdPrice,
  parseValue,
} from "lib/numbers";
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import { useCursorInside } from "lib/useCursorInside";
import { sendTradeBoxInteractionStartedEvent } from "lib/userAnalytics";
import { useWalletIconUrls } from "lib/wallets/getWalletIconUrls";
import { useIsNonEoaAccountOnAnyChain } from "lib/wallets/useAccountType";
import useWallet from "lib/wallets/useWallet";
import { EXPRESS_DEFAULT_MIN_RESIDUAL_USD_NUMBER } from "sdk/configs/express";
import { getToken, isUsdBasedStableToken, NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import { TradeMode } from "sdk/types/trade";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { ColorfulBanner } from "components/ColorfulBanner/ColorfulBanner";
import { MarketSelector } from "components/MarketSelector/MarketSelector";
import { SyntheticsInfoRow } from "components/SyntheticsInfoRow";
import Tabs from "components/Tabs/Tabs";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TokenWithIcon from "components/TokenIcon/TokenWithIcon";
import { MultichainTokenSelector } from "components/TokenSelector/MultichainTokenSelector";
import TokenSelector from "components/TokenSelector/TokenSelector";
import Tooltip from "components/Tooltip/Tooltip";
import { TradeboxMarginFields } from "components/TradeboxMarginFields";
import { TradeboxPoolWarnings } from "components/TradeboxPoolWarnings/TradeboxPoolWarnings";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import ArrowDownIcon from "img/ic_arrow_down.svg?react";
import InfoCircleIcon from "img/ic_info_circle_stroke.svg?react";
import SettingsIcon from "img/ic_settings.svg?react";

import { useIsCurtainOpen } from "./Curtain";
import { ExpressTradingWarningCard } from "./ExpressTradingWarningCard";
import { useMultichainTokensRequest } from "../GmxAccountModal/hooks";
import { HighPriceImpactOrFeesWarningCard } from "../HighPriceImpactOrFeesWarningCard/HighPriceImpactOrFeesWarningCard";
import TradeInfoIcon from "../TradeInfoIcon/TradeInfoIcon";
import TwapRows from "../TwapRows/TwapRows";
import { useDecreaseOrdersThatWillBeExecuted } from "./hooks/useDecreaseOrdersThatWillBeExecuted";
import { useShowHighLeverageWarning } from "./hooks/useShowHighLeverageWarning";
import { useTradeboxAcceptablePriceImpactValues } from "./hooks/useTradeboxAcceptablePriceImpactValues";
import { useTradeboxTPSLReset } from "./hooks/useTradeboxTPSLReset";
import { useTradeboxButtonState } from "./hooks/useTradeButtonState";
import { tradeModeLabels, tradeTypeLabels } from "./tradeboxConstants";
import { TradeBoxAdvancedGroups } from "./TradeBoxRows/AdvancedDisplayRows";
import { useCollateralWarnings } from "./TradeBoxRows/CollateralSelectorField";
import { MinReceiveRow } from "./TradeBoxRows/MinReceiveRow";
import { PriceImpactFeesRow } from "./TradeBoxRows/PriceImpactFeesRow";
import { TPSLGroup } from "./TradeBoxRows/TPSLRows";

import "./TradeBox.scss";

export function TradeBox({ isMobile }: { isMobile: boolean }) {
  const localizedTradeModeLabels = useLocalizedMap(tradeModeLabels);
  const localizedTradeTypeLabels = useLocalizedMap(tradeTypeLabels);

  const setDefaultAllowedSwapSlippageBps = useSelector(selectTradeboxSetDefaultAllowedSwapSlippageBps);
  const setSelectedAllowedSwapSlippageBps = useSelector(selectTradeboxSetSelectedAllowedSwapSlippageBps);

  const availableTokenOptions = useSelector(selectTradeboxAvailableTokensOptions);
  const chartHeaderInfo = useSelector(selectChartHeaderInfo);
  const formRef = useRef<HTMLFormElement>(null);
  const isCursorInside = useCursorInside(formRef);
  const showDebugValues = useSelector(selectShowDebugValues);

  const allowedSlippage = useSelector(selectTradeboxAllowedSlippage);

  const { swapTokens, infoTokens, sortedLongAndShortTokens, sortedAllMarkets } = availableTokenOptions;
  const tokensData = useTokensData();
  const { tokenChainDataArray: multichainTokens } = useMultichainTokensRequest();
  const marketsInfoData = useSelector(selectMarketsInfoData);
  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const { isLong, isSwap, isIncrease, isPosition, isLimit, isTrigger, isTwap } = tradeFlags;
  const isWrapOrUnwrap = useSelector(selectTradeboxIsWrapOrUnwrap);

  const chainId = useSelector(selectChainId);
  const srcChainId = useSelector(selectSrcChainId);
  const { account, active } = useWallet();
  const { openConnectModal } = useConnectModal();

  const walletIconUrls = useWalletIconUrls();

  const { shouldDisableValidationForTesting: shouldDisableValidation } = useSettings();

  const onDepositTokenAddress = useOpenMultichainDepositModal();

  const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS);

  const [_, setExternalIsCurtainOpen] = useIsCurtainOpen();

  const {
    fromTokenInputValue,
    setFromTokenInputValue: setFromTokenInputValueRaw,
    toTokenInputValue,
    setToTokenInputValue: setToTokenInputValueRaw,
    setFromTokenAddress: onSelectFromTokenAddress,
    isFromTokenGmxAccount,
    setIsFromTokenGmxAccount,
    setTradeMode: onSelectTradeMode,
    focusedInput,
    setFocusedInput,
    closeSizeInputValue,
    setCloseSizeInputValue,
    triggerPriceInputValue,
    setTriggerPriceInputValue,
    triggerRatioInputValue,
    setTriggerRatioInputValue,
    leverageOption,
    setLeverageOption,
    isSwitchTokensAllowed,
    switchTokenAddresses,
    tradeMode,
    tradeType,
    collateralToken,
    fromTokenAddress,
    marketInfo,
    toTokenAddress,
    availableTradeModes,
    duration,
    numberOfParts,
    setNumberOfParts,
    setDuration,
    limitPriceWarningHidden,
    setLimitPriceWarningHidden,
  } = useSelector(selectTradeboxState);

  const isTwapModeAvailable = useMemo(
    () =>
      availableTradeModes.some((mode) =>
        Array.isArray(mode) ? mode.some((nestedMode) => nestedMode === TradeMode.Twap) : mode === TradeMode.Twap
      ),
    [availableTradeModes]
  );

  const fromToken = useSelector(selectTradeboxFromToken);
  const toToken = getByKey(tokensData, toTokenAddress);
  const fromTokenAmount = fromToken ? parseValue(fromTokenInputValue || "0", fromToken.decimals)! : 0n;
  const fromTokenPrice = fromToken?.prices.minPrice;
  const fromUsd = convertToUsd(fromTokenAmount, fromToken?.decimals, fromTokenPrice);

  const closeSizeUsd = parseValue(closeSizeInputValue || "0", USD_DECIMALS)!;

  const markPrice = useSelector(selectTradeboxMarkPrice);
  const swapAmounts = useSelector(selectTradeboxSwapAmounts);
  const increaseAmounts = useSelector(selectTradeboxIncreasePositionAmounts);
  const decreaseAmounts = useSelector(selectTradeboxDecreasePositionAmounts);
  const selectedPositionKey = useSelector(selectTradeboxSelectedPositionKey);
  const selectedPosition = useSelector(selectTradeboxSelectedPosition);
  const leverage = useSelector(selectTradeboxLeverage);
  const nextPositionValues = useSelector(selectTradeboxNextPositionValues);
  const fees = useSelector(selectTradeboxFees);
  const expressOrdersEnabled = useSelector(selectExpressOrdersEnabled);
  const setExpressOrdersEnabled = useSelector(selectSetExpressOrdersEnabled);
  const gasPaymentTokenData = useSelector(selectGasPaymentToken);
  const gasPaymentTokenAddress = useSelector(selectGasPaymentTokenAddress);
  const { subaccount } = useSelector(selectSubaccountState);
  const { shouldShowDepositButton } = useGmxAccountShowDepositButton();
  const { setIsSettingsVisible, isLeverageSliderEnabled } = useSettings();

  const executionFee = useSelector(selectTradeboxExecutionFee);
  const { markRatio } = useSelector(selectTradeboxTradeRatios);

  const maxLeverage = useSelector(selectTradeboxMaxLeverage);

  const maxAllowedLeverage = maxLeverage / 2;

  const decreaseOrdersThatWillBeExecuted = useDecreaseOrdersThatWillBeExecuted();

  const priceImpactWarningState = usePriceImpactWarningState({
    collateralNetPriceImpact: fees?.collateralNetPriceImpact,
    swapPriceImpact: fees?.swapPriceImpact,
    swapProfitFee: fees?.swapProfitFee,
    executionFeeUsd: executionFee?.feeUsd,
    willDecreaseOrdersBeExecuted: decreaseOrdersThatWillBeExecuted.length > 0,
    externalSwapFeeItem: fees?.externalSwapFee,
    tradeFlags,
    payUsd: fromUsd,
  });

  const twapRecommendation = getTwapRecommendation(
    isIncrease
      ? {
          enabled: isPosition && !isSwap && !isTwap && isTwapModeAvailable,
          sizeDeltaUsd: increaseAmounts?.sizeDeltaUsd,
          priceImpactPrecise: fees?.increasePositionPriceImpact?.precisePercentage,
        }
      : {
          enabled: isPosition && isTrigger && !isTwap && isTwapModeAvailable,
          sizeDeltaUsd: decreaseAmounts?.sizeDeltaUsd,
          priceImpactPrecise: fees?.decreasePositionPriceImpact?.precisePercentage,
        }
  );

  const { showHighLeverageWarning, dismissHighLeverageWarning } = useShowHighLeverageWarning();

  const setIsDismissedRef = useLatest(priceImpactWarningState.setIsDismissed);

  const setFromTokenInputValue = useCallback(
    (value: string, resetPriceImpactAndSwapSlippage?: boolean) => {
      setFromTokenInputValueRaw(value);

      if (resetPriceImpactAndSwapSlippage) {
        setIsDismissedRef.current(false);

        setDefaultAllowedSwapSlippageBps(undefined);
        setSelectedAllowedSwapSlippageBps(undefined);
      }
    },
    [setFromTokenInputValueRaw, setIsDismissedRef, setDefaultAllowedSwapSlippageBps, setSelectedAllowedSwapSlippageBps]
  );

  const setToTokenInputValue = useCallback(
    (value: string, shouldResetPriceImpactAndSwapSlippage: boolean) => {
      setToTokenInputValueRaw(value);
      if (shouldResetPriceImpactAndSwapSlippage) {
        setIsDismissedRef.current(false);

        setDefaultAllowedSwapSlippageBps(undefined);
        setSelectedAllowedSwapSlippageBps(undefined);
      }
    },
    [setIsDismissedRef, setToTokenInputValueRaw, setDefaultAllowedSwapSlippageBps, setSelectedAllowedSwapSlippageBps]
  );

  const { warning: maxAutoCancelOrdersWarning } = useMaxAutoCancelOrdersState({
    positionKey: selectedPositionKey,
    isCreatingNewAutoCancel: isTrigger,
  });

  const submitButtonState = useTradeboxButtonState({
    account,
    setToTokenInputValue,
  });

  const wrappedOnSubmit = useCallback(async () => {
    await submitButtonState.onSubmit();
    if (isMobile) {
      setExternalIsCurtainOpen(false);
    }
  }, [submitButtonState, isMobile, setExternalIsCurtainOpen]);

  const { gasPaymentTokenAmountForMax, isGasPaymentTokenAmountForMaxApproximate } = useMemo(() => {
    if (!expressOrdersEnabled) {
      return {};
    }
    if (
      submitButtonState.expressParams?.gasPaymentParams.gasPaymentTokenAmount !== undefined &&
      // Submit button state may store previous gas payment token address, so we need to check if it matches the current gas payment token address
      submitButtonState.expressParams.gasPaymentParams.gasPaymentTokenAddress === gasPaymentTokenAddress
    ) {
      return {
        gasPaymentTokenAmountForMax: submitButtonState.expressParams.gasPaymentParams.gasPaymentTokenAmount,
        isGasPaymentTokenAmountForMaxApproximate: false,
      };
    }
    if (executionFee && gasPaymentTokenData) {
      const gasPaymentTokenAmountForMax = convertToTokenAmount(
        executionFee.feeUsd,
        gasPaymentTokenData.decimals,
        gasPaymentTokenData.prices.maxPrice
      )!;
      return {
        gasPaymentTokenAmountForMax,
        isGasPaymentTokenAmountForMaxApproximate: true,
      };
    }
    const gasPaymentToken = getToken(chainId, gasPaymentTokenAddress);
    if (isUsdBasedStableToken(gasPaymentToken)) {
      const gasPaymentTokenAmountForMax = expandDecimals(
        EXPRESS_DEFAULT_MIN_RESIDUAL_USD_NUMBER,
        gasPaymentToken.decimals
      );
      return {
        gasPaymentTokenAmountForMax,
        isGasPaymentTokenAmountForMaxApproximate: true,
      };
    }
    return {};
  }, [
    expressOrdersEnabled,
    submitButtonState.expressParams?.gasPaymentParams.gasPaymentTokenAmount,
    submitButtonState.expressParams?.gasPaymentParams.gasPaymentTokenAddress,
    gasPaymentTokenAddress,
    executionFee,
    gasPaymentTokenData,
    chainId,
  ]);

  const { formattedMaxAvailableAmount, showClickMax } = useMaxAvailableAmount({
    fromToken,
    nativeToken,
    fromTokenAmount,
    fromTokenInputValue,
    minResidualAmount: getMinResidualGasPaymentTokenAmount({
      gasPaymentToken: gasPaymentTokenData,
      gasPaymentTokenAmount: gasPaymentTokenAmountForMax,
      payTokenAddress: fromTokenAddress,
      applyBuffer: !isGasPaymentTokenAmountForMaxApproximate,
    }),
    isLoading:
      expressOrdersEnabled && (submitButtonState.isExpressLoading || gasPaymentTokenAmountForMax === undefined),
  });

  const onMaxClick = useCallback(() => {
    if (formattedMaxAvailableAmount) {
      setFocusedInput("from");
      setFromTokenInputValue(formattedMaxAvailableAmount, true);
    }
  }, [formattedMaxAvailableAmount, setFocusedInput, setFromTokenInputValue]);

  useTradeboxAcceptablePriceImpactValues();
  useTradeboxTPSLReset(priceImpactWarningState.setIsDismissed);

  const prevIsISwap = usePrevious(isSwap);

  useEffect(
    function updateInputAmounts() {
      if (!fromToken || !toToken || (!isSwap && !isIncrease)) {
        return;
      }

      // reset input values when switching between swap and position tabs
      if (prevIsISwap !== undefined && isSwap !== prevIsISwap) {
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

  useEffect(
    function tradeBoxInteractionStartedEffect() {
      if (fromTokenInputValue.length > 0) {
        let pair = "";

        if (isSwap) {
          pair = `${fromToken?.symbol}/${toToken?.symbol}`;
        } else if (marketInfo) {
          pair = marketInfo.name;
        }

        let sizeDeltaUsd: bigint | undefined = undefined;
        let amountUsd: bigint | undefined = undefined;
        let priceImpactDeltaUsd = 0n;
        let priceImpactPercentage = 0n;

        if (isIncrease && increaseAmounts) {
          sizeDeltaUsd = increaseAmounts.sizeDeltaUsd;
          priceImpactDeltaUsd = increaseAmounts.positionPriceImpactDeltaUsd;
          priceImpactPercentage = fees?.increasePositionPriceImpact?.precisePercentage ?? 0n;
        } else if (isSwap && swapAmounts) {
          amountUsd = swapAmounts.usdOut;
          priceImpactDeltaUsd = swapAmounts.swapStrategy.swapPathStats?.totalSwapPriceImpactDeltaUsd ?? 0n;
          priceImpactPercentage = fees?.swapPriceImpact?.precisePercentage ?? 0n;
        } else if (isTrigger && decreaseAmounts) {
          sizeDeltaUsd = decreaseAmounts.sizeDeltaUsd;
          priceImpactDeltaUsd = decreaseAmounts.totalPendingImpactDeltaUsd;
          priceImpactPercentage = fees?.totalPendingImpact?.precisePercentage ?? 0n;
        }

        const openInterestPercent = isLong
          ? chartHeaderInfo?.longOpenInterestPercentage
          : chartHeaderInfo?.shortOpenInterestPercentage;
        const fundingRate1h = isLong ? chartHeaderInfo?.fundingRateLong : chartHeaderInfo?.fundingRateShort;

        if (!pair) {
          return;
        }

        sendTradeBoxInteractionStartedEvent({
          pair,
          sizeDeltaUsd,
          priceImpactDeltaUsd,
          priceImpactPercentage,
          fundingRate1h,
          isExpress: expressOrdersEnabled,
          isExpress1CT: Boolean(subaccount),
          openInterestPercent,
          tradeType,
          tradeMode,
          amountUsd,
        });
      }
    },
    [
      chartHeaderInfo?.fundingRateLong,
      chartHeaderInfo?.fundingRateShort,
      chartHeaderInfo?.longOpenInterestPercentage,
      chartHeaderInfo?.shortOpenInterestPercentage,
      decreaseAmounts,
      expressOrdersEnabled,
      fees?.increasePositionPriceImpact?.precisePercentage,
      fees?.totalPendingImpact?.precisePercentage,
      fees?.swapPriceImpact?.precisePercentage,
      fromToken?.symbol,
      fromTokenInputValue.length,
      increaseAmounts,
      isIncrease,
      isLong,
      isSwap,
      isTrigger,
      marketInfo,
      subaccount,
      swapAmounts,
      toToken?.symbol,
      tradeMode,
      tradeType,
    ]
  );

  useEffect(
    function gasPaymentTokenChangedEffect() {
      const handleGasPaymentTokenChanged = () => {
        setFromTokenInputValue("", true);
      };
      window.addEventListener("gasPaymentTokenChanged", handleGasPaymentTokenChanged);

      return () => {
        window.removeEventListener("gasPaymentTokenChanged", handleGasPaymentTokenChanged);
      };
    },
    [setFromTokenInputValue]
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

  const onSelectToTokenAddress = useSelector(selectTradeboxChooseSuitableMarket);

  if (showDebugValues) {
    const swapPathStats = swapAmounts?.swapStrategy.swapPathStats || increaseAmounts?.swapStrategy.swapPathStats;

    if (swapPathStats) {
      // eslint-disable-next-line no-console
      throttleLog("Swap Path", {
        steps: swapPathStats.swapSteps,
        path: swapPathStats.swapPath.map((marketAddress) => marketsInfoData?.[marketAddress]?.name).join(" -> "),
        priceImpact: swapPathStats.swapSteps.map((step) => formatDeltaUsd(step.priceImpactDeltaUsd)).join(" -> "),
        usdOut: swapPathStats.swapSteps.map((step) => formatUsd(step.usdOut)).join(" -> "),
      });
    }
  }

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
  const isNonEoaAccountOnAnyChain = useIsNonEoaAccountOnAnyChain();
  const handleSelectFromTokenAddress = useCallback(
    (tokenAddress: string, isGmxAccount: boolean) => {
      if (isGmxAccount && isNonEoaAccountOnAnyChain) {
        helperToast.error(t`Smart wallets are not supported on Express or One-Click Trading.`);
        return;
      }

      if (isGmxAccount && !expressOrdersEnabled) {
        setExpressOrdersEnabled(true);

        toastEnableExpress(() => setIsSettingsVisible(true));
      }

      onSelectFromTokenAddress(tokenAddress);
      setIsFromTokenGmxAccount(isGmxAccount);
    },
    [
      expressOrdersEnabled,
      isNonEoaAccountOnAnyChain,
      onSelectFromTokenAddress,
      setExpressOrdersEnabled,
      setIsFromTokenGmxAccount,
      setIsSettingsVisible,
    ]
  );
  const handleSelectToTokenAddress = useCallback(
    (token: Token) => onSelectToTokenAddress(token.address),
    [onSelectToTokenAddress]
  );
  const handleCloseInputChange = useCallback((e) => setCloseSizeInputValue(e.target.value), [setCloseSizeInputValue]);

  const formattedMaxCloseSize = formatAmount(selectedPosition?.sizeInUsd, USD_DECIMALS, 2);

  const setMaxCloseSize = useCallback(
    () => setCloseSizeInputValue(formattedMaxCloseSize),
    [formattedMaxCloseSize, setCloseSizeInputValue]
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
        wrappedOnSubmit();
      }
    },
    [isCursorInside, wrappedOnSubmit, submitButtonState, shouldDisableValidation]
  );

  const payUsd = isIncrease ? increaseAmounts?.initialCollateralUsd : fromUsd;

  function renderTokenInputs() {
    return (
      <>
        <BuyInputSection
          topLeftLabel={t`Pay`}
          bottomLeftValue={payUsd !== undefined ? formatUsd(payUsd) : ""}
          bottomRightValue={
            fromToken && fromToken.balance !== undefined && fromToken.balance > 0n ? (
              <>
                {formatBalanceAmount(fromToken.balance, fromToken.decimals, undefined, {
                  isStable: fromToken.isStable,
                })}{" "}
                <span className="text-typography-secondary">{fromToken.symbol}</span>
              </>
            ) : undefined
          }
          inputValue={fromTokenInputValue}
          onInputValueChange={handleFromInputTokenChange}
          onClickMax={showClickMax ? onMaxClick : undefined}
          qa="pay"
        >
          {fromTokenAddress &&
            (!isSettlementChain(chainId) || isNonEoaAccountOnAnyChain ? (
              <TokenSelector
                label={t`Pay`}
                chainId={chainId}
                tokenAddress={fromTokenAddress}
                onSelectToken={(token) => {
                  handleSelectFromTokenAddress(token.address, false);
                }}
                tokens={swapTokens}
                infoTokens={infoTokens}
                showSymbolImage={true}
                showTokenImgInDropdown={true}
                missedCoinsPlace={MissedCoinsPlace.payToken}
                extendedSortSequence={sortedLongAndShortTokens}
                qa="collateral-selector"
              />
            ) : (
              <MultichainTokenSelector
                isConnected={active}
                openConnectModal={openConnectModal}
                walletIconUrls={walletIconUrls}
                chainId={chainId}
                srcChainId={srcChainId}
                label={t`Pay`}
                tokenAddress={fromTokenAddress}
                isGmxAccount={isFromTokenGmxAccount}
                onSelectTokenAddress={handleSelectFromTokenAddress}
                extendedSortSequence={sortedLongAndShortTokens}
                qa="collateral-selector"
                tokensData={tokensData}
                multichainTokens={multichainTokens}
                onDepositTokenAddress={onDepositTokenAddress}
              />
            ))}
        </BuyInputSection>

        {isSwap && (
          <>
            <div className="relative">
              {!isTwap && (
                <button
                  type="button"
                  disabled={!isSwitchTokensAllowed}
                  className={cx(
                    `absolute -top-19 left-1/2 flex size-36 -translate-x-1/2 cursor-pointer
                    items-center justify-center rounded-full bg-slate-600 text-typography-secondary`,
                    {
                      "hover:bg-[var(--color-fill-surfaceHover)] hover:bg-[linear-gradient(0deg,var(--color-slate-600),var(--color-slate-600))] hover:bg-blend-overlay":
                        isSwitchTokensAllowed,
                    }
                  )}
                  onClick={onSwitchTokens}
                  data-qa="swap-ball"
                >
                  <ArrowDownIcon className="block" />
                </button>
              )}
              <BuyInputSection
                topLeftLabel={isTwap ? t`Receive (Approximate)` : t`Receive`}
                bottomLeftValue={
                  !isTwap && swapAmounts?.usdOut !== undefined ? formatUsd(swapAmounts?.usdOut) : undefined
                }
                bottomRightValue={
                  !isTwap && toToken && toToken.balance !== undefined && toToken.balance > 0n
                    ? formatBalanceAmount(toToken.balance, toToken.decimals, toToken.symbol, {
                        isStable: toToken.isStable,
                      })
                    : undefined
                }
                inputValue={toTokenInputValue}
                onInputValueChange={handleToInputTokenChange}
                qa="swap-receive"
                isDisabled={isTwap}
              >
                {toTokenAddress && (
                  <TokenSelector
                    label={t`Receive`}
                    chainId={chainId}
                    tokenAddress={toTokenAddress}
                    onSelectToken={handleSelectToTokenAddress}
                    tokens={swapTokens}
                    infoTokens={infoTokens}
                    showSymbolImage={true}
                    showBalances={true}
                    showTokenImgInDropdown={true}
                    extendedSortSequence={sortedLongAndShortTokens}
                    qa="receive-selector"
                  />
                )}
              </BuyInputSection>
            </div>
          </>
        )}

        {isIncrease && (
          <BuyInputSection
            topLeftLabel={localizedTradeTypeLabels[tradeType!]}
            bottomLeftValue={
              increaseAmounts?.sizeDeltaUsd !== undefined
                ? formatUsd(increaseAmounts?.sizeDeltaUsd, { fallbackToZero: true })
                : ""
            }
            bottomRightLabel={t`Leverage`}
            bottomRightValue={
              formatLeverage(isLeverageSliderEnabled ? leverage : increaseAmounts?.estimatedLeverage) || "-"
            }
            inputValue={toTokenInputValue}
            onInputValueChange={handleToInputTokenChange}
            qa="buy"
          >
            {toTokenAddress && (
              <MarketSelector
                chainId={chainId}
                label={localizedTradeTypeLabels[tradeType!]}
                selectedIndexName={toToken ? getMarketIndexName({ indexToken: toToken, isSpotOnly: false }) : undefined}
                selectedMarketLabel={
                  toToken && (
                    <div className="flex items-center">
                      <TokenIcon className="mr-4" symbol={toToken.symbol} displaySize={20} />
                      <span>{getMarketIndexName({ indexToken: toToken, isSpotOnly: false })}</span>
                    </div>
                  )
                }
                markets={sortedAllMarkets ?? EMPTY_ARRAY}
                isSideMenu
                missedCoinsPlace={MissedCoinsPlace.marketDropdown}
                onSelectMarket={(_indexName, marketInfo) => onSelectToTokenAddress(marketInfo.indexToken.address)}
              />
            )}
          </BuyInputSection>
        )}
      </>
    );
  }

  function renderDecreaseSizeInput() {
    const showMaxButton = Boolean(
      selectedPosition?.sizeInUsd && selectedPosition.sizeInUsd > 0 && closeSizeInputValue !== formattedMaxCloseSize
    );

    return (
      <BuyInputSection
        topLeftLabel={t`Close`}
        bottomRightValue={selectedPosition?.sizeInUsd ? formatUsd(selectedPosition.sizeInUsd) : undefined}
        bottomLeftValue={formatUsd(closeSizeUsd)}
        inputValue={closeSizeInputValue}
        onInputValueChange={handleCloseInputChange}
        onClickBottomRightLabel={setMaxCloseSize}
        onClickMax={showMaxButton ? setMaxCloseSize : undefined}
        showPercentSelector={selectedPosition?.sizeInUsd ? selectedPosition.sizeInUsd > 0 : false}
        onPercentChange={handleClosePercentageChange}
        qa="close"
      >
        USD
      </BuyInputSection>
    );
  }

  function renderTriggerPriceInput() {
    const priceLabel = isLimit ? (tradeMode === TradeMode.Limit ? t`Limit Price` : t`Stop Price`) : t`Trigger Price`;

    return (
      <BuyInputSection
        topLeftLabel={priceLabel}
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
        topLeftLabel={t`Limit Price`}
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

  useKey(
    "Enter",
    () => {
      if (isCursorInside && (!submitButtonState.disabled || shouldDisableValidation)) {
        wrappedOnSubmit();
      }
    },
    {},
    [submitButtonState.disabled, shouldDisableValidation, isCursorInside, wrappedOnSubmit]
  );

  const buttonContent = (
    <Button
      qa="confirm-trade-button"
      variant="primary-action"
      className="w-full [text-decoration:inherit]"
      onClick={wrappedOnSubmit}
      disabled={submitButtonState.disabled && !shouldDisableValidation}
    >
      {submitButtonState.text}
    </Button>
  );
  const button = submitButtonState.tooltipContent ? (
    <Tooltip
      className="w-full"
      content={submitButtonState.tooltipContent}
      handle={buttonContent}
      isHandlerDisabled
      handleClassName="w-full"
      position="bottom"
      variant="none"
      contentClassName="w-full"
    />
  ) : (
    buttonContent
  );

  let nextLiqPriceFormatted = useMemo(() => {
    if (isTrigger && decreaseAmounts?.isFullClose) {
      return "-";
    }

    if (isIncrease && (increaseAmounts === undefined || increaseAmounts.sizeDeltaUsd === 0n)) {
      if (selectedPosition) {
        return undefined;
      } else {
        return "-";
      }
    }

    return formatLiquidationPrice(nextPositionValues?.nextLiqPrice, {
      visualMultiplier: toToken?.visualMultiplier,
    });
  }, [
    isTrigger,
    decreaseAmounts?.isFullClose,
    isIncrease,
    increaseAmounts,
    nextPositionValues?.nextLiqPrice,
    toToken?.visualMultiplier,
    selectedPosition,
  ]);

  const keepLeverage = useSelector(selectTradeboxKeepLeverage);
  const keepLeverageChecked = decreaseAmounts?.isFullClose ? false : keepLeverage ?? false;
  const setKeepLeverage = useSelector(selectTradeboxSetKeepLeverage);
  const settingsWarningDotVisible = useSelector(selectSettingsWarningDotVisible);

  const tabsOptions = useMemo(() => {
    const modeToOptions = (mode: TradeMode) => ({
      value: mode,
      label: localizedTradeModeLabels[mode],
    });

    return availableTradeModes.map((mode) =>
      Array.isArray(mode)
        ? {
            label: t`More`,
            options: mode.map(modeToOptions),
          }
        : modeToOptions(mode)
    );
  }, [availableTradeModes, localizedTradeModeLabels]);

  const collateralWarnings = useCollateralWarnings();

  return (
    <form className="flex flex-col gap-8" onSubmit={handleFormSubmit} ref={formRef}>
      <div className="flex flex-col gap-12 rounded-b-8 bg-slate-900 pb-16 pt-12">
        <div className="flex flex-col gap-12 px-12">
          <div className="flex items-center justify-between">
            <Tabs
              options={tabsOptions}
              type="inline"
              selectedValue={tradeMode}
              onChange={onSelectTradeMode}
              qa="trade-mode"
              className="bg-slate-900 text-13"
              regularOptionClassname="grow"
            />
            <div className="flex items-center gap-4">
              <TradeInfoIcon isMobile={isMobile} tradeType={tradeType} tradePlace="tradebox" />

              <div className="relative">
                <SettingsIcon
                  className="size-16 cursor-pointer text-typography-secondary gmx-hover:text-typography-primary"
                  onClick={() => setIsSettingsVisible(true)}
                />
                {settingsWarningDotVisible && (
                  <div className="absolute bottom-6 right-3 h-6 w-6 rounded-full bg-red-400" />
                )}
              </div>
            </div>
          </div>
          <div className="text-body-medium flex grow flex-col gap-14">
            <div className="flex flex-col gap-4">
              {isSwap && renderTokenInputs()}
              {isIncrease && (
                <TradeboxMarginFields
                  onSelectFromTokenAddress={handleSelectFromTokenAddress}
                  onDepositTokenAddress={onDepositTokenAddress}
                  fromTokenInputValue={fromTokenInputValue}
                  setFromTokenInputValue={setFromTokenInputValue}
                  setFocusedInput={setFocusedInput}
                  toTokenInputValue={toTokenInputValue}
                  setToTokenInputValue={setToTokenInputValue}
                  expressOrdersEnabled={expressOrdersEnabled}
                  gasPaymentTokenAmountForMax={gasPaymentTokenAmountForMax}
                  isGasPaymentTokenAmountForMaxApproximate={isGasPaymentTokenAmountForMaxApproximate}
                  isExpressLoading={submitButtonState.isExpressLoading}
                  triggerPriceInputValue={triggerPriceInputValue}
                  onTriggerPriceInputChange={handleTriggerPriceInputChange}
                />
              )}
              {isTrigger && renderDecreaseSizeInput()}
              {isSwap && isLimit && renderTriggerRatioInput()}
              {isTrigger && renderTriggerPriceInput()}
            </div>

            {twapRecommendation && (
              <ColorfulBanner color="blue" icon={InfoCircleIcon}>
                <div className="flex flex-col gap-8">
                  <span>
                    <span
                      className="cursor-pointer font-medium text-blue-300"
                      onClick={() => onSelectTradeMode(TradeMode.Twap)}
                    >
                      <Trans>Use a TWAP order</Trans>
                    </span>{" "}
                    <Trans> for lower net price impact.</Trans>
                  </span>
                </div>
              </ColorfulBanner>
            )}

            {maxAutoCancelOrdersWarning}
            {isSwap && isLimit && !isTwap && !limitPriceWarningHidden && (
              <AlertInfoCard onClose={() => setLimitPriceWarningHidden(true)}>
                <Trans>
                  The actual execution price may differ from the set limit price due to fees and price impact. This
                  ensures that you receive at least the minimum receive amount.
                </Trans>
              </AlertInfoCard>
            )}

            {showHighLeverageWarning && (
              <AlertInfoCard type="info" onClose={dismissHighLeverageWarning}>
                <Trans>Using high leverage increases the risk of liquidation.</Trans>
              </AlertInfoCard>
            )}
            {isTrigger && (
              <SyntheticsInfoRow
                label={t`Market`}
                value={
                  <MarketSelector
                    chainId={chainId}
                    label={t`Market`}
                    selectedIndexName={
                      toToken ? getMarketIndexName({ indexToken: toToken, isSpotOnly: false }) : undefined
                    }
                    markets={sortedAllMarkets ?? EMPTY_ARRAY}
                    isSideMenu
                    onSelectMarket={handleSelectMarket}
                  />
                }
              />
            )}

            {isPosition ? (
              <>
                <TradeboxPoolWarnings />

                {collateralWarnings}
              </>
            ) : null}

            {isTwap && (
              <TwapRows
                duration={duration}
                numberOfParts={numberOfParts}
                setNumberOfParts={setNumberOfParts}
                setDuration={setDuration}
                sizeUsd={isSwap ? payUsd : increaseAmounts?.sizeDeltaUsd}
                marketInfo={marketInfo}
                type={isSwap ? "swap" : "increase"}
                isLong={isLong}
              />
            )}
          </div>
        </div>
        <div className="flex flex-col gap-14 border-t-1/2 border-t-slate-600 px-12 pt-12">
          {isPosition && isTrigger && selectedPosition && selectedPosition?.leverage !== undefined && (
            <ToggleSwitch
              isChecked={keepLeverageChecked}
              setIsChecked={setKeepLeverage}
              disabled={decreaseAmounts?.isFullClose}
            >
              <span className="text-14 text-typography-secondary">
                <Trans>Keep leverage at {formatLeverage(selectedPosition.leverage)}</Trans>
              </span>
            </ToggleSwitch>
          )}

          {!isTrigger && !isSwap && !isTwap && <TPSLGroup />}

          {priceImpactWarningState.shouldShowWarning && (
            <HighPriceImpactOrFeesWarningCard
              priceImpactWarningState={priceImpactWarningState}
              swapPriceImpact={fees?.swapPriceImpact}
              swapProfitFee={fees?.swapProfitFee}
              executionFeeUsd={executionFee?.feeUsd}
              externalSwapFeeItem={fees?.externalSwapFee}
            />
          )}

          <div>{button}</div>
          <ExpressTradingWarningCard
            expressParams={submitButtonState.expressParams}
            payTokenAddress={!tradeFlags.isTrigger ? fromTokenAddress : undefined}
            isWrapOrUnwrap={!tradeFlags.isTrigger && isWrapOrUnwrap}
            disabled={shouldShowDepositButton}
            isGmxAccount={isFromTokenGmxAccount}
          />
        </div>
      </div>

      <div className="flex flex-col gap-14 rounded-8 bg-slate-900 p-12 pb-16">
        {isSwap && !isTwap && <MinReceiveRow allowedSlippage={allowedSlippage} />}
        {isTrigger && selectedPosition && decreaseAmounts?.receiveUsd !== undefined && (
          <SyntheticsInfoRow
            label={t`Receive`}
            value={formatTokenAmountWithUsd(
              decreaseAmounts.receiveTokenAmount,
              decreaseAmounts.receiveUsd,
              collateralToken?.symbol,
              collateralToken?.decimals
            )}
            valueClassName="numbers"
          />
        )}

        {isTrigger && (
          <SyntheticsInfoRow
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
                  decreaseAmounts?.sizeDeltaUsd && decreaseAmounts.sizeDeltaUsd > 0 ? (
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
        {!(isTrigger && !selectedPosition) && !isSwap && !isTwap && (
          <SyntheticsInfoRow
            label={t`Liquidation Price`}
            value={
              <ValueTransition
                from={
                  selectedPosition
                    ? formatLiquidationPrice(selectedPosition?.liquidationPrice, {
                        visualMultiplier: toToken?.visualMultiplier,
                      })
                    : undefined
                }
                to={nextLiqPriceFormatted}
              />
            }
          />
        )}
        {!isTwap && <PriceImpactFeesRow />}
        <TradeBoxAdvancedGroups
          slippageInputId={submitButtonState.slippageInputId}
          gasPaymentParams={submitButtonState.expressParams?.gasPaymentParams}
          totalExecutionFee={submitButtonState.totalExecutionFee}
        />
      </div>
    </form>
  );
}
