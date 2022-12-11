import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Tab from "components/Tab/Tab";
import { getToken, getWrappedToken, NATIVE_TOKEN_ADDRESS } from "config/tokens";
import { MarketPoolType, Market } from "domain/synthetics/markets/types";
import { useChainId } from "lib/chains";
import { useEffect, useMemo, useState } from "react";

import { FocusInputId, Mode, modeTexts, Operation, operationTexts, PoolDelta } from "../constants";
import { MarketDropdown } from "../MarketDropdown/MarketDropdown";

import { InfoRow } from "components/InfoRow/InfoRow";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import TokenSelector from "components/TokenSelector/TokenSelector";
import Tooltip from "components/Tooltip/Tooltip";
import { getMarket, getMarketPoolData, getTokenPoolType } from "domain/synthetics/markets/utils";
import { useWhitelistedTokensData } from "domain/synthetics/tokens/useTokensData";
import {
  adaptToInfoTokens,
  convertFromUsdByPrice,
  formatTokenAmount,
  formatUsdAmount,
  getTokenData,
} from "domain/synthetics/tokens/utils";
import { BigNumber } from "ethers";
import { IoMdSwap } from "react-icons/io";

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { usePriceImpactConfigs } from "domain/synthetics/fees/usePriceImpactConfigs";
import { formatFee, getPriceImpact } from "domain/synthetics/fees/utils";
import { expandDecimals } from "lib/numbers";
import { MarketPoolSwapConfirmation } from "../MarketPoolSwapConfirmation/MarketPoolSwapConfirmation";
import { useMarketsData, useMarketsPoolsData, useMarketTokensData } from "domain/synthetics/markets";
import { useSwapTokenState } from "domain/synthetics/exchange/useSwapTokenState";
import { shouldShowMaxButton } from "domain/synthetics/exchange";

import "./MarketPoolSwapBox.scss";

type Props = {
  selectedMarketAddress?: string;
  markets: Market[];
  onSelectMarket: (marketAddress: string) => void;
  onConnectWallet: () => void;
};

