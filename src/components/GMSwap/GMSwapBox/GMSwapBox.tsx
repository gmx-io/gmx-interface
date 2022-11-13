import { t, Trans } from "@lingui/macro";
import { useState } from "react";
import Tab from "components/Tab/Tab";
import { BuyGM } from "./BuyGM";
import { SellGM } from "./SellGM";
import Tooltip from "components/Tooltip/Tooltip";
import { MarketDropdown } from "../MarketDropdown/MarketDropdown";
import { SyntheticsMarket } from "domain/synthetics/types";
import "./GMSwapBox.scss";

type Props = {
  selectedMarket: SyntheticsMarket;
  markets: SyntheticsMarket[];
  onSelectMarket: (market: SyntheticsMarket) => void;
};

const tabs = {
  deposit: t`Deposit`,
  withdraw: t`Withdraw`,
};

const operationTypes = {
  longCollateral: t`Long Collateral`,
  shortCollateral: t`Short Collateral`,
  pair: t`Pair`,
};

export function GMSwapBox(p: Props) {
  const [currentTab, setCurrentTab] = useState(tabs.deposit);
  const [operationType, setOperationType] = useState(operationTypes.longCollateral);

  return (
    <div className={`App-box GMSwapBox`}>
      <div className="GMSwapBox-market-dropdown">
        <MarketDropdown selectedMarket={p.selectedMarket} markets={p.markets} onSelect={p.onSelectMarket} />
      </div>
      <Tab
        options={Object.values(tabs)}
        option={currentTab}
        onChange={setCurrentTab}
        className="Exchange-swap-option-tabs"
      />
      <Tab
        options={Object.values(operationTypes)}
        className="GMSwapBox-asset-options-tabs"
        type="inline"
        option={operationType}
        onChange={setOperationType}
      />
      {currentTab === tabs.deposit ? (
        <BuyGM onSwapArrowClick={() => setCurrentTab(tabs.withdraw)} />
      ) : (
        <SellGM onSwapArrowClick={() => setCurrentTab(tabs.deposit)} />
      )}
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
