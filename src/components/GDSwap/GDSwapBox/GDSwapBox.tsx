import { t, Trans } from "@lingui/macro";
import { useState } from "react";
import "./GDSwapBox.css";

import Tab from "components/Tab/Tab";
import { BuyGD } from "./BuyGD";
import { SellGD } from "./SellGD";
import Tooltip from "components/Tooltip/Tooltip";

type Props = {
  className?: string;
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

export function GDSwapBox(p: Props) {
  const [currentTab, setCurrentTab] = useState(tabs.deposit);
  const [operationType, setOperationType] = useState(operationTypes.longCollateral);

  return (
    <div className={`GDSwapBox App-box ${p.className}`}>
      {/* <MarketDropdown onSelect={() => null} /> */}
      <Tab
        options={Object.values(tabs)}
        option={currentTab}
        onChange={setCurrentTab}
        className="Exchange-swap-option-tabs"
      />
      <Tab
        options={Object.values(operationTypes)}
        className="GDSwapBox-asset-options-tabs"
        type="inline"
        option={operationType}
        onChange={setOperationType}
      />
      {currentTab === tabs.deposit ? (
        <BuyGD onSwapArrowClick={() => setCurrentTab(tabs.withdraw)} />
      ) : (
        <SellGD onSwapArrowClick={() => setCurrentTab(tabs.deposit)} />
      )}
      <div className="GDSwapBox-info-section">
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
