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
import { getToken } from "config/tokens";
import { cancelOrdersTxn } from "domain/synthetics/orders/cancelOrdersTxn";
import { PositionInfo } from "domain/synthetics/positions";
import { useChainId } from "lib/chains";
import { getPageTitle } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { useCallback, useEffect, useMemo, useState } from "react";

import Helmet from "react-helmet";

import {
  useIsLastSubaccountAction,
  useSubaccount,
  useSubaccountCancelOrdersDetailsMessage,
} from "context/SubaccountContext/SubaccountContext";
import {
  useClosingPositionKeyState,
  useIsOrdersLoading,
  useIsPositionsLoading,
  useMarketsInfoData,
  useOrdersInfoData,
  usePositionsInfoData,
  useTokensData,
} from "context/SyntheticsStateContext/hooks/globalsHooks";
import {
  useTradeboxAvailableTokensOptions,
  useTradeboxFromTokenAddress,
  useTradeboxSetActivePosition,
  useTradeboxSetTradeConfig,
  useTradeboxToTokenAddress,
  useTradeboxTradeFlags,
  useTradeboxTradeMode,
  useTradeboxTradeType,
} from "context/SyntheticsStateContext/hooks/tradeboxHooks";
import { getMarketIndexName, getMarketPoolName, getTotalClaimableFundingUsd } from "domain/synthetics/markets";
import { TradeMode } from "domain/synthetics/trade";
import { getMidPrice } from "domain/tokens";
import { helperToast } from "lib/helperToast";
import useWallet from "lib/wallets/useWallet";
import { useTradeParamsProcessor } from "domain/synthetics/trade/useTradeParamsProcessor";
import { useRebatesInfo } from "domain/synthetics/fees/useRebatesInfo";
import { calcTotalRebateUsd } from "components/Synthetics/Claims/utils";
import { useOrderErrorsCount, useOrdersCount } from "context/SyntheticsStateContext/hooks/orderHooks";

export type Props = {
  shouldDisableValidation: boolean;
  savedShouldShowPositionLines: boolean;
  savedSlippageAmount: number;
  setSavedShouldShowPositionLines: (value: boolean) => void;
  setPendingTxns: (txns: any) => void;
  tradePageVersion: number;
  setTradePageVersion: (version: number) => void;
  openSettings: () => void;
};

enum ListSection {
  Positions = "Positions",
  Orders = "Orders",
  Trades = "Trades",
  Claims = "Claims",
}

