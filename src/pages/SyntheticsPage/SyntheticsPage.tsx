import Footer from "components/Footer/Footer";
import { SwapBox } from "components/Synthetics/Trade/SwapBox/SwapBox";
import Tab from "components/Tab/Tab";
import { useState } from "react";

import "./SyntheticsPage.scss";
import { OrderList } from "components/Synthetics/OrderList/OrderList";
import { PositionList } from "components/Synthetics/PositionList/PositionList";
import { useAggregatedPositionsData } from "domain/synthetics/positions/useAggregatedPositionsData";
import { useChainId } from "lib/chains";
import { useAggregatedOrdersData } from "domain/synthetics/orders/useAggregatedOrdersData";

type Props = {
  onConnectWallet: () => void;
};

enum ListSection {
  Positions = "Positions",
  Orders = "Orders",
}

export function SyntheticsPage(p: Props) {
  const { chainId } = useChainId();
  const [listSection, setListSection] = useState(ListSection.Positions);
  const [selectedMarketAddress, setSelectedMarketAddress] = useState<string>();

  const { aggregatedPositionsData, isLoading: isPositionsLoading } = useAggregatedPositionsData(chainId);
  const { aggregatedOrdersData, isLoading: isOrdersLoading } = useAggregatedOrdersData(chainId);

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
            {listSection === ListSection.Positions && (
              <PositionList
                positionsData={aggregatedPositionsData}
                ordersData={aggregatedOrdersData}
                isLoading={isPositionsLoading}
                onOrdersClick={() => setListSection(ListSection.Orders)}
                onSelectMarket={setSelectedMarketAddress}
              />
            )}
            {listSection === ListSection.Orders && (
              <OrderList ordersData={aggregatedOrdersData} isLoading={isOrdersLoading} />
            )}
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
          {listSection === ListSection.Positions && (
            <PositionList
              positionsData={aggregatedPositionsData}
              ordersData={aggregatedOrdersData}
              isLoading={isPositionsLoading}
              onOrdersClick={() => setListSection(ListSection.Orders)}
              onSelectMarket={setSelectedMarketAddress}
            />
          )}
          {listSection === ListSection.Orders && (
            <OrderList ordersData={aggregatedOrdersData} isLoading={isOrdersLoading} />
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
