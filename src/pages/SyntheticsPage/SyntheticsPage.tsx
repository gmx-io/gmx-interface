import { Plural, t, Trans } from "@lingui/macro";
import cx from "classnames";
import uniq from "lodash/uniq";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { getSyntheticsListSectionKey } from "config/localStorage";
import { usePendingTxns } from "context/PendingTxnsContext/PendingTxnsContext";
import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useClosingPositionKeyState, useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { useCancellingOrdersKeysState } from "context/SyntheticsStateContext/hooks/orderEditorHooks";
import { useOrderErrorsCount } from "context/SyntheticsStateContext/hooks/orderHooks";
import { selectChartToken } from "context/SyntheticsStateContext/selectors/chartSelectors";
import { selectClaimablesCount } from "context/SyntheticsStateContext/selectors/claimsSelectors";
import { selectExpressGlobalParams } from "context/SyntheticsStateContext/selectors/expressSelectors";
import {
  selectChainId,
  selectOrdersInfoData,
  selectPositionsInfoData,
} from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectOrdersCount } from "context/SyntheticsStateContext/selectors/orderSelectors";
import {
  selectTradeboxMaxLiquidityPath,
  selectTradeboxSetActivePosition,
  selectTradeboxState,
  selectTradeboxTradeFlags,
} from "context/SyntheticsStateContext/selectors/tradeboxSelectors";
import { useCalcSelector } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { estimateBatchExpressParams } from "domain/synthetics/express/expressOrderUtils";
import { useExternalSwapHandler } from "domain/synthetics/externalSwaps/useExternalSwapHandler";
import { OrderTypeFilterValue } from "domain/synthetics/orders/ordersFilters";
import { sendBatchOrderTxn } from "domain/synthetics/orders/sendBatchOrderTxn";
import type { OrderInfo } from "domain/synthetics/orders/types";
import { useOrderTxnCallbacks } from "domain/synthetics/orders/useOrderTxnCallbacks";
import { useSetOrdersAutoCancelByQueryParams } from "domain/synthetics/orders/useSetOrdersAutoCancelByQueryParams";
import { TradeMode } from "domain/synthetics/trade";
import { useTradeParamsProcessor } from "domain/synthetics/trade/useTradeParamsProcessor";
import { useInterviewNotification } from "domain/synthetics/userFeedback/useInterviewNotification";
import { getMidPrice } from "domain/tokens";
import { useBreakpoints } from "lib/breakpoints";
import { useChainId } from "lib/chains";
import { defined } from "lib/guards";
import { getPageTitle } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { useMeasureComponentMountTime } from "lib/metrics/useMeasureComponentMountTime";
import { formatUsdPrice } from "lib/numbers";
import { EMPTY_ARRAY, getByKey } from "lib/objects";
import { useEthersSigner } from "lib/wallets/useEthersSigner";
import useWallet from "lib/wallets/useWallet";
import { getTokenVisualMultiplier } from "sdk/configs/tokens";
import { getOrderKeys } from "sdk/utils/orders";

import { AppHeader } from "components/AppHeader/AppHeader";
import Badge, { BadgeIndicator } from "components/Badge/Badge";
import Checkbox from "components/Checkbox/Checkbox";
import { InterviewModal } from "components/InterviewModal/InterviewModal";
import { NpsModal } from "components/NpsModal/NpsModal";
import { OneClickPromoBanner } from "components/OneClickPromoBanner/OneClickPromoBanner";
import { Claims } from "components/Synthetics/Claims/Claims";
import { useClaimsHistoryState } from "components/Synthetics/Claims/ClaimsHistory";
import { OrderList } from "components/Synthetics/OrderList/OrderList";
import { PositionEditor } from "components/Synthetics/PositionEditor/PositionEditor";
import { PositionList } from "components/Synthetics/PositionList/PositionList";
import { PositionSeller } from "components/Synthetics/PositionSeller/PositionSeller";
import { SwapCard } from "components/Synthetics/SwapCard/SwapCard";
import type { MarketFilterLongShortItemData } from "components/Synthetics/TableMarketFilter/MarketFilterLongShort";
import { useIsCurtainOpen } from "components/Synthetics/TradeBox/Curtain";
import { TradeBoxResponsiveContainer } from "components/Synthetics/TradeBox/TradeBoxResponsiveContainer";
import { TradeHistory, useTradeHistoryState } from "components/Synthetics/TradeHistory/TradeHistory";
import { Chart } from "components/Synthetics/TVChart/Chart";
import ChartHeader from "components/Synthetics/TVChart/ChartHeader";
import Tabs from "components/Tabs/Tabs";

