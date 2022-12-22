import { Trans, t } from "@lingui/macro";
import cx from "classnames";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Checkbox from "components/Checkbox/Checkbox";
import { InfoRow } from "components/InfoRow/InfoRow";
import { LeverageSlider } from "components/LeverageSlider/LeverageSlider";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import Tab from "components/Tab/Tab";
import TokenSelector from "components/TokenSelector/TokenSelector";
import {
  LEVERAGE_ENABLED_KEY,
  LEVERAGE_OPTION_KEY,
  SYNTHETICS_SWAP_COLLATERAL_KEY,
  SYNTHETICS_SWAP_FROM_TOKEN_KEY,
  SYNTHETICS_SWAP_MODE_KEY,
  SYNTHETICS_SWAP_OPERATION_KEY,
  SYNTHETICS_SWAP_TO_TOKEN_KEY,
} from "config/localStorage";
import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { useTokenInputState } from "domain/synthetics/exchange";
import { useSwapPath } from "domain/synthetics/exchange/useSwapPath";
import {
  convertToUsdByPrice,
  formatTokenAmount,
  formatUsdAmount,
  getTokenData,
  useAvailableTradeTokensData,
} from "domain/synthetics/tokens";
import { BigNumber } from "ethers";

import { useChainId } from "lib/chains";
import { BASIS_POINTS_DIVISOR, USD_DECIMALS, getLiquidationPrice } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { bigNumberify, formatAmount, parseValue } from "lib/numbers";
import { useEffect, useState } from "react";
import { IoMdSwap } from "react-icons/io";
import { SyntheticsSwapConfirmation } from "../SyntheticsSwapConfirmation/SyntheticsSwapConfirmation";
import { SyntheticSwapStatus } from "../SyntheticsSwapStatus/SyntheticsSwapStatus";
import {
  Mode,
  Operation,
  avaialbleModes,
  getNextTokenAmount,
  getSubmitError,
  modeTexts,
  operationIcons,
  operationTexts,
  useAvailableSwapTokens,
  useFeesState,
  useSwapTriggerRatioState,
} from "../utils";

import { MarketCard } from "../MarketCard/MarketCard";
import { SyntheticsSwapFees } from "../SyntheticsSwapFees/SyntheticsSwapFees";

