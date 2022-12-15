import { t, Trans } from "@lingui/macro";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import Tab from "components/Tab/Tab";
import cx from "classnames";
import TokenSelector from "components/TokenSelector/TokenSelector";
import { getSyntheticsTradeTokens, NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { shouldShowMaxButton, useSwapTokenState } from "domain/synthetics/exchange";
import {
  adaptToInfoTokens,
  formatTokenAmount,
  formatUsdAmount,
  getTokenData,
  getTokensDataArr,
  TokenData,
  useTokensData,
} from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { useEffect, useMemo } from "react";
import { IoMdSwap } from "react-icons/io";

import "./SyntheticsSwapBox.scss";
import Checkbox from "components/Checkbox/Checkbox";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import {
  LEVERAGE_ENABLED_KEY,
  LEVERAGE_OPTION_KEY,
  SYNTHETICS_SWAP_MODE_KEY,
  SYNTHETICS_SWAP_OPERATION_KEY,
} from "config/localStorage";
import { LeverageSlider } from "components/LeverageSlider/LeverageSlider";
import { getMarkets, useMarketsData } from "domain/synthetics/markets";
import { Token } from "domain/tokens";

enum Operation {
  Long = "Long",
  Short = "Short",
  Swap = "Swap",
}

enum Mode {
  Market = "Market",
  Limit = "Limit",
  Trigger = "Trigger",
}

const operationTexts = {
  [Operation.Long]: t`Long`,
  [Operation.Short]: t`Short`,
  [Operation.Swap]: t`Swap`,
};

const modeTexts = {
  [Mode.Market]: t`Market`,
  [Mode.Limit]: t`Limit`,
  [Mode.Trigger]: t`Trigger`,
};

const avaialbleModes = {
  [Operation.Long]: [Mode.Market, Mode.Limit, Mode.Trigger],
  [Operation.Short]: [Mode.Market, Mode.Limit, Mode.Trigger],
  [Operation.Swap]: [Mode.Market],
};

type Props = {
  onConnectWallet: () => void;
};

export function SyntheticsSwapBox(p: Props) {
  const { chainId } = useChainId();

  const [operationTab, setOperationTab] = useLocalStorageSerializeKey(
    [chainId, SYNTHETICS_SWAP_OPERATION_KEY],
    Operation.Long
  );

  const [modeTab, setModeTab] = useLocalStorageSerializeKey([chainId, SYNTHETICS_SWAP_MODE_KEY], Mode.Market);

  const [leverageOption, setLeverageOption] = useLocalStorageSerializeKey<number | undefined>(
    [chainId, LEVERAGE_OPTION_KEY],
    2
  );

  const [isLeverageEnabled, setIsLeverageEnabled] = useLocalStorageSerializeKey([chainId, LEVERAGE_ENABLED_KEY], true);

  const isLeverageAllowed = [Operation.Long, Operation.Short].includes(operationTab!);

  const isLong = operationTab === Operation.Long;
  const isShort = operationTab === Operation.Short;
  const isSwap = operationTab === Operation.Swap;

  const isMarket = modeTab === Mode.Market;
  const isLimit = modeTab === Mode.Limit;
  const isTrigger = modeTab === Mode.Trigger;

  const marketsData = useMarketsData(chainId);

  const tradeTokensAddresses = useMemo(() => {
    const markets = getMarkets(marketsData);

    const tradeTokens = getSyntheticsTradeTokens(chainId).filter((token) => {
      return markets.some((market) =>
        [market.longTokenAddress, market.shortTokenAddress, market.indexTokenAddress].includes(token.address)
      );
    });

    return tradeTokens.map((token) => token.address);
  }, [chainId, marketsData]);

  // todo whitelisted synthetics tokens
  const tokensData = useTokensData(chainId, { tokenAddresses: tradeTokensAddresses });

  const fromTokenState = useSwapTokenState(tokensData);
  const toTokenState = useSwapTokenState(tokensData);

  const { longCollaterals, shortCollaterals, indexTokens, availableFromTokens, availableToTokens } = useMemo(() => {
    const longCollaterals: { [key: string]: TokenData | undefined } = {};
    const shortCollaterals: { [key: string]: TokenData | undefined } = {};
    const indexTokens: { [key: string]: TokenData | undefined } = {};

    const markets = getMarkets(marketsData);

    for (const market of markets) {
      longCollaterals[market.longTokenAddress] = getTokenData(tokensData, market.longTokenAddress);
      shortCollaterals[market.shortTokenAddress] = getTokenData(tokensData, market.longTokenAddress);
      indexTokens[market.indexTokenAddress] = getTokenData(tokensData, market.indexTokenAddress);
    }

    const availableFromTokens: Token[] = Object.values(longCollaterals)
      .concat(Object.values(shortCollaterals))
      .filter(Boolean) as Token[];

    const availableToTokens: Token[] = isSwap
      ? [...availableFromTokens]
      : (Object.values(indexTokens).filter(Boolean) as Token[]);

    return {
      longCollaterals,
      shortCollaterals,
      indexTokens,
      availableFromTokens,
      availableToTokens,
    };
  }, [isSwap, marketsData, tokensData]);

  const infoTokens = useMemo(() => adaptToInfoTokens(tokensData), [tokensData]);

  const nativeToken = getTokenData(tokensData, NATIVE_TOKEN_ADDRESS);

  const submitButtonState: { text: string; disabled?: boolean; onClick?: () => void } = useMemo(() => {
    if (!fromTokenState.usdAmount.gt(0)) {
      return {
        text: t`Enter an amount`,
        disabled: true,
      };
    }

    return {
      text: `${operationTexts[operationTab!]} ${toTokenState.token?.symbol}`,
      onClick: () => null,
    };
  }, [fromTokenState.usdAmount, operationTab, toTokenState.token?.symbol]);

  function onSwitchTokens() {
    const fromToken = fromTokenState.tokenAddress;
    const toToken = toTokenState.tokenAddress;

    fromTokenState.setTokenAddress(toToken);
    toTokenState.setTokenAddress(fromToken);
  }

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
        options={Object.values(Operation)}
        optionLabels={operationTexts}
        option={operationTab}
        onChange={setOperationTab}
        className="Exchange-swap-option-tabs"
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
          topLeftLabel={t`Pay`}
          topRightLabel={t`Balance:`}
          tokenBalance={formatTokenAmount(fromTokenState.balance, fromTokenState.token?.decimals)}
          inputValue={fromTokenState.inputValue}
          onInputValueChange={(e) => {
            fromTokenState.setInputValue(e.target.value);
          }}
          showMaxButton={shouldShowMaxButton(fromTokenState)}
          onClickMax={() => {
            fromTokenState.setValueByTokenAmount(fromTokenState.balance);
          }}
          onFocus={fromTokenState.onFocus}
          onBlur={fromTokenState.onBlur}
          balance={formatUsdAmount(fromTokenState.usdAmount)}
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
          topLeftLabel={operationTab === Operation.Swap ? t`Receive:` : operationTexts[operationTab!]}
          topRightLabel={operationTab === Operation.Swap ? t`Balance:` : t`Leverage:`}
          tokenBalance={formatTokenAmount(toTokenState.balance, toTokenState.token?.decimals)}
          inputValue={toTokenState.inputValue}
          onInputValueChange={(e) => {
            toTokenState.setInputValue(e.target.value);
          }}
          showMaxButton={false}
          onFocus={toTokenState.onFocus}
          onBlur={toTokenState.onBlur}
          balance={formatUsdAmount(toTokenState.usdAmount)}
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

      {/* {isConfirming && (
        <MarketPoolSwapConfirmation
          longDelta={longDelta}
          shortDelta={shortDelta}
          marketTokenAmount={marketTokenState.tokenAmount}
          marketTokenAddress={p.selectedMarketAddress!}
          onClose={() => setIsConfirming(false)}
          tokensData={tokensData}
          priceImpact={priceImpact}
          fees={fees}
          executionFee={executionFee}
          operationType={operationTab}
          onSubmitted={() => setIsConfirming(false)}
        />
      )} */}
    </div>
  );
}
