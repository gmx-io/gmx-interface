import { t } from "@lingui/macro";
import { useState } from "react";

import "./GlpSwap.css";

import Tab from "components/Tab/Tab";
import { BuyGD } from "./BuyGD";

const tabs = {
  deposit: t`Deposit`,
  withdraw: t`Withdraw`,
};

export function GDSwapBox() {
  const [currentTab, setCurrentTab] = useState(tabs.deposit);

  return (
    <div className="GlpSwap-box App-box">
      <Tab
        options={Object.values(tabs)}
        option={currentTab}
        onChange={setCurrentTab}
        className="Exchange-swap-option-tabs"
      />
      {currentTab === tabs.deposit ? <BuyGD /> : null}
      {/* <div>
        <div className="Exchange-info-row">
          <div className="Exchange-info-label">{feeBasisPoints > 50 ? t`WARNING: High Fees` : t`Fees`}</div>
          <div className="align-right fee-block">
            {isBuying && (
              <Tooltip
                handle={isBuying && isSwapTokenCapReached ? "NA" : feePercentageText}
                position="right-bottom"
                renderContent={() => {
                  if (!feeBasisPoints) {
                    return (
                      <div className="text-white">
                        <Trans>Fees will be shown once you have entered an amount in the order form.</Trans>
                      </div>
                    );
                  }
                  return (
                    <div className="text-white">
                      {feeBasisPoints > 50 && <Trans>To reduce fees, select a different asset to pay with.</Trans>}
                      <Trans>Check the "Save on Fees" section below to get the lowest fee percentages.</Trans>
                    </div>
                  );
                }}
              />
            )}
            {!isBuying && (
              <Tooltip
                handle={feePercentageText}
                position="right-bottom"
                renderContent={() => {
                  if (!feeBasisPoints) {
                    return (
                      <div className="text-white">
                        <Trans>Fees will be shown once you have entered an amount in the order form.</Trans>
                      </div>
                    );
                  }
                  return (
                    <div className="text-white">
                      {feeBasisPoints > 50 && <Trans>To reduce fees, select a different asset to receive.</Trans>}
                      <Trans>Check the "Save on Fees" section below to get the lowest fee percentages.</Trans>
                    </div>
                  );
                }}
              />
            )}
          </div>
        </div>
      </div> */}
      <div className="GlpSwap-cta Exchange-swap-button-container">
        <button className="App-cta Exchange-swap-button" onClick={() => null} disabled={false}>
          Buy
        </button>
      </div>
    </div>
  );
}
