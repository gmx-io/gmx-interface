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
import { getPosition } from "domain/synthetics/positions";
import { t } from "@lingui/macro";
import { useLocalStorageByChainId } from "lib/localStorage";

type Props = {
  onConnectWallet: () => void;
};

enum ListSection {
  Positions = "Positions",
  Orders = "Orders",
}

export function SyntheticsPage(p: Props) {
  const { chainId } = useChainId();

  const [listSection, setListSection] = useLocalStorageByChainId(chainId, "List-section-v3", ListSection.Positions);

  const [selectedMarketAddress, setSelectedMarketAddress] = useState<string>();
  const [selectedCollateralAddress, setSelectedCollateralAddress] = useState<string>();

  const { aggregatedPositionsData, isLoading: isPositionsLoading } = useAggregatedPositionsData(chainId);
  const { aggregatedOrdersData, isLoading: isOrdersLoading } = useAggregatedOrdersData(chainId);

  const positionsCount = Object.keys(aggregatedPositionsData).length;
  const ordersCount = Object.keys(aggregatedOrdersData).length;

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
                optionLabels={{
                  [ListSection.Positions]: t`Positions${positionsCount ? ` (${positionsCount})` : ""}`,
                  [ListSection.Orders]: t`Orders${ordersCount ? ` (${ordersCount})` : ""}`,
                }}
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
                onSelectPositionClick={setSelectedMarketAddress}
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
              positionsData={aggregatedPositionsData}
              onSelectMarketAddress={setSelectedMarketAddress}
              onSelectCollateralAddress={setSelectedCollateralAddress}
              selectedMarketAddress={selectedMarketAddress}
              selectedCollateralAddress={selectedCollateralAddress}
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
              onSelectPositionClick={(key) => {
                const position = getPosition(aggregatedPositionsData, key)!;
                setSelectedMarketAddress(position.marketAddress);
                setSelectedCollateralAddress(position.collateralTokenAddress);
              }}
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