export function MarketPoolSwapBox(p: Props) {
  const { chainId } = useChainId();

  const [operationTab, setOperationTab] = useState(Operation.deposit);
  const [modeTab, setModeTab] = useState(Mode.single);
  const [focusedInput, setFocusedInput] = useState<FocusInputId | undefined>();
  const [isConfirming, setIsConfirming] = useState(false);

  const tokensData = useWhitelistedTokensData(chainId);
  const marketsData = useMarketsData(chainId);
  const marketTokensData = useMarketTokensData(chainId);
  const marketPoolsData = useMarketsPoolsData(chainId);
  const priceImpactConfigsData = usePriceImpactConfigs(chainId);

  const selectedMarket = getMarket(marketsData, p.selectedMarketAddress);

  const availableTokens = useMemo(() => {
    if (!selectedMarket) return [];

    const availableAddresses = [selectedMarket.longTokenAddress, selectedMarket.shortTokenAddress];

    if (availableAddresses.includes(NATIVE_TOKEN_ADDRESS)) {
      const wrappedToken = getWrappedToken(chainId);
      availableAddresses.push(wrappedToken.address);
    }

    return availableAddresses.map((address) => getToken(chainId, address));
  }, [chainId, selectedMarket]);

  const firstTokenState = useSwapTokenState(tokensData);
  const secondTokenState = useSwapTokenState(tokensData);

  const marketTokenState = useSwapTokenState(marketTokensData);

  const longDelta = getDeltaByPoolType(MarketPoolType.Long);
  const shortDelta = getDeltaByPoolType(MarketPoolType.Short);

  const marketPools = getMarketPoolData(marketPoolsData, selectedMarket?.marketTokenAddress);

  const priceImpact = getPriceImpact(
    priceImpactConfigsData,
    selectedMarket?.marketTokenAddress,
    marketPools?.longPoolAmount,
    marketPools?.shortPoolAmount,
    longDelta?.usdDelta,
    shortDelta?.usdDelta
  );

  // TODO
  const nativeToken = getTokenData(tokensData, NATIVE_TOKEN_ADDRESS);
  const executionFeeUsd = expandDecimals(1, 28);
  const executionFee = nativeToken?.prices
    ? convertFromUsdByPrice(executionFeeUsd, nativeToken.decimals, nativeToken.prices.maxPrice)
    : undefined;

  const fees = executionFeeUsd.add(priceImpact?.impact.lt(0) ? priceImpact?.impact.abs() : BigNumber.from(0));

  const tokenSelectorOptionsMap = useMemo(() => adaptToInfoTokens(tokensData), [tokensData]);

  const submitButtonState = getSubmitButtonState();

  function getDeltaByPoolType(poolType: MarketPoolType): PoolDelta | undefined {
    if (!selectedMarket) return undefined;

    const poolTokenState = [firstTokenState, secondTokenState].find((tokenState) => {
      const tokenPool = getTokenPoolType(
        marketsData,
        tokensData,
        selectedMarket.marketTokenAddress,
        tokenState.tokenAddress
      );

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
    if (!marketTokenState.usdAmount.gt(0)) {
      return {
        text: t`Enter an amount`,
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
      if (!marketTokenState.balance || marketTokenState.tokenAmount.gt(marketTokenState.balance)) {
        return {
          text: t`Insufficient ${marketTokenState.token?.symbol} balance`,
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

  useEffect(() => {
    if (p.selectedMarketAddress !== marketTokenState.tokenAddress) {
      marketTokenState.setTokenAddress(p.selectedMarketAddress);
    }
  }, [p.selectedMarketAddress, marketsData, marketTokenState]);

  useEffect(() => {
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
  }, [availableTokens, firstTokenState, secondTokenState]);

  useEffect(
    function updateInputsByModeEff() {
      if (modeTab === Mode.pair && !secondTokenState.tokenAddress) {
        const secondToken = availableTokens.filter((token) => token.address !== firstTokenState.tokenAddress)[0];

        if (secondToken) {
          secondTokenState.setTokenAddress(secondToken.address);
        }
      } else if (modeTab === Mode.single && secondTokenState.tokenAddress) {
        secondTokenState.setInputValue("");
        secondTokenState.setTokenAddress(undefined);
      }
    },
    [firstTokenState.tokenAddress, availableTokens, modeTab, secondTokenState]
  );

  useEffect(
    function syncInputValuesEff() {
      if (!focusedInput) return;

      if ([FocusInputId.swapFirst, FocusInputId.swapSecond].includes(focusedInput)) {
        const swapSumUsd = firstTokenState.usdAmount.add(secondTokenState.usdAmount);

        marketTokenState.setValueByUsdAmount(swapSumUsd);

        return;
      }

      if (focusedInput === FocusInputId.market) {
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
    [focusedInput, firstTokenState, secondTokenState, marketTokenState, modeTab]
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
            setFocusedInput(FocusInputId.swapFirst);
            firstTokenState.setInputValue(e.target.value);
          }}
          showMaxButton={operationTab === Operation.deposit && shouldShowMaxButton(firstTokenState)}
          onClickMax={() => {
            setFocusedInput(FocusInputId.swapFirst);
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
              setFocusedInput(FocusInputId.swapSecond);
              secondTokenState.setInputValue(e.target.value);
            }}
            showMaxButton={operationTab === Operation.deposit && shouldShowMaxButton(secondTokenState)}
            onClickMax={() => {
              setFocusedInput(FocusInputId.swapSecond);
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
            setFocusedInput(FocusInputId.market);
            marketTokenState.setInputValue(e.target.value);
          }}
          showMaxButton={operationTab === Operation.withdraw && shouldShowMaxButton(marketTokenState)}
          onClickMax={() => {
            setFocusedInput(FocusInputId.market);
            marketTokenState.setValueByTokenAmount(marketTokenState.balance);
          }}
          balance={formatUsdAmount(marketTokenState.usdAmount)}
        >
          <div className="selected-token">GM</div>
        </BuyInputSection>
      </div>

      <div className="MarketPoolSwapBox-info-section">
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
      </div>
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
          onClose={() => setIsConfirming(false)}
          tokensData={tokensData}
          priceImpact={priceImpact}
          fees={fees}
          executionFee={executionFee}
          operationType={operationTab}
          onSubmitted={() => setIsConfirming(false)}
        />
      )}
    </div>
  );
}
