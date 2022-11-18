import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import TokenSelector from "components/Exchange/TokenSelector";
import Tab from "components/Tab/Tab";
import Tooltip from "components/Tooltip/Tooltip";
import { getTokenBySymbol } from "config/tokens";
import { SyntheticsMarket } from "domain/synthetics/types";
import { getTokenAmountFromUsd, InfoTokens } from "domain/tokens";
import { useChainId } from "lib/chains";
import { GM_DECIMALS, USD_DECIMALS } from "lib/legacy";
import { expandDecimals, formatAmount, formatAmountFree } from "lib/numbers";
import { useEffect, useState } from "react";

import { MarketDropdown } from "../MarketDropdown/MarketDropdown";
import { FocusInputId, Mode, modesTexts, OperationType, operationTypesTexts } from "./constants";
import { shouldShowMaxButton, useGmTokenState, useSwapTokenState } from "./utils";

import { usePriceImpact } from "domain/synthetics/usePriceImpact";
import { getMarketKey } from "domain/synthetics/utils";
import { BigNumber } from "ethers";
import { IoMdSwap } from "react-icons/io";
import "./GMSwapBox.scss";

type Props = {
  selectedMarket: SyntheticsMarket;
  markets: SyntheticsMarket[];
  onSelectMarket: (market: SyntheticsMarket) => void;
  infoTokens: InfoTokens;
};

