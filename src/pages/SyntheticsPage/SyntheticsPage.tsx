import { Plural, Trans, t } from "@lingui/macro";
import cx from "classnames";
import Checkbox from "components/Checkbox/Checkbox";
import Footer from "components/Footer/Footer";
import { Claims } from "components/Synthetics/Claims/Claims";
import { OrderList } from "components/Synthetics/OrderList/OrderList";
import { PositionEditor } from "components/Synthetics/PositionEditor/PositionEditor";
import { PositionList } from "components/Synthetics/PositionList/PositionList";
import { PositionSeller } from "components/Synthetics/PositionSeller/PositionSeller";
import { TVChart } from "components/Synthetics/TVChart/TVChart";
import { TradeBox } from "components/Synthetics/TradeBox/TradeBox";
import { TradeHistory } from "components/Synthetics/TradeHistory/TradeHistory";
import Tab from "components/Tab/Tab";
import { DEFAULT_HIGHER_SLIPPAGE_AMOUNT } from "config/factors";
import { getSyntheticsListSectionKey } from "config/localStorage";
import { cancelOrdersTxn } from "domain/synthetics/orders/cancelOrdersTxn";
import { PositionInfo } from "domain/synthetics/positions";
import { useChainId } from "lib/chains";
import { getPageTitle } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { useCallback, useEffect, useMemo, useState } from "react";

