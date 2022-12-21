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
import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { useTokenInputState } from "domain/synthetics/exchange";
import { getExecutionFee } from "domain/synthetics/fees";
import {
  convertToUsdByPrice,
  formatTokenAmount,
  formatUsdAmount,
  getTokenData,
  useAvailableTradeTokensData,
} from "domain/synthetics/tokens";
import { BigNumber } from "ethers";

import { useChainId } from "lib/chains";
import { BASIS_POINTS_DIVISOR, USD_DECIMALS } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { bigNumberify, formatAmount, parseValue } from "lib/numbers";
import { useEffect, useState } from "react";
import { IoMdSwap } from "react-icons/io";
import { SyntheticsSwapConfirmation } from "../SyntheticsSwapConfirmation/SyntheticsSwapConfirmation";
import { SyntheticSwapStatus } from "../SyntheticsSwapStatus/SyntheticsSwapStatus";
import {
  avaialbleModes,
  getNextTokenAmount,
  getSubmitError,
  Mode,
  modeTexts,
  Operation,
  operationIcons,
  operationTexts,
  useAvailableSwapTokens,
  useSwapTriggerRatioState,
} from "../utils";

import "./SyntheticsSwapBox.scss";
import { useSwapRoute } from "domain/synthetics/exchange/useSwapPath";

enum FocusedInput {
  From = "From",
  To = "To",
}

type Props = {
  onConnectWallet: () => void;
};

export function SyntheticsSwapBox(p: Props) {
  const { chainId } = useChainId();

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
  const isPosition = !isSwap;
  const isLimit = modeTab === Mode.Limit;

  const isTriggerPriceAllowed = !isSwap && isLimit;
  const isSwapTriggerRatioAllowed = isSwap && isLimit;
  const isLeverageAllowed = isLong || isShort;

  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fromTokenState = useTokenInputState(tokensData);
  const toTokenState = useTokenInputState(tokensData, { useMaxPrice: true });

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

  const swapRatio = useSwapTriggerRatioState({
    isAllowed: isSwapTriggerRatioAllowed,
    fromTokenPrice: fromTokenState.price,
    toTokenPrice: toTokenState.price,
  });

  const swapRoute = useSwapRoute({
    isSwap,
    fromToken: fromTokenState.token?.address,
    toToken: toTokenState.token?.address,
    indexToken: isPosition ? toTokenState.token?.address : undefined,
    amount: fromTokenState.tokenAmount,
  });

  const { availableFromTokens, availableToTokens, infoTokens } = useAvailableSwapTokens({
    isSwap,
    fromTokenAddress: fromTokenState.tokenAddress,
  });

  const nativeToken = getTokenData(tokensData, NATIVE_TOKEN_ADDRESS);

  const executionFee = getExecutionFee(tokensData);

  const submitButtonState = getSubmitButtonState();

  function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
    const error = getSubmitError({
      operationType: operationTab!,
      mode: modeTab!,
      tokensData,
      fromTokenAddress: fromTokenState.tokenAddress,
      toTokenAddress: toTokenState.tokenAddress,
      fromTokenAmount: fromTokenState.tokenAmount,
      swapPath: swapRoute?.swapPath,
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
        // Set toToken value
        const toAmount = getNextTokenAmount({
          fromToken: fromTokenState.token,
          fromTokenAmount: fromTokenState.tokenAmount,
          fromTokenPrice: fromTokenState.price,
          toToken: toTokenState.token,
          toTokenPrice: toTokenState.price,
          triggerPrice,
          shouldInvertTriggerPrice: false,
          swapTriggerRatio: swapRatio?.ratio,
          shouldInvertRatio: swapRatio?.biggestSide === "to",
          leverageMultiplier,
          shouldInvertLeverage: false,
        });

        toTokenState.setValueByTokenAmount(toAmount);
        return;
      }

      if (focusedInput === FocusedInput.To) {
        // Set fromToken value
        const fromAmount = getNextTokenAmount({
          fromToken: toTokenState.token,
          fromTokenAmount: toTokenState.tokenAmount,
          fromTokenPrice: toTokenState.price,
          toToken: fromTokenState.token,
          toTokenPrice: fromTokenState.price,
          triggerPrice,
          shouldInvertTriggerPrice: true,
          swapTriggerRatio: swapRatio?.ratio,
          shouldInvertRatio: swapRatio?.biggestSide === "from",
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
      swapRatio?.biggestSide,
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
              swapRatio.setInputValue(formatAmount(swapRatio.markRatio, USD_DECIMALS, 4));
            }}
            inputValue={swapRatio.inputValue}
            onInputValueChange={(e) => {
              swapRatio.setInputValue(e.target.value);
            }}
          >
            {swapRatio.biggestSide === "from"
              ? `${toTokenState.token?.symbol} per ${fromTokenState.token?.symbol}`
              : `${fromTokenState.token?.symbol} per ${toTokenState.token?.symbol}`}
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
          fromTokenAmount={fromTokenState.tokenAmount}
          toTokenAddress={toTokenState.tokenAddress!}
          toTokenAmount={toTokenState.tokenAmount}
          // priceImpact={priceImpact}
          triggerPrice={triggerPrice}
          acceptablePrice={toTokenState.price!}
          sizeDeltaUsd={sizeDeltaUsd}
          executionFee={executionFee?.feeTokenAmount}
          executionFeeUsd={executionFee?.feeUsd}
          executionFeeToken={executionFee?.feeToken}
          swapRoute={swapRoute}
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