import logoIcon from "img/logo-icon.svg";
import logoText from "img/logo-text.svg";

export type Props = {
  openSettings: () => void;
};

enum ListSection {
  Positions = "Positions",
  Orders = "Orders",
  Trades = "Trades",
  Claims = "Claims",
}

const TAB_CLASSNAME = {
  active: "border-b-2 border-b-blue-300 mb-[-1.5px]",
  regular: "border-b-2 border-b-[transparent] mb-[-1.5px]",
};

export function SyntheticsPage(p: Props) {
  const { openSettings } = p;
  const { chainId } = useChainId();
  const { account } = useWallet();
  const calcSelector = useCalcSelector();
  const { setPendingTxns } = usePendingTxns();

  useExternalSwapHandler();

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
  useSetOrdersAutoCancelByQueryParams();

  const { isInterviewModalVisible, setIsInterviewModalVisible } = useInterviewNotification();

  const { chartToken } = useSelector(selectChartToken);

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

  const { maxLiquidity: swapOutLiquidity } = useSelector(selectTradeboxMaxLiquidityPath);
  const tokensData = useTokensData();
  const { fromTokenAddress, toTokenAddress } = useSelector(selectTradeboxState);
  const fromToken = getByKey(tokensData, fromTokenAddress);
  const toToken = getByKey(tokensData, toTokenAddress);

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

  const { isSwap, isTwap } = useSelector(selectTradeboxTradeFlags);

  useEffect(() => {
    if (!chartToken) return;

    const averagePrice = getMidPrice(chartToken.prices);
    const currentTokenPriceStr =
      formatUsdPrice(averagePrice, {
        visualMultiplier: isSwap ? 1 : chartToken.visualMultiplier,
      }) || "...";

    const prefix = isSwap ? "" : getTokenVisualMultiplier(chartToken);

    const title = getPageTitle(
      currentTokenPriceStr +
        ` | ${prefix}${chartToken?.symbol}${chartToken?.symbol ? " " : ""}${chartToken?.isStable ? "" : "USD"}`
    );
    document.title = title;
  }, [chartToken, isSwap]);

  const [, setIsCurtainOpen] = useIsCurtainOpen();

  const onSelectPositionClick = useCallback(
    (key: string, tradeMode?: TradeMode, showCurtain = false) => {
      const positionsInfoData = calcSelector(selectPositionsInfoData);
      const position = getByKey(positionsInfoData, key);

      if (!position) return;

      setActivePosition(getByKey(positionsInfoData, key), tradeMode);
      if (showCurtain) {
        setIsCurtainOpen(true);
      }
    },
    [calcSelector, setActivePosition, setIsCurtainOpen]
  );

  const renderOrdersTabTitle = useCallback(() => {
    if (!ordersCount) {
      return (
        <div>
          <Trans>Orders</Trans>
        </div>
      );
    }

    let indicator: BadgeIndicator | undefined = undefined;

    if (ordersWarningsCount > 0 && !ordersErrorsCount) {
      indicator = "warning";
    }

    if (ordersErrorsCount > 0) {
      indicator = "error";
    }

    return (
      <div className="flex gap-4">
        <Trans>Orders</Trans>
        <Badge value={ordersCount} indicator={indicator} />
      </div>
    );
  }, [ordersCount, ordersErrorsCount, ordersWarningsCount]);

  const tabLabels = useMemo(
    () => ({
      [ListSection.Positions]: (
        <div className="flex gap-4">
          <Trans>Positions</Trans>
          <Badge value={positionsCount} />
        </div>
      ),
      [ListSection.Orders]: renderOrdersTabTitle(),
      [ListSection.Trades]: t`Trades`,
      [ListSection.Claims]:
        totalClaimables > 0 ? (
          <div className="flex gap-4">
            <Trans>Claims</Trans>
            <Badge value={totalClaimables} />
          </div>
        ) : (
          t`Claims`
        ),
    }),
    [positionsCount, renderOrdersTabTitle, totalClaimables]
  );
  const tabsOptions = useMemo(
    () =>
      Object.values(ListSection).map((value) => ({
        value,
        label: tabLabels[value],
        className: TAB_CLASSNAME,
      })),
    [tabLabels]
  );

  const { controls: claimsHistoryControls, ...claimsHistoryProps } = useClaimsHistoryState();

  function renderClaims() {
    return (
      <Claims
        setIsSettling={setIsSettling}
        isSettling={isSettling}
        setPendingTxns={setPendingTxns}
        allowedSlippage={savedAllowedSlippage}
        claimsHistoryProps={claimsHistoryProps}
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

  useMeasureComponentMountTime({ metricType: "syntheticsPage", onlyForLocation: "#/trade" });

  const tradeHistoryState = useTradeHistoryState({
    account,
  });

  const { isTablet, isMobile } = useBreakpoints();

  const actions = (
    <div className="flex shrink-0 items-center gap-16 px-12">
      {listSection === ListSection.Orders && selectedOrderKeys.length > 0 && (
        <button
          className="text-[13px] font-medium text-slate-100 hover:text-slate-400"
          disabled={isCancelOrdersProcessing}
          type="button"
          onClick={onCancelSelectedOrders}
        >
          <Plural value={selectedOrderKeys.length} one="Cancel order" other="Cancel # orders" />
        </button>
      )}
      {[ListSection.Positions, ListSection.Orders].includes(listSection as ListSection) && (
        <Checkbox
          isChecked={shouldShowPositionLines}
          setIsChecked={setShouldShowPositionLines}
          className={cx("muted chart-positions text-[13px]", { active: shouldShowPositionLines })}
        >
          <span className="font-medium">
            <Trans>Chart positions</Trans>
          </span>
        </Checkbox>
      )}
      {listSection === ListSection.Trades && tradeHistoryState.controls}
      {listSection === ListSection.Claims && claimsHistoryControls}
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <AppHeader
        leftContent={
          isTablet ? (
            <Link to="/" className="flex items-center gap-5 p-8 max-md:p-[4.5px]">
              <img src={logoIcon} alt="GMX Logo" />
              <img src={logoText} className="max-md:hidden" alt="GMX Logo" />
            </Link>
          ) : (
            <ChartHeader />
          )
        }
      />

      {isTablet ? <ChartHeader /> : null}
      <div className="grid grow grid-cols-[1fr_auto] gap-8 pt-0 max-[1024px]:grid-cols-1">
        {isTablet && <OneClickPromoBanner openSettings={openSettings} />}
        <div className="Exchange-left flex flex-col gap-8">
          <Chart />
          {!isTablet && (
            <div className="Exchange-lists large" data-qa="trade-table-large">
              <div className="">
                <Tabs
                  options={tabsOptions}
                  selectedValue={listSection}
                  onChange={handleTabChange}
                  type="block"
                  className="border-b-[1.5px] border-slate-600 bg-slate-900"
                  qa="exchange-list-tabs"
                  rightContent={actions}
                />
                <div className="align-right Exchange-should-show-position-lines"></div>
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
                  selectedPositionOrderKey={selectedPositionOrderKey}
                  setSelectedPositionOrderKey={setSelectedPositionOrderKey}
                  marketsDirectionsFilter={marketsDirectionsFilter}
                  setMarketsDirectionsFilter={setMarketsDirectionsFilter}
                  orderTypesFilter={orderTypesFilter}
                  setOrderTypesFilter={setOrderTypesFilter}
                  onCancelSelectedOrders={onCancelSelectedOrders}
                />
              )}
              {listSection === ListSection.Trades && <TradeHistory {...tradeHistoryState} />}
              {listSection === ListSection.Claims && renderClaims()}
            </div>
          )}
        </div>

        {isTablet ? (
          <>
            <div className="absolute">
              <TradeBoxResponsiveContainer />
            </div>
            {isSwap && !isTwap && (
              <SwapCard maxLiquidityUsd={swapOutLiquidity} fromToken={fromToken} toToken={toToken} />
            )}
          </>
        ) : (
          <div className="w-[40rem] max-[1400px]:w-[36rem] min-[1501px]:w-[41.85rem]">
            <TradeBoxResponsiveContainer />

            <div className="mt-12 flex flex-col gap-12">
              {isSwap && !isTwap && (
                <SwapCard maxLiquidityUsd={swapOutLiquidity} fromToken={fromToken} toToken={toToken} />
              )}
            </div>
          </div>
        )}

        {isTablet && (
          <div className="flex w-full flex-col" data-qa="trade-table-small">
            <div className="overflow-x-auto scrollbar-hide">
              <Tabs
                options={tabsOptions}
                selectedValue={listSection}
                onChange={handleTabChange}
                type="block"
                className={cx("w-[max(100%,600px)] rounded-t-8 border-b-[1.5px] border-slate-600 bg-slate-900", {
                  "mb-8 rounded-b-8": [ListSection.Positions, ListSection.Orders].includes(listSection as ListSection),
                  "w-[max(100%,410px)]": isMobile,
                })}
                regularOptionClassname={cx({
                  "first:rounded-l-8 last:rounded-r-8": [ListSection.Positions, ListSection.Orders].includes(
                    listSection as ListSection
                  ),
                })}
                rightContent={!isMobile ? actions : undefined}
              />
            </div>

            {isMobile ? <div className=" border-b border-slate-600 bg-slate-900 py-4">{actions}</div> : null}

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
                selectedPositionOrderKey={selectedPositionOrderKey}
                setSelectedPositionOrderKey={setSelectedPositionOrderKey}
                marketsDirectionsFilter={marketsDirectionsFilter}
                setMarketsDirectionsFilter={setMarketsDirectionsFilter}
                orderTypesFilter={orderTypesFilter}
                setOrderTypesFilter={setOrderTypesFilter}
                onCancelSelectedOrders={onCancelSelectedOrders}
              />
            )}
            {listSection === ListSection.Trades && <TradeHistory {...tradeHistoryState} />}
            {listSection === ListSection.Claims && renderClaims()}
          </div>
        )}
      </div>
      <PositionSeller />
      <PositionEditor />
      <InterviewModal type="trader" isVisible={isInterviewModalVisible} setIsVisible={setIsInterviewModalVisible} />
      <NpsModal />
    </div>
  );
}

