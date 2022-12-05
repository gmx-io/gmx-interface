import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Tab from "components/Tab/Tab";
import { getToken } from "config/tokens";
import { MarketPoolType, SyntheticsMarket } from "domain/synthetics/markets/types";
import { useChainId } from "lib/chains";
import { GM_DECIMALS } from "lib/legacy";
import { useEffect, useMemo, useState } from "react";

import { MarketDropdown } from "../MarketDropdown/MarketDropdown";
import { FocusInputId, Mode, modesTexts, OperationType, operationTypesTexts } from "../constants";
import { shouldShowMaxButton, useGmTokenState, useSwapTokenState } from "../utils";

import { getMarket, getTokenPoolType } from "domain/synthetics/markets/utils";
import { BigNumber } from "ethers";
import { IoMdSwap } from "react-icons/io";
import { SubmitButton } from "components/SubmitButton/SubmitButton";
import TokenSelector from "components/TokenSelector/TokenSelector";
import { useWhitelistedTokensData } from "domain/synthetics/tokens/useTokensData";
import { adaptToInfoTokens, formatTokenAmount, formatUsdAmount } from "domain/synthetics/tokens/utils";
import { useMarkets } from "domain/synthetics/markets/useMarkets";
import { usePriceImpactData } from "domain/synthetics/priceImpact/usePriceImpact";
import { useMarketPools } from "domain/synthetics/markets/useMarketPools";
import { formatPriceImpact, getPriceImpact } from "domain/synthetics/priceImpact/utils";
import { InfoRow } from "components/InfoRow/InfoRow";
import Tooltip from "components/Tooltip/Tooltip";

import "./MarketPoolSwapBox.scss";
import { MarketPoolSwapConfirmation } from "../MarketPoolSwapConfirmation/MarketPoolSwapConfirmation";

type Props = {
  selectedMarketAddress?: string;
  markets: SyntheticsMarket[];
  onSelectMarket: (marketAddress: string) => void;
  onConnectWallet: () => void;
};

