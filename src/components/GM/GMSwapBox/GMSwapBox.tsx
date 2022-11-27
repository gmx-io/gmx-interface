import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import Tab from "components/Tab/Tab";
import Tooltip from "components/Tooltip/Tooltip";
import { getTokenBySymbol, getWhitelistedTokens } from "config/tokens";
import { MarketPoolType, SyntheticsMarket } from "domain/synthetics/markets/types";
import { useChainId } from "lib/chains";
import { GM_DECIMALS } from "lib/legacy";
import { useEffect, useMemo, useState } from "react";

import { MarketDropdown } from "../MarketDropdown/MarketDropdown";
import { FocusInputId, Mode, modesTexts, OperationType, operationTypesTexts } from "./constants";
import {
  formatPriceImpact,
  formatTokenAmount,
  formatUsdAmount,
  shouldShowMaxButton,
  useGmTokenState,
  useSwapTokenState,
} from "./utils";

import { getMarketKey, getTokenPoolType } from "domain/synthetics/markets/utils";
import { usePriceImpact } from "domain/synthetics/usePriceImpact";
import { BigNumber } from "ethers";
import { IoMdSwap } from "react-icons/io";

import { useTokensData } from "domain/synthetics/tokens/useTokensData";
import "./GMSwapBox.scss";
import TokenSelector from "components/TokenSelector/TokenSelector";
import { adaptToInfoTokens } from "domain/synthetics/tokens/utils";

type Props = {
  selectedMarket: SyntheticsMarket;
  markets: SyntheticsMarket[];
  onSelectMarket: (market: SyntheticsMarket) => void;
};

export function GMSwapBox(p: Props) {
  const { chainId } = useChainId();

  const [operationTab, setOperationTab] = useState(OperationType.deposit);
  const [modeTab, setModeTab] = useState(Mode.single);
  const [focusedInput, setFocusedInput] = useState<FocusInputId | undefined>();

  const tokensData = useTokensData(chainId, {
    tokenAddresses: getWhitelistedTokens(chainId).map((token) => token.address),
  });

  const availableTokens = [p.selectedMarket.longCollateralSymbol, p.selectedMarket.shortCollateralSymbol].map(
    (symbol) => getTokenBySymbol(chainId, symbol)
  );

  const firstTokenState = useSwapTokenState(tokensData, { tokenAddress: availableTokens[0].address });
  const secondTokenState = useSwapTokenState(tokensData);

  const gmTokenState = useGmTokenState(chainId);

  const longDelta = getDeltaByPoolType(MarketPoolType.Long);
  const shortDelta = getDeltaByPoolType(MarketPoolType.Short);

  const priceImpact = usePriceImpact({
    marketKey: getMarketKey(p.selectedMarket),
    longDeltaUsd: longDelta,
    shortDeltaUsd: shortDelta,
  });

  const submitButtonState = getSubmitButtonState();

  const infoTokens = useMemo(() => adaptToInfoTokens(tokensData), [tokensData]);

  function getDeltaByPoolType(poolType: MarketPoolType) {
    const relevantTokenState = [firstTokenState, secondTokenState].find(
      (tokenState) =>
        tokenState.token?.symbol && getTokenPoolType(p.selectedMarket, tokenState.token.symbol) === poolType
    );

    if (!relevantTokenState) return BigNumber.from(0);

    return operationTab === OperationType.deposit
      ? relevantTokenState.usdAmount
      : BigNumber.from(0).sub(relevantTokenState.usdAmount);
  }

  function getSubmitButtonState() {
    if (operationTab === OperationType.deposit) {
      return {
        text: t`Buy GM`,
      };
    }

    if (operationTab === OperationType.withdraw) {
      return {
        text: t`Sell GM`,
      };
    }
  }

  function onSwitchOperation() {
    setOperationTab((prev) => (prev === OperationType.deposit ? OperationType.withdraw : OperationType.deposit));
  }

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
    <div className={`App-box GMSwapBox`}>
      <div className="GMSwapBox-market-dropdown">
        <MarketDropdown selectedMarket={p.selectedMarket} markets={p.markets} onSelect={p.onSelectMarket} />
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
        className="GMSwapBox-asset-options-tabs"
        type="inline"
        option={modeTab}
        onChange={setModeTab}
      />

      <div className={cx("GMSwapBox-form-layout", { reverse: operationTab === OperationType.withdraw })}>
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
            onClickMax={() => firstTokenState.setValueByTokenAmount(firstTokenState.balance)}
            balance={formatUsdAmount(firstTokenState.usdAmount)}
          >
            {modeTab === Mode.single ? (
              <TokenSelector
                label={t`Pay`}
                chainId={chainId}
                tokenAddress={firstTokenState.tokenAddress}
                onSelectToken={(token) => firstTokenState.setTokenAddress(token.address)}
                tokens={availableTokens}
                infoTokens={infoTokens}
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
            onClickMax={() => secondTokenState.setValueByTokenAmount(secondTokenState.balance)}
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
          onClickMax={() => gmTokenState.setValueByTokenAmount(gmTokenState.balance)}
          balance={formatUsdAmount(gmTokenState.usdAmount)}
        >
          <div className="selected-token">GM</div>
        </BuyInputSection>
      </div>

      <div className="GMSwapBox-info-section">
        <div className="Exchange-info-row">
          <div className="Exchange-info-label">
            <Trans>Fees and price impact</Trans>
          </div>
          <div className="align-right">
            <Tooltip
              handle={formatPriceImpact(priceImpact)}
              position="right-bottom"
              renderContent={() => (
                <div className="text-white">
                  <Trans>Price impact description</Trans>
                </div>
              )}
            />
          </div>
        </div>
      </div>
      <div className="Exchange-swap-button-container">
        <button className="App-cta Exchange-swap-button" onClick={() => null} disabled={false}>
          {submitButtonState?.text}
        </button>
      </div>
    </div>
  );
}
