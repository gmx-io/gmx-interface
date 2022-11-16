import { Trans } from "@lingui/macro";
import { useState } from "react";
import Tab from "components/Tab/Tab";
import { BuyGM } from "./BuyGM";
import Tooltip from "components/Tooltip/Tooltip";
import { MarketDropdown } from "../MarketDropdown/MarketDropdown";
import { SyntheticsMarket } from "domain/synthetics/types";
import "./GMSwapBox.scss";
import { Mode, modesTexts, OperationType, operationTypesTexts } from "./constants";
import { InfoTokens } from "domain/tokens";
import { getTokenBySymbol } from "config/tokens";
import { useChainId } from "lib/chains";
import { bigNumberify, formatAmountFree } from "lib/numbers";
import { BigNumber } from "ethers";
import { usePriceImpact } from "domain/synthetics/usePriceImpact";
import { USD_DECIMALS } from "lib/legacy";

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

  const [swapAmounts, setSwapAmounts] = useState<{ longAmountUsd?: BigNumber; shortAmountUsd?: BigNumber }>({
    longAmountUsd: bigNumberify(0),
    shortAmountUsd: bigNumberify(0),
  });

  const priceImpact = usePriceImpact(chainId, {
    market: p.selectedMarket.perp,
    longDeltaUsd:
      operationTab === OperationType.deposit
        ? swapAmounts.longAmountUsd!
        : bigNumberify(0)!.sub(swapAmounts.longAmountUsd!),
    shortDeltaUsd:
      operationTab === OperationType.deposit
        ? swapAmounts.shortAmountUsd!
        : bigNumberify(0)!.sub(swapAmounts.shortAmountUsd!),
  });

  console.log("price impact", Number(priceImpact?.priceImpactDiff), Number(priceImpact?.priceImpactShare));

  console.log("rerender");

  const availableTokens = [p.selectedMarket.longCollateralSymbol, p.selectedMarket.shortCollateralSymbol].map(
    (symbol) => getTokenBySymbol(chainId, symbol)
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

      <BuyGM
        operationType={operationTab}
        infoTokens={p.infoTokens}
        mode={modeTab}
        availableTokens={availableTokens}
        onSwapArrowClick={() =>
          setOperationTab((val) => (val === OperationType.withdraw ? OperationType.deposit : OperationType.withdraw))
        }
        onAmountsChange={setSwapAmounts}
      />

      <div className="GMSwapBox-info-section">
        <div className="Exchange-info-row">
          <div className="Exchange-info-label">
            <Trans>Fees and price impact</Trans>
          </div>
          <div className="align-right">
            <Tooltip
              handle={
                priceImpact?.priceImpactDiff && `${formatAmountFree(priceImpact.priceImpactDiff, USD_DECIMALS, 3)}`
              }
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
