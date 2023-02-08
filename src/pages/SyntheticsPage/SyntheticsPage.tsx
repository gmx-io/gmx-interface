import { Plural, t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import Footer from "components/Footer/Footer";
import { OrderList } from "components/Synthetics/OrderList/OrderList";
import { PositionList } from "components/Synthetics/PositionList/PositionList";
import { TradeBox } from "components/Synthetics/Trade/TradeBox/TradeBox";
import Tab from "components/Tab/Tab";
import {
  SYNTHETICS_TRADE_COLLATERAL_KEY,
  SYNTHETICS_TRADE_MARKET_KEY,
  SYNTHETICS_TRADE_TYPE_KEY,
} from "config/localStorage";
import { TradeType } from "domain/synthetics/trade/types";
import { cancelOrdersTxn } from "domain/synthetics/orders/cancelOrdersTxn";
import { useAggregatedOrdersData } from "domain/synthetics/orders/useAggregatedOrdersData";
import { getPosition, getPositionKey } from "domain/synthetics/positions";
import { useAggregatedPositionsData } from "domain/synthetics/positions/useAggregatedPositionsData";
import { useChainId } from "lib/chains";
import { useLocalStorageByChainId, useLocalStorageSerializeKey } from "lib/localStorage";
import { useMemo, useState } from "react";

import "./SyntheticsPage.scss";

type Props = {
  onConnectWallet: () => void;
  savedIsPnlInLeverage: boolean;
  shouldDisableValidation: boolean;
};

enum ListSection {
  Positions = "Positions",
  Orders = "Orders",
}

export function SyntheticsPage(p: Props) {
  const { chainId } = useChainId();
  const { library, account } = useWeb3React();
  const [listSection, setListSection] = useLocalStorageByChainId(chainId, "List-section-v3", ListSection.Positions);

  const [selectedMarketAddress, setSelectedMarketAddress] = useLocalStorageSerializeKey<string | undefined>(
    [chainId, SYNTHETICS_TRADE_MARKET_KEY],
    undefined
  );
  const [selectedCollateralAddress, setSelectedCollateralAddress] = useLocalStorageSerializeKey<string | undefined>(
    [chainId, SYNTHETICS_TRADE_COLLATERAL_KEY],
    undefined
  );
  const [selectedTradeType, setSelectedTradeType] = useLocalStorageSerializeKey(
    [chainId, SYNTHETICS_TRADE_TYPE_KEY],
    TradeType.Long
  );

  const [selectedOrdersKeys, setSelectedOrdersKeys] = useState<{ [key: string]: boolean }>({});
  const [isCancelOrdersProcessig, setIsCancelOrdersProcessig] = useState(false);

  const { aggregatedPositionsData, isLoading: isPositionsLoading } = useAggregatedPositionsData(chainId, {
    savedIsPnlInLeverage: p.savedIsPnlInLeverage,
  });
  const { aggregatedOrdersData, isLoading: isOrdersLoading } = useAggregatedOrdersData(chainId);

  const positionsCount = Object.keys(aggregatedPositionsData).length;
  const ordersCount = Object.keys(aggregatedOrdersData).length;
  const selectedOrdersKeysArr = Object.keys(selectedOrdersKeys).filter((key) => selectedOrdersKeys[key]);

  // TODO: request
  const selectedPosition = useMemo(() => {
    const positionKey = getPositionKey(
      account,
      selectedMarketAddress,
      selectedCollateralAddress,
      selectedTradeType === TradeType.Long
    );
    return getPosition(aggregatedPositionsData, positionKey);
  }, [account, aggregatedPositionsData, selectedCollateralAddress, selectedMarketAddress, selectedTradeType]);

  function onCancelOrdersClick() {
    setIsCancelOrdersProcessig(true);
    cancelOrdersTxn(chainId, library, {
      orderKeys: selectedOrdersKeysArr,
    }).finally(() => setIsCancelOrdersProcessig(false));
  }

  function onSelectPosition(positionKey: string) {
    const position = getPosition(aggregatedPositionsData, positionKey);

    if (!position) return;

    const { marketAddress, collateralTokenAddress, isLong } = position;

    setSelectedMarketAddress(marketAddress);
    setSelectedCollateralAddress(collateralTokenAddress);
    setSelectedTradeType(isLong ? TradeType.Long : TradeType.Short);
  }

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
              <div className="align-right Exchange-should-show-position-lines">
                {selectedOrdersKeysArr.length > 0 && (
                  <button
                    className="muted font-base cancel-order-btn"
                    disabled={isCancelOrdersProcessig}
                    type="button"
                    onClick={onCancelOrdersClick}
                  >
                    <Plural value={selectedOrdersKeysArr.length} one="Cancel order" other="Cancel # orders" />
                  </button>
                )}
              </div>
            </div>

            {listSection === ListSection.Positions && (
              <PositionList
                positionsData={aggregatedPositionsData}
                ordersData={aggregatedOrdersData}
                isLoading={isPositionsLoading}
                savedIsPnlInLeverage={p.savedIsPnlInLeverage}
                onOrdersClick={() => setListSection(ListSection.Orders)}
                onSelectPositionClick={onSelectPosition}
              />
            )}
            {listSection === ListSection.Orders && (
              <OrderList
                positionsData={aggregatedPositionsData}
                selectedOrdersKeys={selectedOrdersKeys}
                setSelectedOrdersKeys={setSelectedOrdersKeys}
                ordersData={aggregatedOrdersData}
                isLoading={isOrdersLoading}
              />
            )}
          </div>
        </div>

        <div className="SyntheticsTrade-right">
          <div className="SyntheticsTrade-swap-box">
            <TradeBox
              selectedTradeType={selectedTradeType}
              selectedMarketAddress={selectedMarketAddress}
              selectedCollateralAddress={selectedCollateralAddress}
              existingPosition={selectedPosition}
              onSelectTradeType={setSelectedTradeType}
              onSelectMarketAddress={setSelectedMarketAddress}
              onSelectCollateralAddress={setSelectedCollateralAddress}
              onConnectWallet={p.onConnectWallet}
              savedIsPnlInLeverage={p.savedIsPnlInLeverage}
              shouldDisableValidation={p.shouldDisableValidation}
              ordersData={aggregatedOrdersData}
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
              savedIsPnlInLeverage={p.savedIsPnlInLeverage}
              isLoading={isPositionsLoading}
              onOrdersClick={() => setListSection(ListSection.Orders)}
              onSelectPositionClick={onSelectPosition}
            />
          )}
          {listSection === ListSection.Orders && (
            <OrderList
              positionsData={aggregatedPositionsData}
              ordersData={aggregatedOrdersData}
              isLoading={isOrdersLoading}
              selectedOrdersKeys={selectedOrdersKeys}
              setSelectedOrdersKeys={setSelectedOrdersKeys}
            />
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