export function GMSwapBox(p: Props) {
  const { chainId } = useChainId();

  const [operationTab, setOperationTab] = useState(OperationType.deposit);
  const [modeTab, setModeTab] = useState(Mode.single);
  const [focusedInput, setFocusedInput] = useState<FocusInputId | undefined>();

  const availableTokens = [p.selectedMarket.longCollateralSymbol, p.selectedMarket.shortCollateralSymbol].map(
    (symbol) => getTokenBySymbol(chainId, symbol)
  );

  const firstTokenState = useSwapTokenState(p.infoTokens, { tokenAddress: availableTokens[0].address });
  const secondTokenState = useSwapTokenState(p.infoTokens);

  const gmTokenState = useGmTokenState();

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

        const nextGmAmount = swapSumUsd.mul(expandDecimals(1, GM_DECIMALS)).div(gmTokenState.gmPrice);

        const nextGmInputValue = formatAmountFree(nextGmAmount, GM_DECIMALS, GM_DECIMALS);

        if (gmTokenState.inputValue !== nextGmInputValue) {
          gmTokenState.setInputValue(nextGmInputValue);
        }

        return;
      }

      if (focusedInput === FocusInputId.gm) {
        if (modeTab === Mode.single && firstTokenState.tokenAddress) {
          const newSwapTokenAmount = getTokenAmountFromUsd(
            p.infoTokens,
            firstTokenState.tokenAddress,
            gmTokenState.usdAmount
          )!;

          const nextTokenValue = formatAmountFree(
            newSwapTokenAmount,
            firstTokenState.info!.decimals,
            firstTokenState.info!.decimals
          );

          if (firstTokenState.inputValue !== nextTokenValue) {
            firstTokenState.setInputValue(nextTokenValue);
          }

          return;
        }

        if (modeTab === Mode.pair && firstTokenState.tokenAddress && secondTokenState.tokenAddress) {
          const previousSum = firstTokenState.usdAmount.add(secondTokenState.usdAmount);

          const firstTokenUsd = firstTokenState.usdAmount
            .mul(gmTokenState.usdAmount)
            .div(previousSum.gt(0) ? previousSum : 1);
          const secondTokenUsd = gmTokenState.usdAmount.sub(firstTokenUsd);

          const nextFirstTokenAmount = getTokenAmountFromUsd(
            p.infoTokens,
            firstTokenState.tokenAddress,
            firstTokenUsd
          )!;

          const nextSecondTokenAmount = getTokenAmountFromUsd(
            p.infoTokens,
            secondTokenState.tokenAddress,
            secondTokenUsd
          )!;

          const nextFirstTokenValue = formatAmountFree(
            nextFirstTokenAmount,
            firstTokenState.info!.decimals,
            firstTokenState.info!.decimals
          );

          const nextSecondTokenValue = formatAmountFree(
            nextSecondTokenAmount,
            secondTokenState.info!.decimals,
            secondTokenState.info!.decimals
          );

          if (
            firstTokenState.inputValue !== nextFirstTokenValue ||
            secondTokenState.inputValue !== nextSecondTokenValue
          ) {
            firstTokenState.setInputValue(nextFirstTokenValue);
            secondTokenState.setInputValue(nextSecondTokenValue);
          }

          return;
        }
      }
    },
    [focusedInput, firstTokenState, secondTokenState, gmTokenState, modeTab, p.infoTokens]
  );

  let { longDelta, shortDelta } = [firstTokenState, secondTokenState].reduce(
    (acc, tokenState) => {
      if (tokenState.usdAmount?.gt(0)) {
        if (tokenState.info?.symbol === p.selectedMarket.longCollateralSymbol) {
          acc.longDelta = tokenState.usdAmount;
        } else if (tokenState.info?.symbol === p.selectedMarket.shortCollateralSymbol) {
          acc.shortDelta = tokenState.usdAmount;
        }
      }

      return acc;
    },
    {
      longDelta: BigNumber.from(0),
      shortDelta: BigNumber.from(0),
    }
  );

  if (operationTab === OperationType.deposit) {
    longDelta = BigNumber.from(0).sub(longDelta);
    shortDelta = BigNumber.from(0).sub(shortDelta);
  }

  const priceImpact = usePriceImpact({
    marketKey: getMarketKey(p.selectedMarket),
    longDeltaUsd: longDelta,
    shortDeltaUsd: shortDelta,
  });

  let formattedPriceImpact = "...";

  if (priceImpact.priceImpactBasisPoints.gt(0)) {
    const formattedPriceImpactUsd = formatAmount(priceImpact.priceImpactDiff, USD_DECIMALS, 2, true);
    const formattedPriceImpactBp = formatAmount(priceImpact.priceImpactBasisPoints, 2, 2);

    formattedPriceImpact = `${formattedPriceImpactBp}% ($${formattedPriceImpactUsd})`;
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

  const submitButtonState = getSubmitButtonState();

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
        {firstTokenState.tokenAddress && (
          <BuyInputSection
            topLeftLabel={operationTab === OperationType.deposit ? t`Pay` : t`Receive`}
            topRightLabel={t`Balance:`}
            tokenBalance={firstTokenState.balanceFormatted}
            inputValue={firstTokenState.inputValue}
            onInputValueChange={(e) => {
              setFocusedInput(FocusInputId.swapFirst);
              firstTokenState.setInputValue(e.target.value);
            }}
            showMaxButton={operationTab === OperationType.deposit && shouldShowMaxButton(firstTokenState)}
            onClickMax={() => firstTokenState.setValueByTokenAmount(firstTokenState.balance)}
            balance={firstTokenState.usdAmountFormatted}
          >
            {modeTab === Mode.single ? (
              <TokenSelector
                label={t`Pay`}
                chainId={chainId}
                tokenAddress={firstTokenState.tokenAddress}
                onSelectToken={(token) => firstTokenState.setTokenAddress(token.address)}
                tokens={availableTokens}
                infoTokens={p.infoTokens}
                className="GlpSwap-from-token"
                showSymbolImage={true}
                showTokenImgInDropdown={true}
              />
            ) : (
              <div className="selected-token">{firstTokenState.info?.symbol}</div>
            )}
          </BuyInputSection>
        )}

        {secondTokenState.tokenAddress && (
          <BuyInputSection
            topLeftLabel={operationTab === OperationType.deposit ? t`Pay` : t`Receive`}
            topRightLabel={t`Balance:`}
            tokenBalance={secondTokenState.balanceFormatted}
            inputValue={secondTokenState.inputValue}
            onInputValueChange={(e) => {
              setFocusedInput(FocusInputId.swapSecond);
              secondTokenState.setInputValue(e.target.value);
            }}
            showMaxButton={operationTab === OperationType.deposit && shouldShowMaxButton(secondTokenState)}
            onClickMax={() => secondTokenState.setValueByTokenAmount(secondTokenState.balance)}
            balance={secondTokenState.usdAmountFormatted}
          >
            <div className="selected-token">{secondTokenState.info?.symbol}</div>
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
          tokenBalance={gmTokenState.balanceFormatted}
          inputValue={gmTokenState.inputValue}
          onInputValueChange={(e) => {
            setFocusedInput(FocusInputId.gm);
            gmTokenState.setInputValue(e.target.value);
          }}
          showMaxButton={operationTab === OperationType.withdraw && shouldShowMaxButton(gmTokenState)}
          onClickMax={() => gmTokenState.setValueByTokenAmount(gmTokenState.balance)}
          balance={gmTokenState.usdAmountFormatted}
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
              handle={formattedPriceImpact}
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
