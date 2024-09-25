import { Plural, t, Trans } from "@lingui/macro";
import cx from "classnames";
import uniq from "lodash/uniq";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import Helmet from "react-helmet";

import type { MarketFilterLongShortItemData } from "components/Synthetics/TableMarketFilter/MarketFilterLongShort";
import { getSyntheticsListSectionKey } from "config/localStorage";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccount, useSubaccountCancelOrdersDetailsMessage } from "context/SubaccountContext/SubaccountContext";
import { useCalcSelector } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useClosingPositionKeyState } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useCancellingOrdersKeysState } from "context/SyntheticsStateContext/hooks/orderEditorHooks";
import { useOrderErrorsCount } from "context/SyntheticsStateContext/hooks/orderHooks";
import { selectChartToken } from "context/SyntheticsStateContext/selectors/chartSelectors";
import { selectClaimablesCount } from "context/SyntheticsStateContext/selectors/claimsSelectors";
import { selectChainId, selectPositionsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectOrdersCount } from "context/SyntheticsStateContext/selectors/orderSelectors";
import { selectTradeboxSetActivePosition } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { cancelOrdersTxn } from "domain/synthetics/orders/cancelOrdersTxn";
import type { OrderType } from "domain/synthetics/orders/types";
import { TradeMode } from "domain/synthetics/trade";
import { useTradeParamsProcessor } from "domain/synthetics/trade/useTradeParamsProcessor";
import { getMidPrice } from "domain/tokens";
import { useChainId } from "lib/chains";
import { helperToast } from "lib/helperToast";
import { getPageTitle } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatUsd } from "lib/numbers";
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import { usePendingTxns } from "lib/usePendingTxns";
import { useEthersSigner } from "lib/wallets/useEthersSigner";
import useWallet from "lib/wallets/useWallet";

import { NpsModal } from "components/NpsModal/NpsModal";
import Checkbox from "components/Checkbox/Checkbox";
import Footer from "components/Footer/Footer";
import { InterviewModal } from "components/InterviewModal/InterviewModal";
import { Claims } from "components/Synthetics/Claims/Claims";
import { OrderList } from "components/Synthetics/OrderList/OrderList";
import { PositionEditor } from "components/Synthetics/PositionEditor/PositionEditor";
import { PositionList } from "components/Synthetics/PositionList/PositionList";
import { PositionSeller } from "components/Synthetics/PositionSeller/PositionSeller";
import { TVChart } from "components/Synthetics/TVChart/TVChart";
import { TradeBox } from "components/Synthetics/TradeBox/TradeBox";
import { TradeHistory } from "components/Synthetics/TradeHistory/TradeHistory";
import Tab from "components/Tab/Tab";
import { useInterviewNotification } from "domain/synthetics/userFeedback/useInterviewNotification";
import { useMedia } from "react-use";
import { MissedCoinsModal } from "components/MissedCoinsModal/MissedCoinsModal";

export type Props = {
  openSettings: () => void;
};

enum ListSection {
  Positions = "Positions",
  Orders = "Orders",
  Trades = "Trades",
  Claims = "Claims",
}

