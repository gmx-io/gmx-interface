import { Plural, Trans, t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import cx from "classnames";
import Checkbox from "components/Checkbox/Checkbox";
import Footer from "components/Footer/Footer";
import { OrderList } from "components/Synthetics/OrderList/OrderList";
import { PositionEditor } from "components/Synthetics/PositionEditor/PositionEditor";
import { PositionList } from "components/Synthetics/PositionList/PositionList";
import { PositionSeller } from "components/Synthetics/PositionSeller/PositionSeller";
import { TVChart } from "components/Synthetics/TVChart/TVChart";
import { TradeBox } from "components/Synthetics/Trade/TradeBox/TradeBox";
import Tab from "components/Tab/Tab";
import {
  SYNTHETICS_TRADE_COLLATERAL_KEY,
  SYNTHETICS_TRADE_MARKET_KEY,
  SYNTHETICS_TRADE_TYPE_KEY,
} from "config/localStorage";
import { cancelOrdersTxn } from "domain/synthetics/orders/cancelOrdersTxn";
import { useAggregatedOrdersData } from "domain/synthetics/orders/useAggregatedOrdersData";
import { getPosition, getPositionKey } from "domain/synthetics/positions";
import { useAggregatedPositionsData } from "domain/synthetics/positions/useAggregatedPositionsData";
import { TradeType } from "domain/synthetics/trade/types";
import { useChainId } from "lib/chains";
import { useLocalStorageByChainId, useLocalStorageSerializeKey } from "lib/localStorage";
import { useMemo, useState } from "react";
import { convertTokenAddress, getToken } from "config/tokens";
import { getMarket, useMarketsData } from "domain/synthetics/markets";
import { getTokenData, useAvailableTokensData } from "domain/synthetics/tokens";
import { useAvailableSwapOptions } from "domain/synthetics/trade";

import "./SyntheticsPage.scss";

type Props = {
  onConnectWallet: () => void;
  savedIsPnlInLeverage: boolean;
  shouldDisableValidation: boolean;
  savedShouldShowPositionLines: boolean;
  setSavedShouldShowPositionLines: (value: boolean) => void;
  setPendingTxns: (txns: any) => void;
};

enum ListSection {
  Positions = "Positions",
  Orders = "Orders",
}

export function SyntheticsPage(p: Props) {
  const { chainId } = useChainId();
  const { library, account } = useWeb3React();
  const [listSection, setListSection] = useLocalStorageByChainId(chainId, "List-section-v3", ListSection.Positions);
  const { marketsData } = useMarketsData(chainId);
  const { tokensData } = useAvailableTokensData(chainId);

  const [selectedMarketAddress, setSelectedMarketAddress] = useLocalStorageSerializeKey<string | undefined>(
    [chainId, SYNTHETICS_TRADE_MARKET_KEY],
    undefined
  );

  const selectedMarket = getMarket(marketsData, selectedMarketAddress);
  const selectedIndexToken = getTokenData(tokensData, selectedMarket?.indexTokenAddress, "native");

  const [selectedToTokenAddress, setSelectedToTokenAddress] = useState<string>();

  const { availableIndexTokens } = useAvailableSwapOptions({});

  const [selectedCollateralAddress, setSelectedCollateralAddress] = useLocalStorageSerializeKey<string | undefined>(
    [chainId, SYNTHETICS_TRADE_COLLATERAL_KEY],
    undefined
  );

  const [selectedTradeType, setSelectedTradeType] = useLocalStorageSerializeKey(
    [chainId, SYNTHETICS_TRADE_TYPE_KEY],
    TradeType.Long
  );

  const [closingPositionKey, setClosingPositionKey] = useState<string>();
  const [editingPositionKey, setEditingPositionKey] = useState<string>();

  const [selectedOrdersKeys, setSelectedOrdersKeys] = useState<{ [key: string]: boolean }>({});
  const [isCancelOrdersProcessig, setIsCancelOrdersProcessig] = useState(false);

  const { aggregatedPositionsData, isLoading: isPositionsLoading } = useAggregatedPositionsData(chainId, {
    savedIsPnlInLeverage: p.savedIsPnlInLeverage,
  });

  const { aggregatedOrdersData, isLoading: isOrdersLoading } = useAggregatedOrdersData(chainId);

  const positionsCount = Object.keys(aggregatedPositionsData).length;
  const ordersCount = Object.keys(aggregatedOrdersData).length;
  const selectedOrdersKeysArr = Object.keys(selectedOrdersKeys).filter((key) => selectedOrdersKeys[key]);

  const selectedPosition = useMemo(() => {
    const positionKey = getPositionKey(
      account,
      selectedMarketAddress,
      selectedCollateralAddress,
      selectedTradeType === TradeType.Long
    );
    return getPosition(aggregatedPositionsData, positionKey);
  }, [account, aggregatedPositionsData, selectedCollateralAddress, selectedMarketAddress, selectedTradeType]);

  const closingPosition = getPosition(aggregatedPositionsData, closingPositionKey);
  const editingPosition = getPosition(aggregatedPositionsData, editingPositionKey);

  function onCancelOrdersClick() {
    setIsCancelOrdersProcessig(true);
    cancelOrdersTxn(chainId, library, {
      orderKeys: selectedOrdersKeysArr,
      setPendingTxns: p.setPendingTxns,
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

  function onSelectIndexToken(tokenAddress: string) {
    const market = Object.values(marketsData).find(
      (market) =>
        convertTokenAddress(chainId, market.indexTokenAddress, "native") ===
        convertTokenAddress(chainId, tokenAddress, "native")
    );

    if (market) {
      setSelectedMarketAddress(market.marketTokenAddress);
    }
  }

  return (
    <div className="SyntheticsTrade page-layout">
      <div className="SyntheticsTrade-content">
        <div className="SyntheticsTrade-left">
          <TVChart
            savedShouldShowPositionLines={p.savedShouldShowPositionLines}
            ordersData={aggregatedOrdersData}
            positionsData={aggregatedPositionsData}
            chartTokenAddress={
              selectedTradeType === TradeType.Swap ? selectedToTokenAddress : selectedIndexToken?.address
            }
            availableTokens={
              selectedTradeType === TradeType.Swap && selectedToTokenAddress
                ? [getToken(chainId, selectedToTokenAddress)]
                : availableIndexTokens
            }
            onSelectChartTokenAddress={onSelectIndexToken}
            disableSelectToken={selectedTradeType === TradeType.Swap}
          />

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
                <Checkbox
                  isChecked={p.savedShouldShowPositionLines}
                  setIsChecked={p.setSavedShouldShowPositionLines}
                  className={cx("muted chart-positions", { active: p.savedShouldShowPositionLines })}
                >
                  <span>
                    <Trans>Chart positions</Trans>
                  </span>
                </Checkbox>
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
                onClosePositionClick={setClosingPositionKey}
                onEditCollateralClick={setEditingPositionKey}
              />
            )}

            {listSection === ListSection.Orders && (
              <OrderList
                positionsData={aggregatedPositionsData}
                selectedOrdersKeys={selectedOrdersKeys}
                setSelectedOrdersKeys={setSelectedOrdersKeys}
                ordersData={aggregatedOrdersData}
                isLoading={isOrdersLoading}
                setPendingTxns={p.setPendingTxns}
              />
            )}
          </div>
        </div>

        <div className="SyntheticsTrade-right">
          <div className="SyntheticsTrade-swap-box">
            <TradeBox
              selectedTradeType={selectedTradeType}
              selectedMarketAddress={selectedMarketAddress}
              selectedToTokenAddress={selectedToTokenAddress}
              setSelectedToTokenAddress={setSelectedToTokenAddress}
              selectedCollateralAddress={selectedCollateralAddress}
              existingPosition={selectedPosition}
              onSelectTradeType={setSelectedTradeType}
              onSelectMarketAddress={setSelectedMarketAddress}
              onSelectCollateralAddress={setSelectedCollateralAddress}
              onConnectWallet={p.onConnectWallet}
              savedIsPnlInLeverage={p.savedIsPnlInLeverage}
              shouldDisableValidation={p.shouldDisableValidation}
              ordersData={aggregatedOrdersData}
              setPendingTxns={p.setPendingTxns}
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
              onClosePositionClick={setClosingPositionKey}
              onEditCollateralClick={setEditingPositionKey}
            />
          )}
          {listSection === ListSection.Orders && (
            <OrderList
              positionsData={aggregatedPositionsData}
              ordersData={aggregatedOrdersData}
              isLoading={isOrdersLoading}
              selectedOrdersKeys={selectedOrdersKeys}
              setSelectedOrdersKeys={setSelectedOrdersKeys}
              setPendingTxns={p.setPendingTxns}
            />
          )}
        </div>
      </div>

      <PositionSeller
        savedIsPnlInLeverage={p.savedIsPnlInLeverage}
        position={closingPosition}
        onClose={() => setClosingPositionKey(undefined)}
        setPendingTxns={p.setPendingTxns}
      />

      <PositionEditor
        savedIsPnlInLeverage={p.savedIsPnlInLeverage}
        position={editingPosition}
        onClose={() => setEditingPositionKey(undefined)}
        setPendingTxns={p.setPendingTxns}
      />

      {/* {sharingPosition && (
        <PositionShare
          isPositionShareModalOpen={true}
          setIsPositionShareModalOpen={() => setSharingPositionKey(undefined)}
          positionToShare={sharingPosition}
          chainId={chainId}
          account={account}
        />
      )} */}
      <Footer />
    </div>
  );
}