function useOrdersControl() {
  const chainId = useSelector(selectChainId);
  const signer = useEthersSigner();
  const [cancellingOrdersKeys, setCanellingOrdersKeys] = useCancellingOrdersKeysState();
  const [selectedOrderKeys, setSelectedOrderKeys] = useState<string[]>(EMPTY_ARRAY);

  const { makeOrderTxnCallback } = useOrderTxnCallbacks();

  const isCancelOrdersProcessing = cancellingOrdersKeys.length > 0;

  const [marketsDirectionsFilter, setMarketsDirectionsFilter] = useState<MarketFilterLongShortItemData[]>([]);
  const [orderTypesFilter, setOrderTypesFilter] = useState<OrderTypeFilterValue[]>([]);
  const ordersInfoData = useSelector(selectOrdersInfoData);
  const globalExpressParams = useSelector(selectExpressGlobalParams);

  const onCancelSelectedOrders = useCallback(
    async function cancelSelectedOrders() {
      if (!signer) return;
      const orders = selectedOrderKeys.map((key) => getByKey(ordersInfoData, key)).filter(defined) as OrderInfo[];
      const orderKeys = orders.flatMap(getOrderKeys);
      setCanellingOrdersKeys((p) => uniq(p.concat(orderKeys)));

      const batchParams = {
        createOrderParams: [],
        updateOrderParams: [],
        cancelOrderParams: orderKeys.map((key) => ({ orderKey: key })),
      };

      const expressParams = await estimateBatchExpressParams({
        signer,
        chainId,
        batchParams,
        globalExpressParams,
        requireValidations: true,
        estimationMethod: "approximate",
        provider: undefined,
      });

      sendBatchOrderTxn({
        chainId,
        signer,
        expressParams,
        batchParams,
        simulationParams: undefined,
        noncesData: globalExpressParams?.noncesData,
        callback: makeOrderTxnCallback({}),
      })
        .then(async (tx) => {
          const txnResult = await tx.wait();
          if (txnResult?.status === "success") {
            setSelectedOrderKeys(EMPTY_ARRAY);
          }
        })
        .finally(() => {
          setCanellingOrdersKeys((p) => p.filter((e) => !orderKeys.includes(e)));
        });
    },
    [
      chainId,
      globalExpressParams,
      makeOrderTxnCallback,
      ordersInfoData,
      selectedOrderKeys,
      setCanellingOrdersKeys,
      signer,
    ]
  );

  const onCancelOrder = useCallback(
    async function cancelOrder(key: string) {
      if (!signer) return;
      const order = getByKey(ordersInfoData, key);
      if (!order) return;

      const orderKeys = getOrderKeys(order);

      setCanellingOrdersKeys((p) => uniq(p.concat(orderKeys)));

      const batchParams = {
        createOrderParams: [],
        updateOrderParams: [],
        cancelOrderParams: orderKeys.map((key) => ({ orderKey: key })),
      };

      const expressParams = await estimateBatchExpressParams({
        signer,
        chainId,
        batchParams,
        globalExpressParams,
        requireValidations: true,
        estimationMethod: "approximate",
        provider: undefined,
      });

      sendBatchOrderTxn({
        chainId,
        signer,
        expressParams,
        batchParams,
        simulationParams: undefined,
        noncesData: globalExpressParams?.noncesData,
        callback: makeOrderTxnCallback({}),
      }).finally(() => {
        setCanellingOrdersKeys((prev) => prev.filter((k) => k !== key));
        setSelectedOrderKeys((prev) => prev.filter((k) => k !== key));
      });
    },
    [chainId, globalExpressParams, makeOrderTxnCallback, ordersInfoData, setCanellingOrdersKeys, signer]
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