export function MarketPoolSwapBox(p: Props) {
  const { chainId } = useChainId();

  const [operationTab, setOperationTab] = useState(OperationType.deposit);
  const [modeTab, setModeTab] = useState(Mode.single);
  const [focusedInput, setFocusedInput] = useState<FocusInputId | undefined>();
  const [isConfirming, setIsConfirming] = useState(false);

  const tokensData = useWhitelistedTokensData(chainId);
  const marketsData = useMarkets(chainId);
  const marketPoolsData = useMarketPools(chainId);
  const priceImpactConfigsData = usePriceImpactData(chainId, {
    marketAddresses: p.markets.map((market) => market.marketTokenAddress),
  });

  const data = {
    ...tokensData,
    ...marketsData,
    ...marketPoolsData,
    ...priceImpactConfigsData,
  };

  const selectedMarket = getMarket(marketsData, p.selectedMarketAddress);

  const availableTokens = useMemo(() => {
    if (!selectedMarket) return [];

    return [selectedMarket.longTokenAddress, selectedMarket.shortTokenAddress].map((address) =>
      getToken(chainId, address)
    );
  }, [chainId, selectedMarket]);

  const firstTokenState = useSwapTokenState(tokensData);
  const secondTokenState = useSwapTokenState(tokensData);

  const gmTokenState = useGmTokenState(chainId, { marketAddress: p.selectedMarketAddress });

  const longDelta = getDeltaByPoolType(MarketPoolType.Long);
  const shortDelta = getDeltaByPoolType(MarketPoolType.Short);

  const priceImpact = getPriceImpact(data, selectedMarket?.marketTokenAddress, longDelta, shortDelta);

  const tokenSelectorOptionsMap = useMemo(() => adaptToInfoTokens(tokensData), [tokensData]);

  const submitButtonState = getSubmitButtonState();

  function getDeltaByPoolType(poolType: MarketPoolType) {
    if (!selectedMarket) return BigNumber.from(0);

    const poolTokenState = [firstTokenState, secondTokenState].find(
      (tokenState) => tokenState.tokenAddress && getTokenPoolType(selectedMarket, tokenState.tokenAddress) === poolType
    );

    if (!poolTokenState) return BigNumber.from(0);

    return operationTab === OperationType.deposit
      ? poolTokenState.usdAmount
      : BigNumber.from(0).sub(poolTokenState.usdAmount);
  }

  function getSubmitButtonState(): { text: string; disabled?: boolean; onClick?: () => void } {
    if (!gmTokenState.usdAmount.gt(0)) {
      return {
        text: t`Enter an amount`,
        disabled: true,
      };
    }

    if (operationTab === OperationType.deposit) {
      const insuficcientBalanceToken = [firstTokenState, secondTokenState].find((tokenState) =>
        tokenState.tokenAmount.gt(tokenState.balance)
      );

      if (insuficcientBalanceToken) {
        return {
          text: t`Insufficient ${insuficcientBalanceToken.token!.symbol} balance`,
          disabled: true,
        };
      }

      return {
        text: t`Buy GM`,
        onClick: onSubmit,
      };
    } else {
      if (gmTokenState.tokenAmount.gt(gmTokenState.balance)) {
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
    setOperationTab((prev) => (prev === OperationType.deposit ? OperationType.withdraw : OperationType.deposit));
  }

  function onSubmit() {
    setIsConfirming(true);
  }

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

        secondTokenState.setTokenAddress(secondToken.address);
      } else if (modeTab === Mode.single && secondTokenState.tokenAddress) {
        secondTokenState.setInputValue(undefined);
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

      if (focusedInput === FocusInputId.gm) {
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
        options={Object.values(OperationType)}
        optionLabels={operationTypesTexts}
        option={operationTab}
        onChange={setOperationTab}
        className="Exchange-swap-option-tabs"
      />

      <Tab
        options={Object.values(Mode)}
        optionLabels={modesTexts}
        className="MarketPoolSwapBox-asset-options-tabs"
        type="inline"
        option={modeTab}
        onChange={setModeTab}
      />

      <div className={cx("MarketPoolSwapBox-form-layout", { reverse: operationTab === OperationType.withdraw })}>
        {firstTokenState.tokenAddress && firstTokenState.token && (
          <BuyInputSection
            topLeftLabel={operationTab === OperationType.deposit ? t`Pay` : t`Receive`}
            topRightLabel={t`Balance:`}
            tokenBalance={formatTokenAmount(firstTokenState.balance, firstTokenState.token?.decimals)}
            inputValue={firstTokenState.inputValue}
            onInputValueChange={(e) => {
              setFocusedInput(FocusInputId.swapFirst);
              firstTokenState.setInputValue(e.target.value);
            }}
            showMaxButton={operationTab === OperationType.deposit && shouldShowMaxButton(firstTokenState)}
            onClickMax={() => {
              setFocusedInput(FocusInputId.swapFirst);
              firstTokenState.setValueByTokenAmount(firstTokenState.balance);
            }}
            balance={formatUsdAmount(firstTokenState.usdAmount)}
          >
            {modeTab === Mode.single ? (
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
        )}

        {secondTokenState.token && (
          <BuyInputSection
            topLeftLabel={operationTab === OperationType.deposit ? t`Pay` : t`Receive`}
            topRightLabel={t`Balance:`}
            tokenBalance={formatTokenAmount(secondTokenState.balance, secondTokenState.token?.decimals)}
            inputValue={secondTokenState.inputValue}
            onInputValueChange={(e) => {
              setFocusedInput(FocusInputId.swapSecond);
              secondTokenState.setInputValue(e.target.value);
            }}
            showMaxButton={operationTab === OperationType.deposit && shouldShowMaxButton(secondTokenState)}
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
          topLeftLabel={operationTab === OperationType.withdraw ? t`Pay` : t`Receive`}
          topRightLabel={t`Balance:`}
          tokenBalance={formatTokenAmount(gmTokenState.balance, GM_DECIMALS)}
          inputValue={gmTokenState.inputValue}
          onInputValueChange={(e) => {
            setFocusedInput(FocusInputId.gm);
            gmTokenState.setInputValue(e.target.value);
          }}
          showMaxButton={operationTab === OperationType.withdraw && shouldShowMaxButton(gmTokenState)}
          onClickMax={() => {
            setFocusedInput(FocusInputId.gm);
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
              handle={priceImpact ? formatPriceImpact(priceImpact) : "..."}
              position="right-bottom"
              renderContent={() => (
                <div className="text-white">
                  <Trans>Price impact description</Trans>
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
          marketTokenAddress={p.selectedMarketAddress!}
          gmSwapAmount={gmTokenState.tokenAmount}
          onClose={() => setIsConfirming(false)}
          tokensData={tokensData}
          priceImpact={priceImpact}
          operationType={operationTab}
          onSubmit={() => null}
        />
      )}
    </div>
  );
}
