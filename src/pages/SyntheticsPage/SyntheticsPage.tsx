import Footer from "components/Footer/Footer";
import { SwapBox } from "components/Synthetics/Trade/SwapBox/SwapBox";
import Tab from "components/Tab/Tab";
import { useState } from "react";

import "./SyntheticsPage.scss";
import { OrderList } from "components/Synthetics/OrderList/OrderList";
import { PositionList } from "components/Synthetics/PositionList/PositionList";

type Props = {
  onConnectWallet: () => void;
};

enum ListSection {
  Positions = "Positions",
  Orders = "Orders",
}

export function SyntheticsPage(p: Props) {
  const [listSection, setListSection] = useState(ListSection.Positions);
  const [selectedMarketAddress, setSelectedMarketAddress] = useState<string>();

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
            {listSection === ListSection.Positions && <PositionList onSelectMarket={setSelectedMarketAddress} />}
            {listSection === ListSection.Orders && <OrderList />}
          </div>
        </div>

        <div className="SyntheticsTrade-right">
          <div className="SyntheticsTrade-swap-box">
            <SwapBox
              onSelectMarketAddress={setSelectedMarketAddress}
              selectedMarketAddress={selectedMarketAddress}
              onConnectWallet={p.onConnectWallet}
            />
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
          {listSection === ListSection.Positions && <PositionList onSelectMarket={setSelectedMarketAddress} />}
          {listSection === ListSection.Orders && <OrderList />}
        </div>
      </div>
      <Footer />
    </div>
  );
}
