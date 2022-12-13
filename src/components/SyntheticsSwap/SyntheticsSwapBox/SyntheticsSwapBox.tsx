import { t } from "@lingui/macro";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import Tab from "components/Tab/Tab";
import cx from "classnames";
import TokenSelector from "components/TokenSelector/TokenSelector";
import { NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { shouldShowMaxButton, useSwapTokenState } from "domain/synthetics/exchange";
import {
  adaptToInfoTokens,
  formatTokenAmount,
  formatUsdAmount,
  getTokenData,
  getTokensDataArr,
  useWhitelistedTokensData,
} from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { useEffect, useState } from "react";
import { IoMdSwap } from "react-icons/io";

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

export function SyntheticsSwapBox() {
  const { chainId } = useChainId();
  const [operationTab, setOperationTab] = useState(Operation.Long);
  const [modeTab, setModeTab] = useState(Mode.Market);

  const tokensData = useWhitelistedTokensData(chainId);

  const fromTokenState = useSwapTokenState(tokensData);
  const toTokenState = useSwapTokenState(tokensData);

  const nativeToken = getTokenData(tokensData, NATIVE_TOKEN_ADDRESS);

  const tokenSelectorOptionsMap = adaptToInfoTokens(tokensData);

  const availableFromTokens = getTokensDataArr(tokensData);

  useEffect(
    function initToken() {
      if (!fromTokenState.tokenAddress && nativeToken) {
        fromTokenState.setTokenAddress(nativeToken.address);
      }
    },
    [fromTokenState, nativeToken]
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
        options={Object.values(avaialbleModes[operationTab])}
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
              infoTokens={tokenSelectorOptionsMap}
              className="GlpSwap-from-token"
              showSymbolImage={true}
              showTokenImgInDropdown={true}
            />
          )}
        </BuyInputSection>

        {toTokenState.token && (
          <BuyInputSection
            topLeftLabel={operationTexts[operationTab]}
            topRightLabel={t`Balance:`}
            tokenBalance={formatTokenAmount(toTokenState.balance, toTokenState.token?.decimals)}
            inputValue={toTokenState.inputValue}
            onInputValueChange={(e) => {
              toTokenState.setInputValue(e.target.value);
            }}
            onClickMax={() => {
              toTokenState.setValueByTokenAmount(toTokenState.balance);
            }}
            onFocus={toTokenState.onFocus}
            onBlur={toTokenState.onBlur}
            balance={formatUsdAmount(toTokenState.usdAmount)}
          >
            <div className="selected-token">{toTokenState.token.symbol}</div>
          </BuyInputSection>
        )}

        <div className="AppOrder-ball-container" onClick={onSwitchOperation}>
          <div className="AppOrder-ball">
            <IoMdSwap className="Exchange-swap-ball-icon" />
          </div>
        </div>

        <BuyInputSection
          topLeftLabel={operationTab === Operation.withdraw ? t`Pay` : t`Receive`}
          topRightLabel={t`Balance:`}
          tokenBalance={formatTokenAmount(marketTokenState.balance, marketTokenState.token?.decimals)}
          inputValue={marketTokenState.inputValue}
          onInputValueChange={(e) => {
            marketTokenState.setInputValue(e.target.value);
          }}
          showMaxButton={operationTab === Operation.withdraw && shouldShowMaxButton(marketTokenState)}
          onClickMax={() => {
            marketTokenState.setValueByTokenAmount(marketTokenState.balance);
          }}
          onFocus={marketTokenState.onFocus}
          onBlur={marketTokenState.onBlur}
          balance={formatUsdAmount(marketTokenState.usdAmount)}
        >
          <div className="selected-token">GM</div>
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