import Helmet from "react-helmet";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useSubaccount, useSubaccountCancelOrdersDetailsMessage } from "context/SubaccountContext/SubaccountContext";
import { useCalcSelector } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useClosingPositionKeyState } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useOrderErrorsCount } from "context/SyntheticsStateContext/hooks/orderHooks";
import { selectChartToken } from "context/SyntheticsStateContext/selectors/chartSelectors";
import { selectClaimablesCount } from "context/SyntheticsStateContext/selectors/claimsSelectors";
import { selectPositionsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectOrdersCount } from "context/SyntheticsStateContext/selectors/orderSelectors";
import { selectTradeboxSetActivePosition } from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets";
import { TradeMode } from "domain/synthetics/trade";
import { useTradeParamsProcessor } from "domain/synthetics/trade/useTradeParamsProcessor";
import { getMidPrice } from "domain/tokens";
import { helperToast } from "lib/helperToast";
import { usePendingTxns } from "lib/usePendingTxns";
import useWallet from "lib/wallets/useWallet";

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
  const { signer, account } = useWallet();
  const calcSelector = useCalcSelector();
  const [, setPendingTxns] = usePendingTxns();

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

  const chartToken = useSelector(selectChartToken);

  const [gettingPendingFeePositionKeys, setGettingPendingFeePositionKeys] = useState<string[]>([]);

  const [selectedOrdersKeys, setSelectedOrdersKeys] = useState<{ [key: string]: boolean }>({});
  const selectedOrdersKeysArr = Object.keys(selectedOrdersKeys).filter((key) => selectedOrdersKeys[key]);
  const [isCancelOrdersProcessig, setIsCancelOrdersProcessig] = useState(false);
  const { errors: ordersErrorsCount, warnings: ordersWarningsCount } = useOrderErrorsCount();
  const ordersCount = useSelector(selectOrdersCount);
  const positionsCount = useSelector((s) => Object.keys(selectPositionsInfoData(s) || {}).length);
  const totalClaimables = useSelector(selectClaimablesCount);

  const subaccount = useSubaccount(null, selectedOrdersKeysArr.length);
  const cancelOrdersDetailsMessage = useSubaccountCancelOrdersDetailsMessage(undefined, selectedOrdersKeysArr.length);

  const { savedAllowedSlippage, shouldShowPositionLines, setShouldShowPositionLines } = useSettings();

  const [isHigherSlippageAllowed, setIsHigherSlippageAllowed] = useState(false);
  let allowedSlippage = savedAllowedSlippage!;
  if (isHigherSlippageAllowed) {
    allowedSlippage = DEFAULT_HIGHER_SLIPPAGE_AMOUNT;
  }

  const onCancelOrdersClick = useCallback(() => {
    if (!signer) return;
    setIsCancelOrdersProcessig(true);
    cancelOrdersTxn(chainId, signer, subaccount, {
      orderKeys: selectedOrdersKeysArr,
      setPendingTxns: setPendingTxns,
      detailsMsg: cancelOrdersDetailsMessage,
    })
      .then(async (tx) => {
        const receipt = await tx.wait();
        if (receipt.status === 1) {
          setSelectedOrdersKeys({});
        }
      })
      .finally(() => {
        setIsCancelOrdersProcessig(false);
      });
  }, [cancelOrdersDetailsMessage, chainId, selectedOrdersKeysArr, setPendingTxns, signer, subaccount]);

  const [selectedPositionOrderKey, setSelectedPositionOrderKey] = useState<string>();

  const handlePositionListOrdersClick = useCallback(
    (key?: string) => {
      setListSection(ListSection.Orders);
      setSelectedPositionOrderKey(key);
      if (key) {
        setSelectedOrdersKeys((prev) => ({ ...prev, [key]: true }));
      }
    },
    [setListSection]
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

  const handleSettlePositionFeesClick = useCallback((positionKey: PositionInfo["key"]) => {
    setGettingPendingFeePositionKeys((keys) => keys.concat(positionKey).filter((x, i, self) => self.indexOf(x) === i));
    setIsSettling(true);
  }, []);

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
        gettingPendingFeePositionKeys={gettingPendingFeePositionKeys}
        setGettingPendingFeePositionKeys={setGettingPendingFeePositionKeys}
        setPendingTxns={setPendingTxns}
        allowedSlippage={allowedSlippage}
      />
    );
  }

  const handleTabChange = useCallback((section) => setListSection(section), [setListSection]);

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

          <div className="Exchange-lists large">
            <div className="Exchange-list-tab-container">
              <Tab
                options={tabOptions}
                optionLabels={tabLabels}
                option={listSection}
                onChange={handleTabChange}
                type="inline"
                className="Exchange-list-tabs"
              />
              <div className="align-right Exchange-should-show-position-lines">
                {listSection === ListSection.Orders && selectedOrdersKeysArr.length > 0 && (
                  <button
                    className="muted cancel-order-btn text-15"
                    disabled={isCancelOrdersProcessig}
                    type="button"
                    onClick={onCancelOrdersClick}
                  >
                    <Plural value={selectedOrdersKeysArr.length} one="Cancel order" other="Cancel # orders" />
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
                onSettlePositionFeesClick={handleSettlePositionFeesClick}
                onSelectPositionClick={onSelectPositionClick}
                onClosePositionClick={setClosingPositionKey}
                openSettings={openSettings}
              />
            )}
            {listSection === ListSection.Orders && (
              <OrderList
                selectedOrdersKeys={selectedOrdersKeys}
                setSelectedOrdersKeys={setSelectedOrdersKeys}
                setPendingTxns={setPendingTxns}
                selectedPositionOrderKey={selectedPositionOrderKey}
                setSelectedPositionOrderKey={setSelectedPositionOrderKey}
              />
            )}
            {listSection === ListSection.Trades && <TradeHistory account={account} shouldShowPaginationButtons />}
            {listSection === ListSection.Claims && renderClaims()}
          </div>
        </div>

        <div className="Exchange-right">
          <div className="Exchange-swap-box">
            <TradeBox
              allowedSlippage={allowedSlippage!}
              isHigherSlippageAllowed={isHigherSlippageAllowed}
              setIsHigherSlippageAllowed={setIsHigherSlippageAllowed}
              setPendingTxns={setPendingTxns}
            />
          </div>
        </div>

        <div className="Exchange-lists small min-w-0">
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
              onSettlePositionFeesClick={handleSettlePositionFeesClick}
              openSettings={openSettings}
            />
          )}
          {listSection === ListSection.Orders && (
            <OrderList
              selectedOrdersKeys={selectedOrdersKeys}
              setSelectedOrdersKeys={setSelectedOrdersKeys}
              setPendingTxns={setPendingTxns}
              selectedPositionOrderKey={selectedPositionOrderKey}
              setSelectedPositionOrderKey={setSelectedPositionOrderKey}
            />
          )}
          {listSection === ListSection.Trades && <TradeHistory account={account} shouldShowPaginationButtons />}
          {listSection === ListSection.Claims && renderClaims()}
        </div>
      </div>

      <PositionSeller
        setPendingTxns={setPendingTxns}
        isHigherSlippageAllowed={isHigherSlippageAllowed}
        setIsHigherSlippageAllowed={setIsHigherSlippageAllowed}
      />

      <PositionEditor allowedSlippage={allowedSlippage} setPendingTxns={setPendingTxns} />

      <Footer />
    </div>
  );
}