import "./SyntheticsSwapBox.scss";

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
  const isSelectCollateralAllowed = isPosition;

  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const nativeToken = getTokenData(tokensData, NATIVE_TOKEN_ADDRESS);

  const [savedFromToken, setSavedFromToken] = useLocalStorageSerializeKey<string | undefined>(
    [chainId, SYNTHETICS_SWAP_FROM_TOKEN_KEY],
    undefined
  );

  const [savedToToken, setSavedToToken] = useLocalStorageSerializeKey<string | undefined>(
    [chainId, SYNTHETICS_SWAP_TO_TOKEN_KEY],
    undefined
  );

  const fromTokenState = useTokenInputState(tokensData, { initialTokenAddress: savedFromToken });
  const toTokenState = useTokenInputState(tokensData, { useMaxPrice: true, initialTokenAddress: savedToToken });

  const [collateralTokenAddress, setCollateralTokenAddress] = useLocalStorageSerializeKey<string | undefined>(
    [chainId, SYNTHETICS_SWAP_COLLATERAL_KEY],
    undefined
  );

  const { availableFromTokens, availableToTokens, availableCollaterals, infoTokens } = useAvailableSwapTokens({
    isSwap,
    indexTokenAddress: isPosition ? toTokenState.tokenAddress : undefined,
  });

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

  const entryPrice = triggerPrice?.gt(0) ? triggerPrice : toTokenState.price;

  const sizeDeltaUsd =
    toTokenState.token && entryPrice
      ? convertToUsdByPrice(toTokenState.tokenAmount, toTokenState.token?.decimals, entryPrice)
      : BigNumber.from(0);

  const swapRatio = useSwapTriggerRatioState({
    isAllowed: isSwapTriggerRatioAllowed,
    fromTokenPrice: fromTokenState.price,
    toTokenPrice: toTokenState.price,
  });

  const swapRoute = useSwapPath({
    isSwap,
    fromToken: fromTokenState.tokenAddress,
    toToken: isSwap ? toTokenState.tokenAddress : undefined,
    collateralToken: isPosition ? collateralTokenAddress : undefined,
    indexToken: isPosition ? toTokenState.tokenAddress : undefined,
    amountUsd: isPosition ? fromTokenState.usdAmount : toTokenState.usdAmount,
  });

  const fees = useFeesState({
    isSwap,
    isLong,
    marketAddress: swapRoute?.market,
    sizeDeltaUsd,
    swapPath: swapRoute?.fullSwapPath,
    swapFeeUsd: swapRoute?.swapFeesUsd,
  });

  const liqPrice = getLiqPrice();

  const submitButtonState = getSubmitButtonState();

  function getLiqPrice() {
    if (!isPosition || !collateralTokenAddress) return undefined;

    // TODO: for exisiting position
    return getLiquidationPrice({
      isLong,
      size: BigNumber.from(0),
      collateral: BigNumber.from(0),
      averagePrice: entryPrice,
      entryFundingRate: BigNumber.from(0),
      cumulativeFundingRate: BigNumber.from(0),
      sizeDelta: sizeDeltaUsd,
      collateralDelta: fromTokenState.usdAmount,
      increaseCollateral: true,
      increaseSize: true,
    });
  }

  function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
    const error = getSubmitError({
      operationType: operationTab!,
      mode: modeTab!,
      tokensData,
      fromTokenAddress: fromTokenState.tokenAddress,
      toTokenAddress: toTokenState.tokenAddress,
      fromTokenAmount: fromTokenState.tokenAmount,
      swapPath: swapRoute?.swapPath,
      isHighPriceImpact: fees.isHighPriceImpact,
      isHighPriceImpactAccepted: fees.isHighPriceImpactAccepted,
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
          isInvertedTriggerPrice: false,
          swapTriggerRatio: swapRatio?.ratio,
          isInvertedTriggerRatio: swapRatio?.biggestSide === "to",
          leverageMultiplier,
          isInvertedLeverage: false,
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
          isInvertedTriggerPrice: true,
          swapTriggerRatio: swapRatio?.ratio,
          isInvertedTriggerRatio: swapRatio?.biggestSide === "from",
          leverageMultiplier,
          isInvertedLeverage: true,
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
    function updateMode() {
      if (operationTab && modeTab && !avaialbleModes[operationTab].includes(modeTab)) {
        setModeTab(avaialbleModes[operationTab][0]);
      }
    },
    [modeTab, operationTab, setModeTab]
  );

  useEffect(
    function updateTokenInputs() {
      if (fromTokenState.tokenAddress !== savedFromToken) {
        setSavedFromToken(fromTokenState.tokenAddress);
      }

      if (toTokenState.tokenAddress !== savedToToken) {
        setSavedToToken(toTokenState.tokenAddress);
      }

      if (
        availableFromTokens.length &&
        !availableFromTokens.find((token) => token.address === fromTokenState.tokenAddress)
      ) {
        fromTokenState.setTokenAddress(availableFromTokens[0].address);
      }

      if (availableToTokens.length && !availableToTokens.find((token) => token.address === toTokenState.tokenAddress)) {
        toTokenState.setTokenAddress(availableToTokens[0].address);
      }
    },
    [
      availableFromTokens,
      availableToTokens,
      fromTokenState,
      nativeToken,
      savedFromToken,
      savedToToken,
      setSavedFromToken,
      setSavedToToken,
      toTokenState,
    ]
  );

  useEffect(
    function updateCollateral() {
      if (!isSelectCollateralAllowed || !availableCollaterals?.length) return;

      if (!collateralTokenAddress || !availableCollaterals.find((token) => token.address === collateralTokenAddress)) {
        setCollateralTokenAddress(availableCollaterals[0].address);
      }
    },
    [availableCollaterals, collateralTokenAddress, isSelectCollateralAllowed, setCollateralTokenAddress]
  );

  return (
    <>
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
                swapRatio.setInputValue(formatAmount(swapRatio.markRatio, USD_DECIMALS, 10));
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

        <div className="SyntheticsSwapBox-info-section">
          {isSelectCollateralAllowed && collateralTokenAddress && availableCollaterals && (
            <InfoRow
              label={t`Collateral In`}
              className="SyntheticsSwapBox-info-row"
              value={
                <TokenSelector
                  label={t`Collateral In`}
                  className="GlpSwap-from-token"
                  chainId={chainId}
                  tokenAddress={collateralTokenAddress}
                  onSelectToken={(token) => setCollateralTokenAddress(token.address)}
                  tokens={availableCollaterals}
                  showTokenImgInDropdown={true}
                />
              }
            />
          )}
          {isLeverageAllowed && (
            <InfoRow
              className="SyntheticsSwapBox-info-row"
              label={t`Leverage`}
              value={leverageOption ? `${leverageOption.toFixed(2)}x` : "..."}
            />
          )}
          {isPosition && (
            <InfoRow
              className="SyntheticsSwapBox-info-row"
              label={t`Entry Price`}
              value={entryPrice ? formatUsdAmount(entryPrice) : "..."}
            />
          )}
          {isPosition && (
            <InfoRow
              className="SyntheticsSwapBox-info-row"
              label={t`Liq. Price`}
              value={liqPrice ? formatUsdAmount(liqPrice) : "..."}
            />
          )}
          <SyntheticsSwapFees fees={fees} />
        </div>

        {fees.isHighPriceImpact && fees.setIsHighPriceImpactAccepted && (
          <div className="SyntheticsSwapBox-warnings">
            <Checkbox asRow isChecked={fees.isHighPriceImpactAccepted} setIsChecked={fees.setIsHighPriceImpactAccepted}>
              <span className="muted font-sm">
                <Trans>I am aware of the high price impact</Trans>
              </span>
            </Checkbox>
          </div>
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
      </div>

      <div className="SyntheticsSwapBox-section">
        <MarketCard
          isLong={isLong}
          isSwap={isSwap}
          marketAddress={swapRoute?.market}
          swapPath={swapRoute?.swapPath}
          fromTokenAddress={fromTokenState.tokenAddress}
          toTokenAddress={isPosition ? collateralTokenAddress : toTokenState.tokenAddress}
          indexTokenAddress={toTokenState.tokenAddress}
        />
      </div>

      {isConfirming && (
        <SyntheticsSwapConfirmation
          fromTokenAddress={fromTokenState.tokenAddress!}
          fromTokenAmount={fromTokenState.tokenAmount}
          fromTokenPrice={fromTokenState.price}
          toTokenAddress={toTokenState.tokenAddress!}
          toTokenAmount={toTokenState.tokenAmount}
          toTokenPrice={toTokenState.price}
          collateralTokenAddress={collateralTokenAddress}
          triggerPrice={triggerPrice}
          entryPrice={entryPrice}
          liqPrice={liqPrice}
          swapTriggerRatio={swapRatio?.ratio}
          leverage={leverageOption}
          acceptablePrice={toTokenState.price!}
          sizeDeltaUsd={sizeDeltaUsd}
          fees={fees}
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

      {isProcessing && (
        <SyntheticSwapStatus
          isLong={isLong}
          isSwap={isSwap}
          fromToken={fromTokenState.tokenAddress}
          toToken={toTokenState.tokenAddress}
          onClose={() => setIsProcessing(false)}
        />
      )}
    </>
  );
}