export function SyntheticsPage(p: Props) {
  const { openSettings } = p;
  const { chainId } = useChainId();
  const { account } = useWallet();
  const calcSelector = useCalcSelector();
  const [, setPendingTxns] = usePendingTxns();

  const isMobile = useMedia("(max-width: 1100px)");

  const [isSettling, setIsSettling] = useState(false);
  const [listSection, setListSection] = useLocalStorageSerializeKey(
    getSyntheticsListSectionKey(chainId),
    ListSection.Positions
  );

  const [, setClosingPositionKeyRaw] = useClosingPositionKeyState();
  const setClosingPositionKey = useCallback(
    (key: string | undefined) => requestAnimationFrame(() => setClosingPositionKeyRaw(key)),
    [setClosingPositionKeyRaw]
  );

  const setActivePosition = useSelector(selectTradeboxSetActivePosition);

  useTradeParamsProcessor();

  const { isInterviewModalVisible, setIsInterviewModalVisible } = useInterviewNotification();

  const chartToken = useSelector(selectChartToken);

  const { errors: ordersErrorsCount, warnings: ordersWarningsCount } = useOrderErrorsCount();
  const ordersCount = useSelector(selectOrdersCount);
  const positionsCount = useSelector((s) => Object.keys(selectPositionsInfoData(s) || {}).length);
  const totalClaimables = useSelector(selectClaimablesCount);

  const { savedAllowedSlippage, shouldShowPositionLines, setShouldShowPositionLines } = useSettings();

  const {
    isCancelOrdersProcessing,
    selectedOrderKeys,
    setSelectedOrderKeys,
    onCancelSelectedOrders,
    onCancelOrder,
    marketsDirectionsFilter,
    setMarketsDirectionsFilter,
    orderTypesFilter,
    setOrderTypesFilter,
  } = useOrdersControl();

  const [selectedPositionOrderKey, setSelectedPositionOrderKey] = useState<string>();

  const handlePositionListOrdersClick = useCallback(
    (positionKey: string, orderKey: string | undefined) => {
      setListSection(ListSection.Orders);
      startTransition(() => {
        setSelectedPositionOrderKey(orderKey);

        if (orderKey) {
          setSelectedOrderKeys([orderKey]);
          setMarketsDirectionsFilter([]);
          setOrderTypesFilter([]);
        }
      });
    },
    [setListSection, setMarketsDirectionsFilter, setOrderTypesFilter, setSelectedOrderKeys]
  );

  useEffect(() => {
    if (!chartToken) return;

    const averagePrice = getMidPrice(chartToken.prices);
    const currentTokenPriceStr =
      formatUsd(averagePrice, {
        displayDecimals: chartToken.priceDecimals,
      }) || "...";

    const title = getPageTitle(
      currentTokenPriceStr +
        ` | ${chartToken?.symbol}${chartToken?.symbol ? " " : ""}${chartToken?.isStable ? "" : "USD"}`
    );
    document.title = title;
  }, [chartToken, chartToken?.address, chartToken?.isStable, chartToken?.symbol]);

  const onSelectPositionClick = useCallback(
    (key: string, tradeMode?: TradeMode) => {
      const positionsInfoData = calcSelector(selectPositionsInfoData);
      const position = getByKey(positionsInfoData, key);

      if (!position) return;

      const indexName = position?.marketInfo && getMarketIndexName(position?.marketInfo);
      const poolName = position?.marketInfo && getMarketPoolName(position?.marketInfo);
      setActivePosition(getByKey(positionsInfoData, key), tradeMode);
      const message = (
        <Trans>
          {position?.isLong ? "Long" : "Short"}{" "}
          <div className="inline-flex">
            <span>{indexName}</span>
            <span className="subtext gm-toast">[{poolName}]</span>
          </div>{" "}
          <span>market selected</span>.
        </Trans>
      );
      helperToast.success(message);
    },
    [calcSelector, setActivePosition]
  );

  const renderOrdersTabTitle = useCallback(() => {
    if (!ordersCount) {
      return (
        <div>
          <Trans>Orders</Trans>
        </div>
      );
    }

    return (
      <div>
        <Trans>Orders</Trans>{" "}
        <span
          className={cx({ negative: ordersErrorsCount > 0, warning: !ordersErrorsCount && ordersWarningsCount > 0 })}
        >
          ({ordersCount})
        </span>
      </div>
    );
  }, [ordersCount, ordersErrorsCount, ordersWarningsCount]);

  const tabLabels = useMemo(
    () => ({
      [ListSection.Positions]: t`Positions${positionsCount ? ` (${positionsCount})` : ""}`,
      [ListSection.Orders]: renderOrdersTabTitle(),
      [ListSection.Trades]: t`Trades`,
      [ListSection.Claims]: totalClaimables > 0 ? t`Claims (${totalClaimables})` : t`Claims`,
    }),
    [positionsCount, renderOrdersTabTitle, totalClaimables]
  );
  const tabOptions = useMemo(() => Object.keys(ListSection), []);

  function renderClaims() {
    return (
      <Claims
        shouldShowPaginationButtons
        setIsSettling={setIsSettling}
        isSettling={isSettling}
        setPendingTxns={setPendingTxns}
        allowedSlippage={savedAllowedSlippage}
      />
    );
  }

  const handleTabChange = useCallback(
    (section: ListSection) => {
      setListSection(section);
      startTransition(() => {
        setOrderTypesFilter([]);
        setMarketsDirectionsFilter([]);
        setSelectedOrderKeys([]);
        setSelectedPositionOrderKey(undefined);
      });
    },
    [setListSection, setMarketsDirectionsFilter, setOrderTypesFilter, setSelectedOrderKeys]
  );

  return (
    <div className="Exchange page-layout">
      <Helmet>
        <style type="text/css">
          {`
            :root {
              --main-bg-color: #08091b;
             {
         `}
        </style>
      </Helmet>
      <div className="Exchange-content">
        <div className="Exchange-left">
          <TVChart />
          {!isMobile && (
            <div className="Exchange-lists large" data-qa="trade-table-large">
              <div className="Exchange-list-tab-container">
                <Tab
                  options={tabOptions}
                  optionLabels={tabLabels}
                  option={listSection}
                  onChange={handleTabChange}
                  type="inline"
                  className="Exchange-list-tabs"
                  qa="exchange-list-tabs"
                />
                <div className="align-right Exchange-should-show-position-lines">
                  {listSection === ListSection.Orders && selectedOrderKeys.length > 0 && (
                    <button
                      className="muted cancel-order-btn text-15"
                      disabled={isCancelOrdersProcessing}
                      type="button"
                      onClick={onCancelSelectedOrders}
                    >
                      <Plural value={selectedOrderKeys.length} one="Cancel order" other="Cancel # orders" />
                    </button>
                  )}
                  <Checkbox
                    isChecked={shouldShowPositionLines}
                    setIsChecked={setShouldShowPositionLines}
                    className={cx("muted chart-positions", { active: shouldShowPositionLines })}
                  >
                    <span>
                      <Trans>Chart positions</Trans>
                    </span>
                  </Checkbox>
                </div>
              </div>

              {listSection === ListSection.Positions && (
                <PositionList
                  onOrdersClick={handlePositionListOrdersClick}
                  onSelectPositionClick={onSelectPositionClick}
                  onClosePositionClick={setClosingPositionKey}
                  openSettings={openSettings}
                  onCancelOrder={onCancelOrder}
                />
              )}
              {listSection === ListSection.Orders && (
                <OrderList
                  selectedOrdersKeys={selectedOrderKeys}
                  setSelectedOrderKeys={setSelectedOrderKeys}
                  setPendingTxns={setPendingTxns}
                  selectedPositionOrderKey={selectedPositionOrderKey}
                  setSelectedPositionOrderKey={setSelectedPositionOrderKey}
                  marketsDirectionsFilter={marketsDirectionsFilter}
                  setMarketsDirectionsFilter={setMarketsDirectionsFilter}
                  orderTypesFilter={orderTypesFilter}
                  setOrderTypesFilter={setOrderTypesFilter}
                  onCancelSelectedOrders={onCancelSelectedOrders}
                />
              )}
              {listSection === ListSection.Trades && <TradeHistory account={account} shouldShowPaginationButtons />}
              {listSection === ListSection.Claims && renderClaims()}
            </div>
          )}
        </div>

        <div className="Exchange-right">
          <div className="Exchange-swap-box">
            <TradeBox setPendingTxns={setPendingTxns} />
          </div>
        </div>

        {isMobile && (
          <div className="Exchange-lists small min-w-0" data-qa="trade-table-small">
            <div className="Exchange-list-tab-container">
              <Tab
                options={tabOptions}
                optionLabels={tabLabels}
                option={listSection}
                onChange={handleTabChange}
                type="inline"
                className="Exchange-list-tabs"
              />
            </div>
            {listSection === ListSection.Positions && (
              <PositionList
                onOrdersClick={handlePositionListOrdersClick}
                onSelectPositionClick={onSelectPositionClick}
                onClosePositionClick={setClosingPositionKey}
                openSettings={openSettings}
                onCancelOrder={onCancelOrder}
              />
            )}
            {listSection === ListSection.Orders && (
              <OrderList
                selectedOrdersKeys={selectedOrderKeys}
                setSelectedOrderKeys={setSelectedOrderKeys}
                setPendingTxns={setPendingTxns}
                selectedPositionOrderKey={selectedPositionOrderKey}
                setSelectedPositionOrderKey={setSelectedPositionOrderKey}
                marketsDirectionsFilter={marketsDirectionsFilter}
                setMarketsDirectionsFilter={setMarketsDirectionsFilter}
                orderTypesFilter={orderTypesFilter}
                setOrderTypesFilter={setOrderTypesFilter}
                onCancelSelectedOrders={onCancelSelectedOrders}
              />
            )}
            {listSection === ListSection.Trades && <TradeHistory account={account} shouldShowPaginationButtons />}
            {listSection === ListSection.Claims && renderClaims()}
          </div>
        )}
      </div>

      <PositionSeller setPendingTxns={setPendingTxns} />

      <PositionEditor allowedSlippage={savedAllowedSlippage} setPendingTxns={setPendingTxns} />

      <InterviewModal isVisible={isInterviewModalVisible} setIsVisible={setIsInterviewModalVisible} />
      <NpsModal />
      <MissedCoinsModal />
      <Footer />
    </div>
  );
}