export function SyntheticsPage(p: Props) {
  const {
    shouldDisableValidation,
    savedShouldShowPositionLines,
    tradePageVersion,
    setSavedShouldShowPositionLines,
    setPendingTxns,
    setTradePageVersion,
    savedSlippageAmount,
    openSettings,
  } = p;
  const { chainId } = useChainId();
  const { signer, account } = useWallet();
  const marketsInfoData = useMarketsInfoData();
  const tokensData = useTokensData();
  const positionsInfoData = usePositionsInfoData();
  const isPositionsLoading = useIsPositionsLoading();
  const ordersInfoData = useOrdersInfoData();
  const isOrdersLoading = useIsOrdersLoading();

  const { accruedPositionPriceImpactFees, claimablePositionPriceImpactFees } = useRebatesInfo(chainId);

  const [isSettling, setIsSettling] = useState(false);
  const [listSection, setListSection] = useLocalStorageSerializeKey(
    getSyntheticsListSectionKey(chainId),
    ListSection.Positions
  );

  const { isSwap } = useTradeboxTradeFlags();
  const fromTokenAddress = useTradeboxFromTokenAddress();
  const toTokenAddress = useTradeboxToTokenAddress();
  const availableTokensOptions = useTradeboxAvailableTokensOptions();
  const setActivePosition = useTradeboxSetActivePosition();
  const [, setClosingPositionKeyRaw] = useClosingPositionKeyState();
  const setClosingPositionKey = useCallback(
    (key: string | undefined) => requestAnimationFrame(() => setClosingPositionKeyRaw(key)),
    [setClosingPositionKeyRaw]
  );
  const { indexTokens, sortedIndexTokensWithPoolValue, swapTokens, sortedLongAndShortTokens, sortedAllMarkets } =
    availableTokensOptions;
  const setTradeConfig = useTradeboxSetTradeConfig();
  const tradeMode = useTradeboxTradeMode();
  const tradeType = useTradeboxTradeType();

  useTradeParamsProcessor({
    setTradeConfig,
    markets: sortedAllMarkets,
    tradeMode,
    tradeType,
    availableTokensOptions,
  });

  const { chartToken, availableChartTokens } = useMemo(() => {
    if (!fromTokenAddress || !toTokenAddress) {
      return {};
    }

    try {
      const fromToken = getToken(chainId, fromTokenAddress);
      const toToken = getToken(chainId, toTokenAddress);

      const chartToken = isSwap && toToken?.isStable && !fromToken?.isStable ? fromToken : toToken;
      const availableChartTokens = isSwap ? swapTokens : indexTokens;
      const sortedAvailableChartTokens = availableChartTokens.sort((a, b) => {
        if (sortedIndexTokensWithPoolValue || sortedLongAndShortTokens) {
          const currentSortReferenceList = isSwap ? sortedLongAndShortTokens : sortedIndexTokensWithPoolValue;
          return currentSortReferenceList.indexOf(a.address) - currentSortReferenceList.indexOf(b.address);
        }
        return 0;
      });

      return {
        chartToken,
        availableChartTokens: sortedAvailableChartTokens,
      };
    } catch (e) {
      return {};
    }
  }, [
    fromTokenAddress,
    toTokenAddress,
    chainId,
    isSwap,
    swapTokens,
    indexTokens,
    sortedIndexTokensWithPoolValue,
    sortedLongAndShortTokens,
  ]);

  const [gettingPendingFeePositionKeys, setGettingPendingFeePositionKeys] = useState<string[]>([]);

  const [selectedOrdersKeys, setSelectedOrdersKeys] = useState<{ [key: string]: boolean }>({});
  const selectedOrdersKeysArr = Object.keys(selectedOrdersKeys).filter((key) => selectedOrdersKeys[key]);
  const [isCancelOrdersProcessig, setIsCancelOrdersProcessig] = useState(false);
  const { errors: ordersErrorsCount, warnings: ordersWarningsCount } = useOrderErrorsCount();
  const ordersCount = useOrdersCount();
  const positionsCount = useMemo(() => {
    return Object.values(positionsInfoData || {}).length;
  }, [positionsInfoData]);
  const hasClaimableFees = useMemo(() => {
    const markets = Object.values(marketsInfoData ?? {});
    const totalClaimableFundingUsd = getTotalClaimableFundingUsd(markets);
    return totalClaimableFundingUsd.gt(0);
  }, [marketsInfoData]);

  const hasClaimableRebates = useMemo(
    () => calcTotalRebateUsd(claimablePositionPriceImpactFees, tokensData, false).gt(0),
    [claimablePositionPriceImpactFees, tokensData]
  );

  let totalClaimables = 0;

  if (hasClaimableFees) totalClaimables += 1;
  if (hasClaimableRebates) totalClaimables += 1;

  const subaccount = useSubaccount(null, selectedOrdersKeysArr.length);
  const cancelOrdersDetailsMessage = useSubaccountCancelOrdersDetailsMessage(undefined, selectedOrdersKeysArr.length);
  const isLastSubaccountAction = useIsLastSubaccountAction();

  const [isHigherSlippageAllowed, setIsHigherSlippageAllowed] = useState(false);
  let allowedSlippage = savedSlippageAmount!;
  if (isHigherSlippageAllowed) {
    allowedSlippage = DEFAULT_HIGHER_SLIPPAGE_AMOUNT;
  }

  function onCancelOrdersClick() {
    if (!signer) return;
    setIsCancelOrdersProcessig(true);
    cancelOrdersTxn(chainId, signer, subaccount, {
      orderKeys: selectedOrdersKeysArr,
      setPendingTxns: setPendingTxns,
      isLastSubaccountAction,
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
  }

  const [selectedPositionOrderKey, setSelectedPositionOrderKey] = useState<string>();

  function handlePositionListOrdersClick(key?: string) {
    setListSection(ListSection.Orders);
    setSelectedPositionOrderKey(key);
    if (key) {
      setSelectedOrdersKeys((prev) => ({ ...prev, [key]: true }));
    }
  }

  useEffect(() => {
    const chartTokenData = getByKey(tokensData, chartToken?.address);
    if (!chartTokenData) return;

    const averagePrice = getMidPrice(chartTokenData.prices);
    const currentTokenPriceStr =
      formatUsd(averagePrice, {
        displayDecimals: chartTokenData.priceDecimals,
      }) || "...";

    const title = getPageTitle(currentTokenPriceStr + ` | ${chartToken?.symbol}${chartToken?.isStable ? "" : "USD"}`);
    document.title = title;
  }, [chartToken?.address, chartToken?.isStable, chartToken?.symbol, tokensData]);

  function onSelectPositionClick(key: string, tradeMode?: TradeMode) {
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
  }

  function handleSettlePositionFeesClick(positionKey: PositionInfo["key"]) {
    setGettingPendingFeePositionKeys((keys) => keys.concat(positionKey).filter((x, i, self) => self.indexOf(x) === i));
    setIsSettling(true);
  }

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
        positionsInfoData={positionsInfoData}
        shouldShowPaginationButtons
        setIsSettling={setIsSettling}
        isSettling={isSettling}
        gettingPendingFeePositionKeys={gettingPendingFeePositionKeys}
        setGettingPendingFeePositionKeys={setGettingPendingFeePositionKeys}
        setPendingTxns={setPendingTxns}
        allowedSlippage={allowedSlippage}
        accruedPositionPriceImpactFees={accruedPositionPriceImpactFees}
        claimablePositionPriceImpactFees={claimablePositionPriceImpactFees}
      />
    );
  }

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
          <TVChart
            tokensData={tokensData}
            savedShouldShowPositionLines={savedShouldShowPositionLines}
            ordersInfo={ordersInfoData}
            positionsInfo={positionsInfoData}
            chartTokenAddress={chartToken?.address}
            availableTokens={availableChartTokens}
            tradePageVersion={tradePageVersion}
            setTradePageVersion={setTradePageVersion}
          />

          <div className="Exchange-lists large">
            <div className="Exchange-list-tab-container">
              <Tab
                options={Object.keys(ListSection)}
                optionLabels={tabLabels}
                option={listSection}
                onChange={(section) => setListSection(section)}
                type="inline"
                className="Exchange-list-tabs"
              />
              <div className="align-right Exchange-should-show-position-lines">
                {listSection === ListSection.Orders && selectedOrdersKeysArr.length > 0 && (
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
                  isChecked={savedShouldShowPositionLines}
                  setIsChecked={setSavedShouldShowPositionLines}
                  className={cx("muted chart-positions", { active: savedShouldShowPositionLines })}
                >
                  <span>
                    <Trans>Chart positions</Trans>
                  </span>
                </Checkbox>
              </div>
            </div>

            {listSection === ListSection.Positions && (
              <PositionList
                isLoading={isPositionsLoading}
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
                isLoading={isOrdersLoading}
                setPendingTxns={setPendingTxns}
                selectedPositionOrderKey={selectedPositionOrderKey}
                setSelectedPositionOrderKey={setSelectedPositionOrderKey}
                availableTokensOptions={availableTokensOptions}
              />
            )}
            {listSection === ListSection.Trades && <TradeHistory account={account} shouldShowPaginationButtons />}
            {listSection === ListSection.Claims && renderClaims()}
          </div>
        </div>

        <div className="Exchange-right">
          <div className="Exchange-swap-box">
            <TradeBox
              avaialbleTokenOptions={availableTokensOptions}
              shouldDisableValidation={shouldDisableValidation}
              allowedSlippage={allowedSlippage!}
              isHigherSlippageAllowed={isHigherSlippageAllowed}
              setIsHigherSlippageAllowed={setIsHigherSlippageAllowed}
              setPendingTxns={setPendingTxns}
            />
          </div>
        </div>

        <div className="Exchange-lists small">
          <div className="Exchange-list-tab-container">
            <Tab
              options={tabOptions}
              optionLabels={tabLabels}
              option={listSection}
              onChange={(section) => setListSection(section)}
              type="inline"
              className="Exchange-list-tabs"
            />
          </div>
          {listSection === ListSection.Positions && (
            <PositionList
              isLoading={isPositionsLoading}
              onOrdersClick={handlePositionListOrdersClick}
              onSelectPositionClick={onSelectPositionClick}
              onClosePositionClick={setClosingPositionKey}
              onSettlePositionFeesClick={handleSettlePositionFeesClick}
              openSettings={openSettings}
            />
          )}
          {listSection === ListSection.Orders && (
            <OrderList
              isLoading={isOrdersLoading}
              selectedOrdersKeys={selectedOrdersKeys}
              setSelectedOrdersKeys={setSelectedOrdersKeys}
              setPendingTxns={setPendingTxns}
              selectedPositionOrderKey={selectedPositionOrderKey}
              setSelectedPositionOrderKey={setSelectedPositionOrderKey}
              availableTokensOptions={availableTokensOptions}
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
        shouldDisableValidation={shouldDisableValidation}
      />

      <PositionEditor
        allowedSlippage={allowedSlippage}
        setPendingTxns={setPendingTxns}
        shouldDisableValidation={shouldDisableValidation}
      />

      <Footer />
    </div>
  );
}
