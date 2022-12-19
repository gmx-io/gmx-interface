import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Checkbox from "components/Checkbox/Checkbox";
import { LeverageSlider } from "components/LeverageSlider/LeverageSlider";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import Tab from "components/Tab/Tab";
import TokenSelector from "components/TokenSelector/TokenSelector";
import {
  LEVERAGE_ENABLED_KEY,
  LEVERAGE_OPTION_KEY,
  SYNTHETICS_SWAP_MODE_KEY,
  SYNTHETICS_SWAP_OPERATION_KEY,
} from "config/localStorage";
import { getWrappedToken, NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { getPositionMarketsPath, getSwapPath, useSwapTokenState } from "domain/synthetics/exchange";
import { getExecutionFee } from "domain/synthetics/fees";
import { getMarkets, useMarketsData, useMarketsPoolsData } from "domain/synthetics/markets";
import {
  adaptToInfoTokens,
  convertFromUsdByPrice,
  convertToUsdByPrice,
  formatTokenAmount,
  formatUsdAmount,
  getTokenData,
  TokenData,
  useAvailableTradeTokensData,
} from "domain/synthetics/tokens";
import { Token } from "domain/tokens";
import { BigNumber } from "ethers";

import { useChainId } from "lib/chains";
import { BASIS_POINTS_DIVISOR, PRECISION, USD_DECIMALS } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { bigNumberify, formatAmount, parseValue } from "lib/numbers";
import { useEffect, useMemo, useState } from "react";
import { IoMdSwap } from "react-icons/io";
import { SyntheticsSwapConfirmation } from "../SyntheticsSwapConfirmation/SyntheticsSwapConfirmation";
import { SyntheticSwapStatus } from "../SyntheticsSwapStatus/SyntheticsSwapStatus";
import { avaialbleModes, getSubmitError, Mode, modeTexts, Operation, operationIcons, operationTexts } from "../utils";

import "./SyntheticsSwapBox.scss";

enum FocusedInput {
  From = "From",
  To = "To",
}

type Props = {
  onConnectWallet: () => void;
};

const TRIGGER_RATIO_PRECISION = PRECISION;
const LEVERAGE_PRECISION = BigNumber.from(BASIS_POINTS_DIVISOR);

export function getNextTokenAmount(p: {
  fromTokenAmount: BigNumber;
  fromTokenPrice: BigNumber;
  fromToken: Token;
  toToken: Token;
  toTokenPrice: BigNumber;
  triggerPrice?: BigNumber;
  shouldInvertTriggerPrice?: boolean;
  swapTriggerRatio?: BigNumber;
  shouldInvertRatio?: boolean;
  leverageMultiplier?: BigNumber;
  shouldInvertLeverage?: boolean;
}) {
  const fromUsdAmount = convertToUsdByPrice(p.fromTokenAmount, p.fromToken.decimals, p.fromTokenPrice);

  let toAmount: BigNumber | undefined = convertFromUsdByPrice(fromUsdAmount, p.toToken.decimals, p.toTokenPrice);

  if (!toAmount || !fromUsdAmount) return undefined;

  if (p.swapTriggerRatio?.gt(0)) {
    const ratio = p.shouldInvertRatio
      ? p.swapTriggerRatio
      : TRIGGER_RATIO_PRECISION.mul(TRIGGER_RATIO_PRECISION).div(p.swapTriggerRatio);

    toAmount = p.fromTokenAmount.mul(ratio).div(TRIGGER_RATIO_PRECISION);
  } else if (p.triggerPrice?.gt(0)) {
    if (p.shouldInvertTriggerPrice) {
      const toAmountUsd = convertToUsdByPrice(p.fromTokenAmount, p.fromToken.decimals, p.triggerPrice);

      toAmount = convertFromUsdByPrice(toAmountUsd, p.toToken.decimals, p.toTokenPrice);
    } else {
      toAmount = convertFromUsdByPrice(fromUsdAmount, p.toToken.decimals, p.triggerPrice);
    }
  }

  if (p.leverageMultiplier) {
    const leverage = p.shouldInvertLeverage
      ? LEVERAGE_PRECISION.mul(LEVERAGE_PRECISION).div(p.leverageMultiplier)
      : p.leverageMultiplier;

    toAmount = toAmount?.mul(leverage).div(LEVERAGE_PRECISION);
  }

  return toAmount;
}

export function SyntheticsSwapBox(p: Props) {
  const { chainId } = useChainId();

  const marketsData = useMarketsData(chainId);
  const poolsData = useMarketsPoolsData(chainId);
  const tokensData = useAvailableTradeTokensData(chainId);

  const [focusedInput, setFocusedInput] = useState<FocusedInput>();
  const [operationTab, setOperationTab] = useLocalStorageSerializeKey(
    [chainId, SYNTHETICS_SWAP_OPERATION_KEY],
    Operation.Long
  );
  const [modeTab, setModeTab] = useLocalStorageSerializeKey([chainId, SYNTHETICS_SWAP_MODE_KEY], Mode.Market);

  const isLong = operationTab === Operation.Long;
  const isShort = operationTab === Operation.Short;
  const isSwap = operationTab === Operation.Swap;
  const isLimit = modeTab === Mode.Limit;
  const isTriggerPriceAllowed = !isSwap && isLimit;
  const isSwapTriggerRatioAllowed = isSwap && isLimit;
  const isLeverageAllowed = isLong || isShort;

  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fromTokenState = useSwapTokenState(tokensData);
  const toTokenState = useSwapTokenState(tokensData, { useMaxPrice: true });

  const [leverageOption, setLeverageOption] = useLocalStorageSerializeKey<number | undefined>(
    [chainId, LEVERAGE_OPTION_KEY],
    2
  );
  const [isLeverageEnabled, setIsLeverageEnabled] = useLocalStorageSerializeKey([chainId, LEVERAGE_ENABLED_KEY], true);
  const leverageMultiplier =
    isLeverageAllowed && isLeverageEnabled && leverageOption
      ? bigNumberify(parseInt(String(Number(leverageOption) * BASIS_POINTS_DIVISOR)))
      : undefined;

  const [triggerPriceValue, setTriggerPriceValue] = useState<string>("");
  const triggerPrice = isTriggerPriceAllowed ? parseValue(triggerPriceValue, USD_DECIMALS) : undefined;

  const toTokenPrice = triggerPrice?.gt(0) ? triggerPrice : toTokenState.price;
  const sizeDeltaUsd =
    toTokenState.token && toTokenPrice
      ? convertToUsdByPrice(toTokenState.tokenAmount, toTokenState.token?.decimals, toTokenPrice)
      : BigNumber.from(0);

  const [swapTriggerRatioValue, setSwapTriggerRatioValue] = useState<string | undefined>();
  const swapRatio = getSwapTrigerRatio();

  const { availableFromTokens, availableToTokens } = useMemo(() => {
    const longCollateralsMap: { [key: string]: TokenData | undefined } = {};
    const shortCollateralsMap: { [key: string]: TokenData | undefined } = {};
    const indexTokensMap: { [key: string]: TokenData | undefined } = {};

    const markets = getMarkets(marketsData);
    const wrappedToken = getWrappedToken(chainId);

    for (const market of markets) {
      longCollateralsMap[market.longTokenAddress] = getTokenData(tokensData, market.longTokenAddress);
      shortCollateralsMap[market.shortTokenAddress] = getTokenData(tokensData, market.shortTokenAddress);
      indexTokensMap[market.indexTokenAddress] = getTokenData(tokensData, market.indexTokenAddress);
    }

    if (NATIVE_TOKEN_ADDRESS in longCollateralsMap && wrappedToken) {
      longCollateralsMap[wrappedToken.address] = getTokenData(tokensData, wrappedToken.address);
    }

    if (NATIVE_TOKEN_ADDRESS in shortCollateralsMap && wrappedToken) {
      shortCollateralsMap[wrappedToken.address] = getTokenData(tokensData, wrappedToken.address);
    }

    const availableFromTokens: Token[] = Object.values(longCollateralsMap)
      .concat(Object.values(shortCollateralsMap))
      .filter(Boolean) as Token[];

    const availableToTokens: Token[] = isSwap
      ? [...availableFromTokens]
      : (Object.values(indexTokensMap).filter(Boolean) as Token[]);

    return {
      availableFromTokens,
      availableToTokens,
    };
  }, [chainId, isSwap, marketsData, tokensData]);

  const infoTokens = useMemo(() => adaptToInfoTokens(tokensData), [tokensData]);

  const nativeToken = getTokenData(tokensData, NATIVE_TOKEN_ADDRESS);

  const executionFee = getExecutionFee(tokensData);

  const swapPath = useMemo(() => {
    if (!fromTokenState.tokenAddress || !toTokenState.tokenAddress) return undefined;

    if (isSwap) {
      return getSwapPath(
        marketsData,
        poolsData,
        fromTokenState.tokenAddress,
        toTokenState.tokenAddress,
        toTokenState.tokenAmount
      );
    }

    return getPositionMarketsPath(
      marketsData,
      poolsData,
      fromTokenState.tokenAddress,
      toTokenState.tokenAddress,
      toTokenState.tokenAmount
    );
  }, [
    fromTokenState.tokenAddress,
    isSwap,
    marketsData,
    poolsData,
    toTokenState.tokenAddress,
    toTokenState.tokenAmount,
  ]);

  const submitButtonState = getSubmitButtonState();

  function getSwapTrigerRatio() {
    if (!isSwapTriggerRatioAllowed || !fromTokenState.price || !toTokenState.price) return undefined;

    const isFromGreater = fromTokenState.price.gt(toTokenState.price);

    const ratio = parseValue(swapTriggerRatioValue || "0", USD_DECIMALS);

    let markRatio = isFromGreater
      ? fromTokenState.price.mul(PRECISION).div(toTokenState.price)
      : toTokenState.price.mul(PRECISION).div(fromTokenState.price);

    const text = isFromGreater
      ? `${toTokenState.token?.symbol} per ${fromTokenState.token?.symbol}`
      : `${fromTokenState.token?.symbol} per ${toTokenState.token?.symbol}`;

    return {
      ratio,
      isFromGreater,
      markRatio,
      swapRatioText: text,
    };
  }

  function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
    const error = getSubmitError({
      operationType: operationTab!,
      mode: modeTab!,
      tokensData,
      fromTokenAddress: fromTokenState.tokenAddress,
      toTokenAddress: toTokenState.tokenAddress,
      fromTokenAmount: fromTokenState.tokenAmount,
      swapPath,
    });

    if (error) {
      return {
        text: error,
        disabled: true,
      };
    }

    return {
      text: `${operationTexts[operationTab!]} ${toTokenState.token?.symbol}`,
      onClick: () => setIsConfirming(true),
    };
  }

  function onSwitchTokens() {
    const fromToken = fromTokenState.tokenAddress;
    const toToken = toTokenState.tokenAddress;

    fromTokenState.setTokenAddress(toToken);
    fromTokenState.setInputValue(toTokenState.inputValue || "");

    toTokenState.setTokenAddress(fromToken);
    toTokenState.setInputValue(fromTokenState.inputValue || "");

    setFocusedInput((old) => (old === FocusedInput.From ? FocusedInput.To : FocusedInput.From));
  }

  useEffect(
    // TODO: fees
    function syncInputValuesEff() {
      if (!fromTokenState.token || !toTokenState.token || !toTokenState.price || !fromTokenState.price) return;

      if (focusedInput === FocusedInput.From) {
        const toAmount = getNextTokenAmount({
          fromTokenAmount: fromTokenState.tokenAmount,
          fromTokenPrice: fromTokenState.price,
          fromToken: fromTokenState.token,
          toTokenPrice: toTokenState.price,
          toToken: toTokenState.token,
          triggerPrice,
          shouldInvertTriggerPrice: false,
          swapTriggerRatio: swapRatio?.ratio,
          shouldInvertRatio: swapRatio && !swapRatio.isFromGreater,
          leverageMultiplier,
          shouldInvertLeverage: false,
        });

        toTokenState.setValueByTokenAmount(toAmount);
        return;
      }

      if (focusedInput === FocusedInput.To) {
        const fromAmount = getNextTokenAmount({
          fromTokenAmount: toTokenState.tokenAmount,
          fromTokenPrice: toTokenState.price,
          fromToken: toTokenState.token,
          toTokenPrice: fromTokenState.price,
          toToken: fromTokenState.token,
          triggerPrice,
          shouldInvertTriggerPrice: true,
          swapTriggerRatio: swapRatio?.ratio,
          shouldInvertRatio: swapRatio?.isFromGreater,
          leverageMultiplier,
          shouldInvertLeverage: true,
        });

        fromTokenState.setValueByTokenAmount(fromAmount);
      }
    },
    [
      focusedInput,
      fromTokenState,
      leverageMultiplier,
      swapRatio,
      swapRatio?.isFromGreater,
      swapRatio?.ratio,
      toTokenState,
      triggerPrice,
    ]
  );

  useEffect(
    function initToken() {
      if (!fromTokenState.tokenAddress && nativeToken) {
        fromTokenState.setTokenAddress(nativeToken.address);
      }

      if (!toTokenState.tokenAddress && nativeToken) {
        toTokenState.setTokenAddress(nativeToken.address);
      }
    },
    [fromTokenState, nativeToken, toTokenState]
  );

  useEffect(
    function initMode() {
      if (operationTab && modeTab && !avaialbleModes[operationTab].includes(modeTab)) {
        setModeTab(avaialbleModes[operationTab][0]);
      }
    },
    [modeTab, operationTab, setModeTab]
  );

  return (
    <div className={`App-box SyntheticsSwapBox`}>
      <Tab
        icons={operationIcons}
        options={Object.values(Operation)}
        optionLabels={operationTexts}
        option={operationTab}
        onChange={setOperationTab}
        className="SyntheticsSwapBox-option-tabs"
      />

      <Tab
        options={Object.values(avaialbleModes[operationTab!])}
        optionLabels={modeTexts}
        className="SyntheticsSwapBox-asset-options-tabs"
        type="inline"
        option={modeTab}
        onChange={setModeTab}
      />

      <div className={cx("SyntheticsSwapBox-form-layout")}>
        <BuyInputSection
          topLeftLabel={t`Pay:`}
          topLeftValue={formatUsdAmount(fromTokenState.usdAmount)}
          topRightLabel={t`Balance:`}
          topRightValue={formatTokenAmount(fromTokenState.balance, fromTokenState.token?.decimals)}
          inputValue={fromTokenState.inputValue}
          onInputValueChange={(e) => {
            setFocusedInput(FocusedInput.From);
            fromTokenState.setInputValue(e.target.value);
          }}
          showMaxButton={fromTokenState.shouldShowMaxButton}
          onClickMax={() => {
            setFocusedInput(FocusedInput.From);
            fromTokenState.setValueByTokenAmount(fromTokenState.balance);
          }}
        >
          {fromTokenState.tokenAddress && (
            <TokenSelector
              label={t`Pay`}
              chainId={chainId}
              tokenAddress={fromTokenState.tokenAddress}
              onSelectToken={(token) => fromTokenState.setTokenAddress(token.address)}
              tokens={availableFromTokens}
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

        <BuyInputSection
          topLeftLabel={operationTab === Operation.Swap ? t`Receive:` : `${operationTexts[operationTab!]}:`}
          topLeftValue={formatUsdAmount(sizeDeltaUsd)}
          topRightLabel={operationTab === Operation.Swap ? t`Balance:` : t`Leverage:`}
          topRightValue={
            operationTab === Operation.Swap
              ? formatTokenAmount(toTokenState.balance, toTokenState.token?.decimals)
              : `${leverageOption?.toFixed(2)}x`
          }
          inputValue={toTokenState.inputValue}
          onInputValueChange={(e) => {
            setFocusedInput(FocusedInput.To);
            toTokenState.setInputValue(e.target.value);
          }}
          showMaxButton={false}
        >
          {toTokenState.tokenAddress && (
            <TokenSelector
              label={operationTab === Operation.Swap ? t`Receive:` : operationTexts[operationTab!]}
              chainId={chainId}
              tokenAddress={toTokenState.tokenAddress}
              onSelectToken={(token) => toTokenState.setTokenAddress(token.address)}
              tokens={availableToTokens}
              infoTokens={infoTokens}
              className="GlpSwap-from-token"
              showSymbolImage={true}
              showBalances={operationTab === Operation.Swap}
              showTokenImgInDropdown={true}
            />
          )}
        </BuyInputSection>

        {isTriggerPriceAllowed && (
          <BuyInputSection
            topLeftLabel={t`Price`}
            topRightLabel={t`Mark:`}
            topRightValue={formatUsdAmount(toTokenState.price)}
            onClickTopRightLabel={() => {
              setTriggerPriceValue(formatAmount(toTokenState.price, USD_DECIMALS, 2));
            }}
            inputValue={triggerPriceValue}
            onInputValueChange={(e) => {
              setTriggerPriceValue(e.target.value);
            }}
          >
            USD
          </BuyInputSection>
        )}

        {swapRatio && (
          <BuyInputSection
            topLeftLabel={t`Price`}
            topRightValue={formatAmount(swapRatio.markRatio, USD_DECIMALS, 4)}
            onClickTopRightLabel={() => {
              setSwapTriggerRatioValue(formatAmount(swapRatio.markRatio, USD_DECIMALS, 4));
            }}
            inputValue={swapTriggerRatioValue}
            onInputValueChange={(e) => {
              setSwapTriggerRatioValue(e.target.value);
            }}
          >
            {swapRatio.swapRatioText}
          </BuyInputSection>
        )}
      </div>

      {/* <div className="SyntheticsSwapBox-info-section">
        <InfoRow
          label={<Trans>Fees and price impact</Trans>}
          value={
            <Tooltip
              handle={formatFee(fees)}
              position="right-bottom"
              renderContent={() => (
                <div className="text-white">
                  <StatsTooltipRow
                    label={t`Price impact`}
                    value={formatFee(priceImpact?.impact, priceImpact?.basisPoints)}
                    showDollar={false}
                  />
                  <StatsTooltipRow
                    label={t`Execution fee`}
                    value={formatTokenAmount(executionFee, nativeToken?.decimals, nativeToken?.symbol)}
                    showDollar={false}
                  />
                </div>
              )}
            />
          }
        />
      </div> */}

      {isLeverageAllowed && (
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

      <div className="Exchange-swap-button-container">
        <SubmitButton
          authRequired
          onConnectWallet={p.onConnectWallet}
          onClick={submitButtonState.onClick}
          disabled={submitButtonState.disabled}
        >
          {submitButtonState.text}
        </SubmitButton>
      </div>

      {isConfirming && (
        <SyntheticsSwapConfirmation
          fromTokenAddress={fromTokenState.tokenAddress!}
          fromTokenAmount={fromTokenState.tokenAmount!}
          toTokenAddress={toTokenState.tokenAddress!}
          toTokenAmount={toTokenState.tokenAmount!}
          // priceImpact={priceImpact}
          triggerPrice={triggerPrice}
          acceptablePrice={toTokenState.price!}
          sizeDeltaUsd={sizeDeltaUsd}
          executionFee={executionFee!.feeTokenAmount!}
          executionFeeUsd={executionFee!.feeUsd!}
          executionFeeToken={executionFee!.feeToken!}
          swapPath={swapPath!}
          mode={modeTab!}
          operationType={operationTab!}
          onSubmitted={() => {
            setIsConfirming(false);
            setIsProcessing(true);
          }}
          onClose={() => setIsConfirming(false)}
        />
      )}

      {isProcessing && <SyntheticSwapStatus operationType={operationTab!} onClose={() => setIsProcessing(false)} />}
    </div>
  );
}
