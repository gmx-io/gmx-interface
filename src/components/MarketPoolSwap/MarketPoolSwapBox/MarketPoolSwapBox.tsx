import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Tab from "components/Tab/Tab";
import { getToken, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { Market, MarketPoolType } from "domain/synthetics/markets/types";
import { useChainId } from "lib/chains";
import { useEffect, useMemo, useState } from "react";

import { getSubmitError, Mode, modeTexts, Operation, operationTexts, PoolDelta } from "../utils";
import { MarketDropdown } from "../MarketDropdown/MarketDropdown";

import { SubmitButton } from "components/SubmitButton/SubmitButton";
import TokenSelector from "components/TokenSelector/TokenSelector";
import { getMarket, getMarketPoolData, getTokenPoolType } from "domain/synthetics/markets/utils";
import { adaptToInfoTokens, formatTokenAmount, formatUsdAmount, getUsdFromTokenAmount } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { IoMdSwap } from "react-icons/io";

import { useTokenInputState } from "domain/synthetics/exchange";
import { usePriceImpactConfigs } from "domain/synthetics/fees/usePriceImpactConfigs";
import { getExecutionFee, getPriceImpact } from "domain/synthetics/fees/utils";
import { useMarketsData, useMarketsPoolsData, useMarketTokensData } from "domain/synthetics/markets";
import { MarketPoolSwapConfirmation } from "../MarketPoolSwapConfirmation/MarketPoolSwapConfirmation";

import Checkbox from "components/Checkbox/Checkbox";
import { MarketPoolFees } from "components/MarketPoolFees/MarketPoolFees";
import { HIGH_PRICE_IMPACT_BP } from "config/synthetics";
import { useAvailableTradeTokensData } from "domain/synthetics/tokens";

import "./MarketPoolSwapBox.scss";
import { MarketPoolSwapStatus } from "../MarketPoolSwapStatus/MarketPoolSwapStatus";

type Props = {
  selectedMarketAddress?: string;
  markets: Market[];
  onSelectMarket: (marketAddress: string) => void;
  onConnectWallet: () => void;
};

enum FocusedInput {
  firstToken = "firstToken",
  secondToken = "secondToken",
  marketToken = "marketToken",
}

export function MarketPoolSwapBox(p: Props) {
  const { chainId } = useChainId();

  const [operationTab, setOperationTab] = useState(Operation.deposit);
  const [modeTab, setModeTab] = useState(Mode.single);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isHighPriceImpactAccepted, setIsHighPriceImpactAccepted] = useState(false);

  const tokensData = useAvailableTradeTokensData(chainId);
  const marketsData = useMarketsData(chainId);
  const marketTokensData = useMarketTokensData(chainId);
  const marketPoolsData = useMarketsPoolsData(chainId);
  const priceImpactConfigsData = usePriceImpactConfigs(chainId);

  const market = getMarket(marketsData, p.selectedMarketAddress);

  const availableTokens = useMemo(() => {
    if (!market) return [];

    const availableAddresses = [market.longTokenAddress, market.shortTokenAddress];

    if (availableAddresses.includes(NATIVE_TOKEN_ADDRESS)) {
      const wrappedToken = getWrappedToken(chainId);
      availableAddresses.push(wrappedToken.address);
    }

    return availableAddresses.map((address) => getToken(chainId, address));
  }, [chainId, market]);

  const firstTokenState = useTokenInputState(tokensData, { useMaxPrice: operationTab === Operation.withdraw });
  const secondTokenState = useTokenInputState(tokensData, { useMaxPrice: operationTab === Operation.withdraw });

  const marketTokenState = useTokenInputState(marketTokensData, { useMaxPrice: operationTab === Operation.deposit });

  const [focusedInput, setFocusedInput] = useState<FocusedInput>();

  const longDelta = getDeltaByPoolType(MarketPoolType.Long);
  const shortDelta = getDeltaByPoolType(MarketPoolType.Short);

  const marketPools = getMarketPoolData(marketPoolsData, market?.marketTokenAddress);

  const currentLongUsd = getUsdFromTokenAmount(tokensData, market?.longTokenAddress, marketPools?.longPoolAmount, true);
  const currentShortUsd = getUsdFromTokenAmount(
    tokensData,
    market?.shortTokenAddress,
    marketPools?.shortPoolAmount,
    true
  );

  const priceImpact = getPriceImpact(
    priceImpactConfigsData,
    market?.marketTokenAddress,
    currentLongUsd,
    currentShortUsd,
    longDelta?.usdDelta,
    shortDelta?.usdDelta
  );

  const isHighPriceImpact = priceImpact?.impact.lt(0) && priceImpact?.basisPoints.gte(HIGH_PRICE_IMPACT_BP);

  const executionFee = getExecutionFee(tokensData);

  const feesUsd = BigNumber.from(0)
    .sub(executionFee?.feeUsd || BigNumber.from(0))
    .add(priceImpact?.impact || BigNumber.from(0));

  const tokenSelectorOptionsMap = useMemo(() => adaptToInfoTokens(tokensData), [tokensData]);

  const submitButtonState = getSubmitButtonState();

  function getDeltaByPoolType(poolType: MarketPoolType): PoolDelta | undefined {
    if (!market) return undefined;

    const poolTokenState = [firstTokenState, secondTokenState].find((tokenState) => {
      const tokenPool = getTokenPoolType(marketsData, tokensData, market.marketTokenAddress, tokenState.tokenAddress);

      return tokenPool === poolType;
    });

    if (!poolTokenState?.tokenAddress || !poolTokenState?.token) return undefined;

    return {
      tokenAddress: poolTokenState.tokenAddress,
      poolType,
      token: poolTokenState.token,
      tokenAmount: poolTokenState.tokenAmount,
      usdAmount: poolTokenState.usdAmount,
      // prettier-ignore
      usdDelta: operationTab === Operation.deposit 
        ? poolTokenState.usdAmount 
        : BigNumber.from(0).sub(poolTokenState.usdAmount),
    };
  }

  function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
    const error = getSubmitError({
      operation: operationTab,
      tokensData,
      marketTokensData,
      poolsData: marketPoolsData,
      market,
      marketTokenAmount: marketTokenState.tokenAmount,
      longDelta,
      shortDelta,
      isHighPriceImpact,
      isHighPriceImpactAccepted,
    });

    if (error) {
      return {
        text: error,
        disabled: true,
      };
    }

    return {
      text: operationTab === Operation.deposit ? t`Buy GM` : t`Sell GM`,
      onClick: onSubmit,
    };
  }

  function onSwitchOperation() {
    setOperationTab((prev) => (prev === Operation.deposit ? Operation.withdraw : Operation.deposit));
  }

  function onSubmit() {
    setIsConfirming(true);
  }

  useEffect(
    function updateInputsByMarket() {
      if (p.selectedMarketAddress !== marketTokenState.tokenAddress) {
        marketTokenState.setTokenAddress(p.selectedMarketAddress);
      }

      if (!availableTokens.length) return;

      if (
        !firstTokenState.tokenAddress ||
        !availableTokens.find((token) => token.address === firstTokenState.tokenAddress)
      ) {
        firstTokenState.setTokenAddress(availableTokens[0].address);
      }

      if (
        secondTokenState.tokenAddress &&
        !availableTokens.find((token) => token.address === secondTokenState.tokenAddress)
      ) {
        const secondToken = availableTokens.find((token) => token.address !== firstTokenState.tokenAddress);
        if (secondToken) {
          secondTokenState.setTokenAddress(secondToken.address);
        }
      }
    },
    [availableTokens, firstTokenState, marketTokenState, p.selectedMarketAddress, secondTokenState]
  );

  useEffect(
    function updateInputsByMode() {
      if (modeTab === Mode.pair && !secondTokenState.tokenAddress) {
        const secondToken = availableTokens.filter((token) => token.address !== firstTokenState.tokenAddress)[0];

        if (secondToken) {
          secondTokenState.setTokenAddress(secondToken.address);
        }
      } else if (modeTab === Mode.single && secondTokenState.tokenAddress) {
        secondTokenState.setTokenAddress(undefined);
      }
    },
    [firstTokenState.tokenAddress, availableTokens, modeTab, secondTokenState]
  );

  useEffect(
    function syncInputValues() {
      if (!focusedInput) return;

      if ([FocusedInput.firstToken, FocusedInput.secondToken].includes(focusedInput)) {
        const swapSumUsd = firstTokenState.usdAmount.add(secondTokenState.usdAmount);

        marketTokenState.setValueByUsdAmount(swapSumUsd);

        return;
      }

      if (focusedInput === FocusedInput.marketToken) {
        if (modeTab === Mode.single && firstTokenState.tokenAddress) {
          firstTokenState.setValueByUsdAmount(marketTokenState.usdAmount);

          return;
        }

        if (modeTab === Mode.pair && firstTokenState.tokenAddress && secondTokenState.tokenAddress) {
          const previousSum = firstTokenState.usdAmount.add(secondTokenState.usdAmount);

          const firstTokenUsd = firstTokenState.usdAmount
            .mul(marketTokenState.usdAmount)
            .div(previousSum.gt(0) ? previousSum : 1);

          const secondTokenUsd = marketTokenState.usdAmount.sub(firstTokenUsd);

          firstTokenState.setValueByUsdAmount(firstTokenUsd);
          secondTokenState.setValueByUsdAmount(secondTokenUsd);

          return;
        }
      }
    },
    [firstTokenState, secondTokenState, marketTokenState, modeTab, focusedInput]
  );

  return (
    <div className={`App-box MarketPoolSwapBox`}>
      <div className="MarketPoolSwapBox-market-dropdown">
        <MarketDropdown selectedMarketKey={p.selectedMarketAddress} markets={p.markets} onSelect={p.onSelectMarket} />
      </div>

      <Tab
        options={Object.values(Operation)}
        optionLabels={operationTexts}
        option={operationTab}
        onChange={setOperationTab}
        className="Exchange-swap-option-tabs"
      />

      <Tab
        options={Object.values(Mode)}
        optionLabels={modeTexts}
        className="MarketPoolSwapBox-asset-options-tabs"
        type="inline"
        option={modeTab}
        onChange={setModeTab}
      />

      <div className={cx("MarketPoolSwapBox-form-layout", { reverse: operationTab === Operation.withdraw })}>
        <BuyInputSection
          topLeftLabel={operationTab === Operation.deposit ? t`Pay:` : t`Receive:`}
          topLeftValue={formatUsdAmount(firstTokenState.usdAmount)}
          topRightLabel={t`Balance:`}
          topRightValue={formatTokenAmount(firstTokenState.balance, firstTokenState.token?.decimals)}
          inputValue={firstTokenState.inputValue}
          onInputValueChange={(e) => {
            setFocusedInput(FocusedInput.firstToken);
            firstTokenState.setInputValue(e.target.value);
          }}
          showMaxButton={operationTab === Operation.deposit && firstTokenState.shouldShowMaxButton}
          onClickMax={() => {
            setFocusedInput(FocusedInput.firstToken);
            firstTokenState.setValueByTokenAmount(firstTokenState.balance);
          }}
        >
          {firstTokenState.tokenAddress && modeTab === Mode.single ? (
            <TokenSelector
              label={t`Pay`}
              chainId={chainId}
              tokenAddress={firstTokenState.tokenAddress}
              onSelectToken={(token) => firstTokenState.setTokenAddress(token.address)}
              tokens={availableTokens}
              infoTokens={tokenSelectorOptionsMap}
              className="GlpSwap-from-token"
              showSymbolImage={true}
              showTokenImgInDropdown={true}
            />
          ) : (
            <div className="selected-token">{firstTokenState.token?.symbol}</div>
          )}
        </BuyInputSection>

        {secondTokenState.token && (
          <BuyInputSection
            topLeftLabel={operationTab === Operation.deposit ? t`Pay:` : t`Receive:`}
            topLeftValue={formatUsdAmount(secondTokenState.usdAmount)}
            topRightLabel={t`Balance:`}
            topRightValue={formatTokenAmount(secondTokenState.balance, secondTokenState.token?.decimals)}
            inputValue={secondTokenState.inputValue}
            onInputValueChange={(e) => {
              setFocusedInput(FocusedInput.secondToken);
              secondTokenState.setInputValue(e.target.value);
            }}
            showMaxButton={operationTab === Operation.deposit && secondTokenState.shouldShowMaxButton}
            onClickMax={() => {
              setFocusedInput(FocusedInput.secondToken);
              secondTokenState.setValueByTokenAmount(secondTokenState.balance);
            }}
          >
            <div className="selected-token">{secondTokenState.token.symbol}</div>
          </BuyInputSection>
        )}

        <div className="AppOrder-ball-container" onClick={onSwitchOperation}>
          <div className="AppOrder-ball">
            <IoMdSwap className="Exchange-swap-ball-icon" />
          </div>
        </div>

        <BuyInputSection
          topLeftLabel={operationTab === Operation.withdraw ? t`Pay:` : t`Receive:`}
          topLeftValue={formatUsdAmount(marketTokenState.usdAmount)}
          topRightLabel={t`Balance:`}
          topRightValue={formatTokenAmount(marketTokenState.balance, marketTokenState.token?.decimals)}
          inputValue={marketTokenState.inputValue}
          onInputValueChange={(e) => {
            setFocusedInput(FocusedInput.marketToken);
            marketTokenState.setInputValue(e.target.value);
          }}
          showMaxButton={operationTab === Operation.withdraw && marketTokenState.shouldShowMaxButton}
          onClickMax={() => {
            setFocusedInput(FocusedInput.marketToken);
            marketTokenState.setValueByTokenAmount(marketTokenState.balance);
          }}
        >
          <div className="selected-token">GM</div>
        </BuyInputSection>
      </div>

      <div className="MarketPoolSwapBox-info-section">
        <MarketPoolFees
          priceImpact={priceImpact}
          executionFeeToken={executionFee?.feeToken}
          executionFeeUsd={executionFee?.feeUsd}
          executionFee={executionFee?.feeTokenAmount}
          totalFeeUsd={feesUsd}
        />
      </div>

      {isHighPriceImpact && (
        <div className="MarketPoolSwapBox-warnings">
          <Checkbox asRow isChecked={isHighPriceImpactAccepted} setIsChecked={setIsHighPriceImpactAccepted}>
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

      {isConfirming && (
        <MarketPoolSwapConfirmation
          longDelta={longDelta}
          shortDelta={shortDelta}
          marketTokenAmount={marketTokenState.tokenAmount}
          marketTokenAddress={p.selectedMarketAddress!}
          tokensData={tokensData}
          priceImpact={priceImpact}
          feesUsd={feesUsd}
          executionFee={executionFee?.feeTokenAmount}
          executionFeeUsd={executionFee?.feeUsd}
          executionFeeToken={executionFee?.feeToken}
          operationType={operationTab}
          onSubmitted={() => {
            setIsConfirming(false);
            setIsProcessing(true);
          }}
          onClose={() => setIsConfirming(false)}
        />
      )}

      {isProcessing && (
        <MarketPoolSwapStatus
          firstToken={firstTokenState.tokenAddress!}
          secondToken={secondTokenState.tokenAddress}
          market={market?.marketTokenAddress!}
          isDeposit={operationTab === Operation.deposit}
          onClose={() => setIsProcessing(false)}
        />
      )}
    </div>
  );
}
