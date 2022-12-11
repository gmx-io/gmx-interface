import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Tab from "components/Tab/Tab";
import { getToken } from "config/tokens";
import { MarketPoolType, Market } from "domain/synthetics/markets/types";
import { useChainId } from "lib/chains";
import { useEffect, useMemo, useState } from "react";

import { FocusInputId, Mode, modeTexts, Operation, operationTexts } from "../constants";
import { MarketDropdown } from "../MarketDropdown/MarketDropdown";

import { InfoRow } from "components/InfoRow/InfoRow";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import TokenSelector from "components/TokenSelector/TokenSelector";
import Tooltip from "components/Tooltip/Tooltip";
import { getMarket, getMarketPoolData, getTokenPoolType } from "domain/synthetics/markets/utils";
import { useWhitelistedTokensData } from "domain/synthetics/tokens/useTokensData";
import { adaptToInfoTokens, formatTokenAmount, formatUsdAmount } from "domain/synthetics/tokens/utils";
import { BigNumber } from "ethers";
import { IoMdSwap } from "react-icons/io";

import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import { usePriceImpactConfigs } from "domain/synthetics/fees/usePriceImpactConfigs";
import { formatFee, getPriceImpact } from "domain/synthetics/fees/utils";
import { expandDecimals } from "lib/numbers";
import { MarketPoolSwapConfirmation } from "../MarketPoolSwapConfirmation/MarketPoolSwapConfirmation";
import "./MarketPoolSwapBox.scss";
import { useMarketsData, useMarketsPoolsData, useMarketTokensData } from "domain/synthetics/markets";
import { useSwapTokenState } from "domain/synthetics/exchange/useSwapTokenState";
import { shouldShowMaxButton } from "domain/synthetics/exchange";

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

    return [selectedMarket.longTokenAddress, selectedMarket.shortTokenAddress].map((address) =>
      getToken(chainId, address)
    );
  }, [chainId, selectedMarket]);

  const firstTokenState = useSwapTokenState(tokensData);
  const secondTokenState = useSwapTokenState(tokensData);

  const gmTokenState = useSwapTokenState(marketTokensData);

  const longDelta = getDeltaByPoolType(MarketPoolType.Long);
  const shortDelta = getDeltaByPoolType(MarketPoolType.Short);

  const marketPools = getMarketPoolData(marketPoolsData, selectedMarket?.marketTokenAddress);

  const priceImpact = getPriceImpact(
    priceImpactConfigsData,
    selectedMarket?.marketTokenAddress,
    marketPools?.longPoolAmount,
    marketPools?.shortPoolAmount,
    longDelta.usdDelta,
    shortDelta.usdAmount
  );

  // TODO
  const executionFee = expandDecimals(1, 28);

  const fees = executionFee.add(priceImpact?.impact.lt(0) ? priceImpact?.impact.abs() : BigNumber.from(0));

  const tokenSelectorOptionsMap = useMemo(() => adaptToInfoTokens(tokensData), [tokensData]);

  const submitButtonState = getSubmitButtonState();

  function getDeltaByPoolType(poolType: MarketPoolType) {
    if (!selectedMarket)
      return {
        tokenAmount: BigNumber.from(0),
        usdAmount: BigNumber.from(0),
        usdDelta: BigNumber.from(0),
      };

    const poolTokenState = [firstTokenState, secondTokenState].find(
      (tokenState) =>
        tokenState.tokenAddress &&
        getTokenPoolType(marketsData, selectedMarket.marketTokenAddress, tokenState.tokenAddress) === poolType
    );

    if (!poolTokenState)
      return {
        tokenAmount: BigNumber.from(0),
        usdAmount: BigNumber.from(0),
        usdDelta: BigNumber.from(0),
      };

    return {
      tokenAmount: poolTokenState.tokenAmount,
      usdAmount: poolTokenState.usdAmount,
      usdDelta:
        operationTab === Operation.deposit ? poolTokenState.usdAmount : BigNumber.from(0).sub(poolTokenState.usdAmount),
    };
  }

  function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
    if (!gmTokenState.usdAmount.gt(0)) {
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
      if (!gmTokenState.balance || gmTokenState.tokenAmount.gt(gmTokenState.balance)) {
        return {
          text: t`Insufficient ${gmTokenState.token?.symbol} balance`,
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
    if (p.selectedMarketAddress !== gmTokenState.tokenAddress) {
      gmTokenState.setTokenAddress(p.selectedMarketAddress);
    }
  }, [p.selectedMarketAddress, marketsData, gmTokenState]);

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

        gmTokenState.setValueByUsdAmount(swapSumUsd);

        return;
      }

      if (focusedInput === FocusInputId.market) {
        if (modeTab === Mode.single && firstTokenState.tokenAddress) {
          firstTokenState.setValueByUsdAmount(gmTokenState.usdAmount);

          return;
        }

        if (modeTab === Mode.pair && firstTokenState.tokenAddress && secondTokenState.tokenAddress) {
          const previousSum = firstTokenState.usdAmount.add(secondTokenState.usdAmount);

          const firstTokenUsd = firstTokenState.usdAmount
            .mul(gmTokenState.usdAmount)
            .div(previousSum.gt(0) ? previousSum : 1);

          const secondTokenUsd = gmTokenState.usdAmount.sub(firstTokenUsd);

          firstTokenState.setValueByUsdAmount(firstTokenUsd);
          secondTokenState.setValueByUsdAmount(secondTokenUsd);

          return;
        }
      }
    },
    [focusedInput, firstTokenState, secondTokenState, gmTokenState, modeTab]
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
          tokenBalance={formatTokenAmount(gmTokenState.balance, gmTokenState.token?.decimals)}
          inputValue={gmTokenState.inputValue}
          onInputValueChange={(e) => {
            setFocusedInput(FocusInputId.market);
            gmTokenState.setInputValue(e.target.value);
          }}
          showMaxButton={operationTab === Operation.withdraw && shouldShowMaxButton(gmTokenState)}
          onClickMax={() => {
            setFocusedInput(FocusInputId.market);
            gmTokenState.setValueByTokenAmount(gmTokenState.balance);
          }}
          balance={formatUsdAmount(gmTokenState.usdAmount)}
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
                  <StatsTooltipRow label={t`Execution fee`} value={formatFee(executionFee)} showDollar={false} />
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
          firstSwapTokenAddress={firstTokenState.tokenAddress!}
          firstSwapTokenAmount={firstTokenState.tokenAmount}
          secondSwapTokenAddress={secondTokenState.tokenAddress}
          secondSwapTokenAmount={secondTokenState.tokenAmount}
          longTokenAmount={longDelta.tokenAmount}
          shortTokenAmount={shortDelta.tokenAmount}
          marketTokenAmount={gmTokenState.tokenAmount}
          marketTokenAddress={p.selectedMarketAddress!}
          gmSwapAmount={gmTokenState.tokenAmount}
          onClose={() => setIsConfirming(false)}
          tokensData={tokensData}
          priceImpact={priceImpact}
          fees={fees}
          executionFee={executionFee}
          operationType={operationTab}
          onSubmit={() => null}
        />
      )}
    </div>
  );
}
