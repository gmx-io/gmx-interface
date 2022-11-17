import { useEffect, useState } from "react";
import cx from "classnames";
import { t, Trans } from "@lingui/macro";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import TokenSelector from "components/Exchange/TokenSelector";
import Tab from "components/Tab/Tab";
import Tooltip from "components/Tooltip/Tooltip";
import { getTokenBySymbol } from "config/tokens";
import { SyntheticsMarket } from "domain/synthetics/types";
import { getTokenAmountFromUsd, InfoTokens } from "domain/tokens";
import arrowIcon from "img/ic_convert_down.svg";
import { useChainId } from "lib/chains";
import { GM_DECIMALS } from "lib/legacy";
import { expandDecimals, formatAmountFree } from "lib/numbers";

import { MarketDropdown } from "../MarketDropdown/MarketDropdown";
import { FocusInputId, Mode, modesTexts, OperationType, operationTypesTexts } from "./constants";
import { useGmTokenState, useSwapTokenState } from "./hooks";

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

  function onSwapArrowClick() {
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
            firstTokenState.info.decimals,
            firstTokenState.info.decimals
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
            firstTokenState.info.decimals,
            firstTokenState.info.decimals
          );

          const nextSecondTokenValue = formatAmountFree(
            nextSecondTokenAmount,
            secondTokenState.info.decimals,
            secondTokenState.info.decimals
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

  // const priceImpact = usePriceImpact(chainId, {
  //   market: p.selectedMarket.perp,
  //   longDeltaUsd:
  //     operationTab === OperationType.deposit
  //       ? swapAmounts.longAmountUsd!
  //       : bigNumberify(0)!.sub(swapAmounts.longAmountUsd!),
  //   shortDeltaUsd:
  //     operationTab === OperationType.deposit
  //       ? swapAmounts.shortAmountUsd!
  //       : bigNumberify(0)!.sub(swapAmounts.shortAmountUsd!),
  // });

  // console.log("price impact", Number(priceImpact?.priceImpactDiff), Number(priceImpact?.priceImpactShare));

  // console.log("rerender");

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
            showMaxButton={false}
            onClickTopRightLabel={() => null}
            onClickMax={() => null}
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
            showMaxButton={false}
            onClickTopRightLabel={() => null}
            onClickMax={() => null}
            balance={secondTokenState.usdAmountFormatted}
          >
            <div className="selected-token">{secondTokenState.info?.symbol}</div>
          </BuyInputSection>
        )}

        <div className="AppOrder-ball-container">
          <div className="AppOrder-ball">
            <img src={arrowIcon} alt="arrowIcon" onClick={onSwapArrowClick} />
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
              handle={"..."}
              position="right-bottom"
              renderContent={() => (
                <div className="text-white">
                  <Trans>Fees will be shown once you have entered an amount in the order form.</Trans>
                </div>
              )}
            />
          </div>
        </div>
      </div>
      <div className="Exchange-swap-button-container">
        <button className="App-cta Exchange-swap-button" onClick={() => null} disabled={false}>
          Buy
        </button>
      </div>
    </div>
  );
}
