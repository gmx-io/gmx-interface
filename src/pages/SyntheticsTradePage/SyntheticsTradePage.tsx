import Footer from "components/Footer/Footer";
import { SyntheticsOrdersList } from "components/SyntheticsOrdersList/SyntheticsOrdersList";
import { SyntheticsPositionsList } from "components/SyntheticsPositionsList/SyntheticsPositionsList";
import { SyntheticsSwapBox } from "components/SyntheticsSwap/SyntheticsSwapBox/SyntheticsSwapBox";
import Tab from "components/Tab/Tab";
import { useState } from "react";

import "./SyntheticsTradePage.scss";

type Props = {
  onConnectWallet: () => void;
};

enum ListSection {
  Positions = "Positions",
  Orders = "Orders",
}

export function SyntheticsTradePage(p: Props) {
  const [listSection, setListSection] = useState(ListSection.Positions);

  return (
    <div className="SyntheticsTrade page-layout">
      {/* {showBanner && <ExchangeBanner hideBanner={hideBanner} />} */}
      <div className="SyntheticsTrade-content">
        <div className="SyntheticsTrade-left">
          <div
            style={{
              height: "49.6rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#16182e",
            }}
          >
            The chart
          </div>
          {/* <ExchangeTVChart
            fromTokenAddress={fromTokenAddress}
            toTokenAddress={toTokenAddress}
            infoTokens={infoTokens}
            swapOption={swapOption}
            chainId={chainId}
            positions={positions}
            savedShouldShowPositionLines={savedShouldShowPositionLines}
            orders={orders}
            setToTokenAddress={setToTokenAddress}
          /> */}
          <div className="SyntheticsTrade-lists large">
            <div className="SyntheticsTrade-list-tab-container">
              <Tab
                options={Object.keys(ListSection)}
                optionLabels={ListSection}
                option={listSection}
                onChange={(section) => setListSection(section)}
                type="inline"
                className="Exchange-list-tabs"
              />
            </div>
            {listSection === ListSection.Positions && <SyntheticsPositionsList />}
            {listSection === ListSection.Orders && <SyntheticsOrdersList />}
          </div>
        </div>
        <div className="SyntheticsTrade-right">
          <div className="SyntheticsTrade-swap-box">
            <SyntheticsSwapBox onConnectWallet={p.onConnectWallet} />
          </div>
        </div>
        <div className="SyntheticsTrade-lists small">
          <div className="SyntheticsTrade-list-tab-container">
            <Tab
              options={Object.keys(ListSection)}
              optionLabels={ListSection}
              option={listSection}
              onChange={(section) => setListSection(section)}
              type="inline"
              className="Exchange-list-tabs"
            />
          </div>
          {listSection === ListSection.Positions && <SyntheticsPositionsList />}
          {listSection === ListSection.Orders && <SyntheticsOrdersList />}
        </div>
      </div>
      <Footer />
    </div>
  );
}
