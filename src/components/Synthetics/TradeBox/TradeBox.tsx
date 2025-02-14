import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import { ChangeEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef } from "react";
import { IoArrowDown } from "react-icons/io5";
import { useKey, useLatest, usePrevious } from "react-use";

import { BASIS_POINTS_DIVISOR, USD_DECIMALS } from "config/factors";
import { NATIVE_TOKEN_ADDRESS, getTokenVisualMultiplier } from "sdk/configs/tokens";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useMarketsInfoData, useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectChartHeaderInfo } from "context/SyntheticsStateContext/selectors/chartSelectors";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import {
  selectTradeboxAllowedSlippage,
  selectTradeboxAvailableTokensOptions,
  selectTradeboxChooseSuitableMarket,
  selectTradeboxDecreasePositionAmounts,
  selectTradeboxExecutionFee,
  selectTradeboxExecutionPrice,
  selectTradeboxFees,
  selectTradeboxIncreasePositionAmounts,
  selectTradeboxKeepLeverage,
  selectTradeboxLeverage,
  selectTradeboxLeverageSliderMarks,
  selectTradeboxMarkPrice,
  selectTradeboxMaxLeverage,
  selectTradeboxNextPositionValues,
  selectTradeboxSelectedPosition,
  selectTradeboxSelectedPositionKey,
  selectTradeboxSetKeepLeverage,
  selectTradeboxState,
  selectTradeboxSwapAmounts,
  selectTradeboxTradeFlags,
  selectTradeboxTradeRatios,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { MarketInfo, getMarketIndexName } from "domain/synthetics/markets";
import { formatLeverage, formatLiquidationPrice } from "domain/synthetics/positions";
import { convertToUsd } from "domain/synthetics/tokens";
import { useMaxAutoCancelOrdersState } from "domain/synthetics/trade/useMaxAutoCancelOrdersState";
import { usePriceImpactWarningState } from "domain/synthetics/trade/usePriceImpactWarningState";
import { MissedCoinsPlace } from "domain/synthetics/userFeedback";
import { Token } from "domain/tokens";
import { useMaxAvailableAmount } from "domain/tokens/useMaxAvailableAmount";
import { useLocalizedMap } from "lib/i18n";
import {
  calculateDisplayDecimals,
  formatAmount,
  formatAmountFree,
  formatBalanceAmount,
  formatDeltaUsd,
  formatTokenAmountWithUsd,
  formatUsd,
  formatUsdPrice,
  parseValue,
} from "lib/numbers";
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import { useCursorInside } from "lib/useCursorInside";
import { sendTradeBoxInteractionStartedEvent } from "lib/userAnalytics";
import useWallet from "lib/wallets/useWallet";

import { useDecreaseOrdersThatWillBeExecuted } from "./hooks/useDecreaseOrdersThatWillBeExecuted";
import { useShowOneClickTradingInfo } from "./hooks/useShowOneClickTradingInfo";
import { useTradeboxButtonState } from "./hooks/useTradeButtonState";
import { useTradeboxAvailablePriceImpactValues } from "./hooks/useTradeboxAvailablePriceImpactValues";
import { useTradeboxTPSLReset } from "./hooks/useTradeboxTPSLReset";

import { AlertInfoCard } from "components/AlertInfo/AlertInfoCard";
import Button from "components/Button/Button";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { LeverageSlider } from "components/LeverageSlider/LeverageSlider";
import { MarketSelector } from "components/MarketSelector/MarketSelector";
import SuggestionInput from "components/SuggestionInput/SuggestionInput";
import { SyntheticsInfoRow } from "components/Synthetics/SyntheticsInfoRow";
import Tab from "components/Tab/Tab";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TokenWithIcon from "components/TokenIcon/TokenWithIcon";
import TokenSelector from "components/TokenSelector/TokenSelector";
import Tooltip from "components/Tooltip/Tooltip";
import { ValueTransition } from "components/ValueTransition/ValueTransition";

import { ExecutionPriceRow } from "../ExecutionPriceRow";
import { HighPriceImpactOrFeesWarningCard } from "../HighPriceImpactOrFeesWarningCard/HighPriceImpactOrFeesWarningCard";
import { MarketPoolSelectorRow } from "./MarketPoolSelectorRow";
import { OneClickTradingInfo } from "./OneClickTradingInfo";
import { TradeBoxAdvancedGroups } from "./TradeBoxRows/AdvancedDisplayRows";
import { CollateralSelectorRow } from "./TradeBoxRows/CollateralSelectorRow";
import { LimitAndTPSLGroup } from "./TradeBoxRows/LimitAndTPSLRows";
import { LimitPriceRow } from "./TradeBoxRows/LimitPriceRow";
import { MinReceiveRow } from "./TradeBoxRows/MinReceiveRow";
import { PriceImpactFeesRow } from "./TradeBoxRows/PriceImpactFeesRow";

import { tradeModeLabels, tradeTypeLabels } from "./tradeboxConstants";

import SettingsIcon24 from "img/ic_settings_24.svg?react";

import "./TradeBox.scss";

export function TradeBox() {
  const localizedTradeModeLabels = useLocalizedMap(tradeModeLabels);
  const localizedTradeTypeLabels = useLocalizedMap(tradeTypeLabels);

  const avaialbleTokenOptions = useSelector(selectTradeboxAvailableTokensOptions);
  const chartHeaderInfo = useSelector(selectChartHeaderInfo);
  const formRef = useRef<HTMLFormElement>(null);
  const isCursorInside = useCursorInside(formRef);

  const allowedSlippage = useSelector(selectTradeboxAllowedSlippage);

  const { swapTokens, infoTokens, sortedLongAndShortTokens, sortedAllMarkets } = avaialbleTokenOptions;
  const tokensData = useTokensData();
  const marketsInfoData = useMarketsInfoData();

  const tradeFlags = useSelector(selectTradeboxTradeFlags);
  const { isLong, isSwap, isIncrease, isPosition, isLimit, isTrigger, isMarket } = tradeFlags;

  const chainId = useSelector(selectChainId);
  const { account } = useWallet();
  const { showDebugValues, shouldDisableValidationForTesting: shouldDisableValidation } = useSettings();

  const nativeToken = getByKey(tokensData, NATIVE_TOKEN_ADDRESS);

  const {
    fromTokenInputValue,
    setFromTokenInputValue: setFromTokenInputValueRaw,
    toTokenInputValue,
    setToTokenInputValue: setToTokenInputValueRaw,
    setCollateralAddress: onSelectCollateralAddress,
    setFromTokenAddress: onSelectFromTokenAddress,
    setTradeMode: onSelectTradeMode,
    focusedInput,
    setFocusedInput,
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
    isSwitchTokensAllowed,
    switchTokenAddresses,
    tradeMode,
    tradeType,
    collateralToken,
    fromTokenAddress,
    marketInfo,
    toTokenAddress,
    availableTradeModes,
  } = useSelector(selectTradeboxState);

  const fromToken = getByKey(tokensData, fromTokenAddress);
  const toToken = getByKey(tokensData, toTokenAddress);
  const fromTokenAmount = fromToken ? parseValue(fromTokenInputValue || "0", fromToken.decimals)! : 0n;
  const fromTokenPrice = fromToken?.prices.minPrice;
  const fromUsd = convertToUsd(fromTokenAmount, fromToken?.decimals, fromTokenPrice);

  const { formattedMaxAvailableAmount, showClickMax } = useMaxAvailableAmount({
    fromToken,
    nativeToken,
    fromTokenAmount,
    fromTokenInputValue,
  });

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

  const executionFee = useSelector(selectTradeboxExecutionFee);
  const { markRatio } = useSelector(selectTradeboxTradeRatios);

  const leverageSliderMarks = useSelector(selectTradeboxLeverageSliderMarks);
  const maxLeverage = useSelector(selectTradeboxMaxLeverage);
  const executionPrice = useSelector(selectTradeboxExecutionPrice);

  const maxAllowedLeverage = maxLeverage / 2;

  const decreaseOrdersThatWillBeExecuted = useDecreaseOrdersThatWillBeExecuted();

  const priceImpactWarningState = usePriceImpactWarningState({
    collateralImpact: fees?.positionCollateralPriceImpact,
    positionImpact: fees?.positionPriceImpact,
    swapPriceImpact: fees?.swapPriceImpact,
    swapProfitFee: fees?.swapProfitFee,
    executionFeeUsd: executionFee?.feeUsd,
    willDecreaseOrdersBeExecuted: decreaseOrdersThatWillBeExecuted.length > 0,
    tradeFlags,
  });

  const setIsDismissedRef = useLatest(priceImpactWarningState.setIsDismissed);

  const setFromTokenInputValue = useCallback(
    (value: string, shouldResetPriceImpactWarning: boolean) => {
      setFromTokenInputValueRaw(value);
      if (shouldResetPriceImpactWarning) {
        setIsDismissedRef.current(false);
      }
    },
    [setFromTokenInputValueRaw, setIsDismissedRef]
  );
  const setToTokenInputValue = useCallback(
    (value: string, shouldResetPriceImpactWarning: boolean) => {
      setToTokenInputValueRaw(value);
      if (shouldResetPriceImpactWarning) {
        setIsDismissedRef.current(false);
      }
    },
    [setIsDismissedRef, setToTokenInputValueRaw]
  );

  const { warning: maxAutoCancelOrdersWarning } = useMaxAutoCancelOrdersState({
    positionKey: selectedPositionKey,
    isCreatingNewAutoCancel: isTrigger,
  });

  const submitButtonState = useTradeboxButtonState({
    account,
    setToTokenInputValue,
  });

  useTradeboxAvailablePriceImpactValues();
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
          priceImpactPercentage = fees?.positionPriceImpact?.precisePercentage ?? 0n;
        } else if (isSwap && swapAmounts) {
          amountUsd = swapAmounts.usdOut;
          priceImpactDeltaUsd = swapAmounts.swapPathStats?.totalSwapPriceImpactDeltaUsd ?? 0n;
          priceImpactPercentage = fees?.swapPriceImpact?.precisePercentage ?? 0n;
        } else if (isTrigger && decreaseAmounts) {
          sizeDeltaUsd = decreaseAmounts.sizeDeltaUsd;
          priceImpactDeltaUsd = decreaseAmounts.positionPriceImpactDeltaUsd;
          priceImpactPercentage = fees?.positionPriceImpact?.precisePercentage ?? 0n;
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
          openInterestPercent,
          tradeType,
          tradeMode,
          amountUsd,
        });
      }
    },
    [
      chainId,
      chartHeaderInfo,
      decreaseAmounts,
      fees,
      fromToken?.symbol,
      fromTokenInputValue,
      increaseAmounts,
      isIncrease,
      isLong,
      isSwap,
      isTrigger,
      marketInfo,
      swapAmounts,
      toToken?.symbol,
      tradeMode,
      tradeType,
    ]
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
    if (formattedMaxAvailableAmount) {
      setFocusedInput("from");
      setFromTokenInputValue(formattedMaxAvailableAmount, true);
    }
  }, [formattedMaxAvailableAmount, setFocusedInput, setFromTokenInputValue]);

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
        submitButtonState.onSubmit();
      }
    },
    [isCursorInside, submitButtonState, shouldDisableValidation]
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
    const payUsd = isIncrease ? increaseAmounts?.initialCollateralUsd : fromUsd;
    return (
      <>
        <BuyInputSection
          topLeftLabel={t`Pay`}
          bottomLeftValue={payUsd !== undefined ? formatUsd(payUsd) : ""}
          isBottomLeftValueMuted={payUsd === undefined || payUsd === 0n}
          bottomRightValue={
            fromToken && fromToken.balance !== undefined && fromToken.balance > 0n
              ? formatBalanceAmount(fromToken.balance, fromToken.decimals, fromToken.symbol)
              : undefined
          }
          inputValue={fromTokenInputValue}
          onInputValueChange={handleFromInputTokenChange}
          onClickMax={showClickMax ? onMaxClick : undefined}
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
              size="l"
              showSymbolImage={true}
              showTokenImgInDropdown={true}
              missedCoinsPlace={MissedCoinsPlace.payToken}
              extendedSortSequence={sortedLongAndShortTokens}
              qa="collateral-selector"
            />
          )}
        </BuyInputSection>

        {isSwap && (
          <>
            <div className="relative">
              <button
                type="button"
                disabled={!isSwitchTokensAllowed}
                className="absolute -top-19 left-1/2 flex size-36 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full bg-cold-blue-500 active:bg-[#505699]
                           desktop-hover:bg-[#484e92]"
                onClick={onSwitchTokens}
                data-qa="swap-ball"
              >
                <IoArrowDown size={24} className="block" />
              </button>
              <BuyInputSection
                topLeftLabel={t`Receive`}
                bottomLeftValue={swapAmounts?.usdOut !== undefined ? formatUsd(swapAmounts?.usdOut) : undefined}
                bottomRightValue={
                  toToken && toToken.balance !== undefined && toToken.balance > 0n
                    ? formatBalanceAmount(toToken.balance, toToken.decimals, toToken.symbol)
                    : undefined
                }
                isBottomLeftValueMuted={swapAmounts?.usdOut === undefined || swapAmounts.usdOut === 0n}
                inputValue={toTokenInputValue}
                onInputValueChange={handleToInputTokenChange}
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
            isBottomLeftValueMuted={increaseAmounts?.sizeDeltaUsd === undefined || increaseAmounts?.sizeDeltaUsd === 0n}
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
                    <>
                      <span className="inline-flex items-center">
                        <TokenIcon className="mr-5" symbol={toToken.symbol} importSize={24} displaySize={20} />
                        <span>
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
                size="l"
              />
            )}
          </BuyInputSection>
        )}
      </>
    );
  }

  function renderDecreaseSizeInput() {
    const showMaxButton = Boolean(
      selectedPosition?.sizeInUsd && selectedPosition.sizeInUsd > 0 && closeSizeUsd != selectedPosition.sizeInUsd
    );

    return (
      <BuyInputSection
        topLeftLabel={t`Close`}
        topRightValue={selectedPosition?.sizeInUsd ? formatUsd(selectedPosition.sizeInUsd) : undefined}
        inputValue={closeSizeInputValue}
        onInputValueChange={handleCloseInputChange}
        onClickBottomRightLabel={setMaxCloseSize}
        maxButtonPosition="top-right"
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
    return (
      <BuyInputSection
        topLeftLabel={isLimit ? t`Limit Price` : t`Trigger Price`}
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
        <SyntheticsInfoRow label={t`Trigger Price`} value={formattedTriggerPrice} />

        {!isTrigger && (
          <ExecutionPriceRow
            tradeFlags={tradeFlags}
            fees={fees}
            executionPrice={executionPrice ?? undefined}
            triggerOrderType={decreaseAmounts?.triggerOrderType}
            acceptablePrice={decreaseAmounts?.acceptablePrice}
            visualMultiplier={toToken?.visualMultiplier}
          />
        )}
      </>
    );
  }

  useKey(
    "Enter",
    () => {
      if (isCursorInside && (!submitButtonState.disabled || shouldDisableValidation)) {
        submitButtonState.onSubmit();
      }
    },
    {},
    [submitButtonState.disabled, shouldDisableValidation, isCursorInside, submitButtonState.onSubmit]
  );

  const buttonContent = (
    <Button
      qa="confirm-trade-button"
      variant="primary-action"
      className="w-full [text-decoration:inherit]"
      onClick={submitButtonState.onSubmit}
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

  const { setIsSettingsVisible, isLeverageSliderEnabled } = useSettings();

  const { shouldShowWarning: shouldShowOneClickTradingWarning } = useShowOneClickTradingInfo();

  const showSectionBetweenInputsAndButton =
    isPosition ||
    priceImpactWarningState.shouldShowWarning ||
    (!isTrigger && !isSwap) ||
    (isSwap && isLimit) ||
    maxAutoCancelOrdersWarning ||
    shouldShowOneClickTradingWarning;

  return (
    <>
      <div className="flex items-center justify-between">
        <Tab
          options={availableTradeModes}
          optionLabels={localizedTradeModeLabels}
          commonOptionClassname="py-10"
          type="inline"
          option={tradeMode}
          onChange={onSelectTradeMode}
          qa="trade-mode"
        />
        <SettingsIcon24
          className="cursor-pointer text-slate-100 gmx-hover:text-white"
          onClick={() => setIsSettingsVisible(true)}
        />
      </div>
      <form onSubmit={handleFormSubmit} ref={formRef} className="text-body-medium flex grow flex-col">
        <div className="flex flex-col gap-2">
          {(isSwap || isIncrease) && renderTokenInputs()}
          {isTrigger && renderDecreaseSizeInput()}

          {isSwap && isLimit && renderTriggerRatioInput()}
          {isPosition && (isLimit || isTrigger) && renderTriggerPriceInput()}
        </div>

        {showSectionBetweenInputsAndButton && (
          <div className="flex flex-col gap-14 pt-12">
            <OneClickTradingInfo />
            {maxAutoCancelOrdersWarning}
            {isSwap && isLimit && (
              <AlertInfoCard key="showHasBetterOpenFeesAndNetFeesWarning">
                <Trans>
                  The execution price will constantly vary based on fees and price impact to guarantee that you receive
                  the minimum receive amount.
                </Trans>
              </AlertInfoCard>
            )}

            {isPosition && (
              <>
                {isIncrease && isLeverageSliderEnabled && (
                  <div className="flex items-start gap-6">
                    <LeverageSlider
                      className="grow"
                      marks={leverageSliderMarks}
                      value={leverageOption}
                      onChange={setLeverageOption}
                      isPositive={isLong}
                      isSlim
                    />
                    <SuggestionInput
                      className="w-48"
                      value={leverageInputValue}
                      setValue={setLeverageInputValue}
                      onBlur={handleLeverageInputBlur}
                      onKeyDown={handleLeverageInputKeyDown}
                      symbol="x"
                    />
                  </div>
                )}
                {isTrigger && (
                  <SyntheticsInfoRow
                    label={t`Market`}
                    value={
                      <MarketSelector
                        chainId={chainId}
                        label={t`Market`}
                        className="-mr-4"
                        selectedIndexName={
                          toToken ? getMarketIndexName({ indexToken: toToken, isSpotOnly: false }) : undefined
                        }
                        markets={sortedAllMarkets ?? EMPTY_ARRAY}
                        isSideMenu
                        onSelectMarket={handleSelectMarket}
                        size="m"
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

                {isTrigger && selectedPosition && selectedPosition?.leverage && (
                  <ToggleSwitch
                    isChecked={keepLeverageChecked}
                    setIsChecked={setKeepLeverage}
                    disabled={decreaseAmounts?.isFullClose}
                  >
                    <span className="text-14 text-slate-100">
                      <Trans>Keep leverage at {formatLeverage(selectedPosition.leverage)}</Trans>
                    </span>
                  </ToggleSwitch>
                )}
              </>
            )}
            {(priceImpactWarningState.shouldShowWarning || (!isTrigger && !isSwap)) && (
              <div
                className={cx("flex flex-col justify-between gap-14", {
                  "min-[1101px]:min-h-[167px]": !isTrigger && !isSwap,
                })}
              >
                <LimitAndTPSLGroup />

                <HighPriceImpactOrFeesWarningCard
                  priceImpactWarningState={priceImpactWarningState}
                  collateralImpact={fees?.positionCollateralPriceImpact}
                  positionImpact={fees?.positionPriceImpact}
                  swapPriceImpact={fees?.swapPriceImpact}
                  swapProfitFee={fees?.swapProfitFee}
                  executionFeeUsd={executionFee?.feeUsd}
                />
              </div>
            )}
          </div>
        )}
        <div className="flex flex-col gap-14 pt-14">
          <div>{button}</div>
          <div className="h-1 bg-stroke-primary" />
          {isSwap && <MinReceiveRow allowedSlippage={allowedSlippage} />}
          {!(isSwap && isLimit) && <LimitPriceRow />}
          {isTrigger && selectedPosition && decreaseAmounts?.receiveUsd !== undefined && (
            <SyntheticsInfoRow
              label={t`Receive`}
              value={formatTokenAmountWithUsd(
                decreaseAmounts.receiveTokenAmount,
                decreaseAmounts.receiveUsd,
                collateralToken?.symbol,
                collateralToken?.decimals
              )}
            />
          )}

          {isTrigger && renderTriggerOrderInfo()}
          {!(isTrigger && !selectedPosition) && !isSwap && (
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
          <PriceImpactFeesRow />
          <TradeBoxAdvancedGroups />
        </div>
      </form>
    </>
  );
}