function useOrdersControl() {
  const chainId = useSelector(selectChainId);
  const signer = useEthersSigner();
  const [cancellingOrdersKeys, setCanellingOrdersKeys] = useCancellingOrdersKeysState();
  const [, setPendingTxns] = usePendingTxns();
  const [selectedOrderKeys, setSelectedOrderKeys] = useState<string[]>(EMPTY_ARRAY);
  const cancelOrdersDetailsMessage = useSubaccountCancelOrdersDetailsMessage(undefined, selectedOrderKeys.length);
  const subaccount = useSubaccount(null, selectedOrderKeys.length);
  const isCancelOrdersProcessing = cancellingOrdersKeys.length > 0;

  const [marketsDirectionsFilter, setMarketsDirectionsFilter] = useState<MarketFilterLongShortItemData[]>([]);
  const [orderTypesFilter, setOrderTypesFilter] = useState<OrderType[]>([]);

  const onCancelSelectedOrders = useCallback(
    function cancelSelectedOrders() {
      if (!signer) return;
      const keys = selectedOrderKeys;
      setCanellingOrdersKeys((p) => uniq(p.concat(keys)));
      cancelOrdersTxn(chainId, signer, subaccount, {
        orderKeys: keys,
        setPendingTxns: setPendingTxns,
        detailsMsg: cancelOrdersDetailsMessage,
      })
        .then(async (tx) => {
          const receipt = await tx.wait();
          if (receipt.status === 1) {
            setSelectedOrderKeys(EMPTY_ARRAY);
          }
        })
        .finally(() => {
          setCanellingOrdersKeys((p) => p.filter((e) => !keys.includes(e)));
        });
    },
    [cancelOrdersDetailsMessage, chainId, selectedOrderKeys, setCanellingOrdersKeys, setPendingTxns, signer, subaccount]
  );

  const onCancelOrder = useCallback(
    function cancelOrder(key: string) {
      if (!signer) return;

      setCanellingOrdersKeys((p) => uniq(p.concat(key)));
      cancelOrdersTxn(chainId, signer, subaccount, {
        orderKeys: [key],
        setPendingTxns: setPendingTxns,
        detailsMsg: cancelOrdersDetailsMessage,
      }).finally(() => {
        setCanellingOrdersKeys((prev) => prev.filter((k) => k !== key));
        setSelectedOrderKeys((prev) => prev.filter((k) => k !== key));
      });
    },
    [cancelOrdersDetailsMessage, chainId, setCanellingOrdersKeys, setPendingTxns, signer, subaccount]
  );

  return {
    isCancelOrdersProcessing,
    onCancelSelectedOrders,
    onCancelOrder,
    selectedOrderKeys,
    setSelectedOrderKeys,
    marketsDirectionsFilter,
    setMarketsDirectionsFilter,
    orderTypesFilter,
    setOrderTypesFilter,
  };
}
