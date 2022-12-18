import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Tab from "components/Tab/Tab";
import { getToken, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { Market, MarketPoolType } from "domain/synthetics/markets/types";
import { useChainId } from "lib/chains";
import { useEffect, useMemo, useState } from "react";

import { Mode, modeTexts, Operation, operationTexts, PoolDelta } from "../constants";
import { MarketDropdown } from "../MarketDropdown/MarketDropdown";

import { SubmitButton } from "components/SubmitButton/SubmitButton";
import TokenSelector from "components/TokenSelector/TokenSelector";
import { getMarket, getMarketPoolData, getTokenPoolType } from "domain/synthetics/markets/utils";
import {
  adaptToInfoTokens,
  formatTokenAmount,
  formatUsdAmount,
  getTokenData,
  getUsdFromTokenAmount,
} from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { IoMdSwap } from "react-icons/io";

import { useSwapTokenState } from "domain/synthetics/exchange";
import { usePriceImpactConfigs } from "domain/synthetics/fees/usePriceImpactConfigs";
import { getExecutionFee, getPriceImpact } from "domain/synthetics/fees/utils";
import { useMarketsData, useMarketsPoolsData, useMarketTokensData } from "domain/synthetics/markets";
import { MarketPoolSwapConfirmation } from "../MarketPoolSwapConfirmation/MarketPoolSwapConfirmation";

import Checkbox from "components/Checkbox/Checkbox";
import { MarketPoolFees } from "components/MarketPoolFees/MarketPoolFees";
import { HIGH_PRICE_IMPACT_BP } from "config/synthetics";
import { useAvailableTradeTokensData } from "domain/synthetics/tokens";

import "./MarketPoolSwapBox.scss";

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

  const firstTokenState = useSwapTokenState(tokensData);
  const secondTokenState = useSwapTokenState(tokensData);

  const marketTokenState = useSwapTokenState(marketTokensData);

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

    if (!poolTokenState?.tokenAddress) return undefined;

    return {
      tokenAddress: poolTokenState.tokenAddress,
      poolType,
      tokenAmount: poolTokenState.tokenAmount,
      usdAmount: poolTokenState.usdAmount,
      // prettier-ignore
      usdDelta: operationTab === Operation.deposit 
        ? poolTokenState.usdAmount 
        : BigNumber.from(0).sub(poolTokenState.usdAmount),
    };
  }

  function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
    if (!market) {
      return {
        text: t`Select a market`,
        disabled: true,
      };
    }

    if (!marketTokenState.usdAmount.gt(0)) {
      return {
        text: t`Enter an amount`,
        disabled: true,
      };
    }

    if (isHighPriceImpact && !isHighPriceImpactAccepted) {
      return {
        text: t`Need to accept price impact`,
        disabled: true,
      };
    }

    if (operationTab === Operation.deposit) {
      const insuficcientBalanceToken = [firstTokenState, secondTokenState].find(
        (tokenState) =>
          tokenState.tokenAddress && (!tokenState.balance || tokenState.tokenAmount.gt(tokenState.balance))
      );

      if (insuficcientBalanceToken?.token) {
        return {
          text: t`Insufficient ${insuficcientBalanceToken.token.symbol} balance`,
          disabled: true,
        };
      }

      return {
        text: t`Buy GM`,
        onClick: onSubmit,
      };
    } else {
      if (marketTokenState.tokenAmount.gt(marketTokenState.balance || BigNumber.from(0))) {
        return {
          text: t`Insufficient ${marketTokenState.token?.symbol} balance`,
          disabled: true,
        };
      }

      const pools = getMarketPoolData(marketPoolsData, market.marketTokenAddress);

      if (shortDelta && shortDelta.tokenAmount.gt(pools?.shortPoolAmount || BigNumber.from(0))) {
        const shortToken = getTokenData(tokensData, shortDelta.tokenAddress);

        return {
          text: t`Insufficient ${shortToken?.symbol} liquidity`,
          disabled: true,
        };
      }

      if (longDelta && longDelta.tokenAmount.gt(pools?.longPoolAmount || BigNumber.from(0))) {
        const longToken = getTokenData(tokensData, longDelta.tokenAddress);

        return {
          text: t`Insufficient ${longToken?.symbol} liquidity`,
          disabled: true,
        };
      }

      return {
        text: t`Sell GM`,
        onClick: onSubmit,
      };
    }
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
          topLeftLabel={operationTab === Operation.deposit ? t`Pay` : t`Receive`}
          topRightLabel={t`Balance:`}
          tokenBalance={formatTokenAmount(firstTokenState.balance, firstTokenState.token?.decimals)}
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
          balance={formatUsdAmount(firstTokenState.usdAmount)}
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
            topLeftLabel={operationTab === Operation.deposit ? t`Pay` : t`Receive`}
            topRightLabel={t`Balance:`}
            tokenBalance={formatTokenAmount(secondTokenState.balance, secondTokenState.token?.decimals)}
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
            balance={formatUsdAmount(secondTokenState.usdAmount)}
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
          topLeftLabel={operationTab === Operation.withdraw ? t`Pay` : t`Receive`}
          topRightLabel={t`Balance:`}
          tokenBalance={formatTokenAmount(marketTokenState.balance, marketTokenState.token?.decimals)}
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
          balance={formatUsdAmount(marketTokenState.usdAmount)}
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
          onSubmitted={() => setIsConfirming(false)}
          onClose={() => setIsConfirming(false)}
        />
      )}
    </div>
  );
}
