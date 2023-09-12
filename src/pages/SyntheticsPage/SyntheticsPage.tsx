import { Plural, Trans, t } from "@lingui/macro";
import cx from "classnames";
import Checkbox from "components/Checkbox/Checkbox";
import Footer from "components/Footer/Footer";
import { AcceptbablePriceImpactEditor } from "components/Synthetics/AcceptablePriceImpactEditor/AcceptablePriceImpactEditor";
import { ClaimHistory } from "components/Synthetics/ClaimHistory/ClaimHistory";
import { ClaimModal } from "components/Synthetics/ClaimModal/ClaimModal";
import { OrderList } from "components/Synthetics/OrderList/OrderList";
import { PositionEditor } from "components/Synthetics/PositionEditor/PositionEditor";
import { PositionList } from "components/Synthetics/PositionList/PositionList";
import { PositionSeller } from "components/Synthetics/PositionSeller/PositionSeller";
import { TVChart } from "components/Synthetics/TVChart/TVChart";
import { TradeBox } from "components/Synthetics/TradeBox/TradeBox";
import { TradeHistory } from "components/Synthetics/TradeHistory/TradeHistory";
import Tab from "components/Tab/Tab";
import { DEFAULT_ACCEPABLE_PRICE_IMPACT_BPS, DEFAULT_HIGHER_SLIPPAGE_AMOUNT } from "config/factors";
import { getAcceptablePriceImpactBpsKey, getSyntheticsListSectionKey } from "config/localStorage";
import { getToken } from "config/tokens";
import { isSwapOrderType } from "domain/synthetics/orders";
import { cancelOrdersTxn } from "domain/synthetics/orders/cancelOrdersTxn";
import { useOrdersInfo } from "domain/synthetics/orders/useOrdersInfo";
import { getPositionKey } from "domain/synthetics/positions";
import { usePositionsInfo } from "domain/synthetics/positions/usePositionsInfo";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { getPageTitle } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { bigNumberify, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { useCallback, useEffect, useMemo, useState } from "react";
import Helmet from "react-helmet";

import { getMarketIndexName, getMarketPoolName, useMarketsInfo } from "domain/synthetics/markets";
import { TradeMode } from "domain/synthetics/trade";
import { useSelectedTradeOption } from "domain/synthetics/trade/useSelectedTradeOption";
import { helperToast } from "lib/helperToast";
import useWallet from "lib/wallets/useWallet";

export type Props = {
  savedIsPnlInLeverage: boolean;
  shouldDisableValidation: boolean;
  savedShouldShowPositionLines: boolean;
  showPnlAfterFees: boolean;
  savedShowPnlAfterFees: boolean;
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
    savedIsPnlInLeverage,
    shouldDisableValidation,
    savedShouldShowPositionLines,
    showPnlAfterFees,
    tradePageVersion,
    setSavedShouldShowPositionLines,
    setPendingTxns,
    setTradePageVersion,
    savedShowPnlAfterFees,
    savedSlippageAmount,
    openSettings,
  } = p;
  const { chainId } = useChainId();
  const { signer, account } = useWallet();
  const { marketsInfoData, tokensData, pricesUpdatedAt } = useMarketsInfo(chainId);

  const { positionsInfoData, isLoading: isPositionsLoading } = usePositionsInfo(chainId, {
    marketsInfoData,
    tokensData,
    pricesUpdatedAt,
    showPnlInLeverage: savedIsPnlInLeverage,
    account,
  });

  const { ordersInfoData, isLoading: isOrdersLoading } = useOrdersInfo(chainId, {
    account,
    marketsInfoData,
    tokensData,
  });

  const {
    tradeType,
    tradeMode,
    tradeFlags,
    isWrapOrUnwrap,
    fromTokenAddress,
    fromToken,
    toTokenAddress,
    toToken,
    marketAddress,
    marketInfo,
    collateralAddress,
    collateralToken,
    availableTokensOptions,
    avaialbleTradeModes,
    setTradeType,
    setTradeMode,
    setFromTokenAddress,
    setToTokenAddress,
    setMarketAddress,
    setCollateralAddress,
    setActivePosition,
    switchTokenAddresses,
  } = useSelectedTradeOption(chainId, { marketsInfoData, tokensData });

  const [listSection, setListSection] = useLocalStorageSerializeKey(
    getSyntheticsListSectionKey(chainId),
    ListSection.Positions
  );

  const { isSwap, isLong } = tradeFlags;
  const { indexTokens, sortedIndexTokensWithPoolValue } = availableTokensOptions;

  const { chartToken, availableChartTokens } = useMemo(() => {
    if (!fromTokenAddress || !toTokenAddress) {
      return {};
    }

    try {
      const fromToken = getToken(chainId, fromTokenAddress);
      const toToken = getToken(chainId, toTokenAddress);

      const chartToken = isSwap && toToken?.isStable && !fromToken?.isStable ? fromToken : toToken;
      const availableChartTokens = isSwap ? [chartToken] : indexTokens;
      const sortedAvailableChartTokens = availableChartTokens.sort((a, b) => {
        if (sortedIndexTokensWithPoolValue) {
          return sortedIndexTokensWithPoolValue.indexOf(a.address) - sortedIndexTokensWithPoolValue.indexOf(b.address);
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
  }, [chainId, fromTokenAddress, indexTokens, isSwap, toTokenAddress, sortedIndexTokensWithPoolValue]);

  const [closingPositionKey, setClosingPositionKey] = useState<string>();
  const closingPosition = getByKey(positionsInfoData, closingPositionKey);

  const [editingPositionKey, setEditingPositionKey] = useState<string>();
  const editingPosition = getByKey(positionsInfoData, editingPositionKey);

  const selectedPositionKey = useMemo(() => {
    if (!account || !collateralAddress || !marketAddress || !tradeType) {
      return undefined;
    }

    return getPositionKey(account, marketAddress, collateralAddress, isLong);
  }, [account, collateralAddress, marketAddress, tradeType, isLong]);
  const selectedPosition = getByKey(positionsInfoData, selectedPositionKey);

  const [selectedOrdersKeys, setSelectedOrdersKeys] = useState<{ [key: string]: boolean }>({});
  const selectedOrdersKeysArr = Object.keys(selectedOrdersKeys).filter((key) => selectedOrdersKeys[key]);
  const [isCancelOrdersProcessig, setIsCancelOrdersProcessig] = useState(false);
  const existingOrder = useMemo(() => {
    if (!selectedPositionKey) {
      return undefined;
    }

    return Object.values(ordersInfoData || {})
      .filter((order) => !isSwapOrderType(order.orderType))
      .find((order) => {
        if (isSwapOrderType(order.orderType)) {
          return false;
        }

        return (
          getPositionKey(order.account, order.marketAddress, order.targetCollateralToken.address, order.isLong) ===
          selectedPositionKey
        );
      });
  }, [ordersInfoData, selectedPositionKey]);

  const { positionsCount, ordersCount } = useMemo(() => {
    return {
      positionsCount: Object.keys(positionsInfoData || {}).length,
      ordersCount: Object.keys(ordersInfoData || {}).length,
    };
  }, [ordersInfoData, positionsInfoData]);

  const [isClaiming, setIsClaiming] = useState(false);
  const [isAcceptablePriceImpactEditing, setIsAcceptablePriceImpactEditing] = useState(false);

  const [savedAcceptablePriceImpactBps, saveAcceptablePriceImpactBps] = useLocalStorageSerializeKey(
    getAcceptablePriceImpactBpsKey(chainId),
    DEFAULT_ACCEPABLE_PRICE_IMPACT_BPS
  );
  const acceptablePriceImpactBps =
    bigNumberify(savedAcceptablePriceImpactBps!) || BigNumber.from(DEFAULT_ACCEPABLE_PRICE_IMPACT_BPS);
  const onEditAcceptablePriceImpact = useCallback(() => {
    return setIsAcceptablePriceImpactEditing(true);
  }, []);

  const [isHigherSlippageAllowed, setIsHigherSlippageAllowed] = useState(false);
  let allowedSlippage = savedSlippageAmount!;
  if (isHigherSlippageAllowed) {
    allowedSlippage = DEFAULT_HIGHER_SLIPPAGE_AMOUNT;
  }

  const onPositionSellerClose = useCallback(() => {
    setClosingPositionKey(undefined);
  }, []);

  const onPositionEditorClose = useCallback(() => {
    setEditingPositionKey(undefined);
  }, []);

  function onCancelOrdersClick() {
    if (!signer) return;
    setIsCancelOrdersProcessig(true);
    cancelOrdersTxn(chainId, signer, {
      orderKeys: selectedOrdersKeysArr,
      setPendingTxns: setPendingTxns,
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

  useEffect(() => {
    const chartTokenData = getByKey(tokensData, chartToken?.address);
    let currentTokenPriceStr =
      formatUsd(chartTokenData?.prices.maxPrice, {
        displayDecimals: chartTokenData?.priceDecimals,
      }) || "...";
    let title = getPageTitle(currentTokenPriceStr + ` | ${chartToken?.symbol}${chartToken?.isStable ? "" : "USD"}`);
    document.title = title;
  }, [chartToken?.address, chartToken?.isStable, chartToken?.symbol, tokensData]);

  function onSelectPositionClick(key: string, tradeMode?: TradeMode) {
    const position = getByKey(positionsInfoData, key);
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
        <span>market selected</span>;
      </Trans>
    );
    helperToast.success(message);
  }

  return (
    <div className="Exchange page-layout">
      <Helmet>
        <style type="text/css">{`
            :root {
              --main-bg-color: #08091b;                   
             {
         `}</style>
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
            onSelectChartTokenAddress={setToTokenAddress}
            disableSelectToken={isSwap}
            tradePageVersion={tradePageVersion}
            setTradePageVersion={setTradePageVersion}
          />

          <div className="Exchange-lists large">
            <div className="Exchange-list-tab-container">
              <Tab
                options={Object.keys(ListSection)}
                optionLabels={{
                  [ListSection.Positions]: t`Positions${positionsCount ? ` (${positionsCount})` : ""}`,
                  [ListSection.Orders]: t`Orders${ordersCount ? ` (${ordersCount})` : ""}`,
                  [ListSection.Trades]: t`Trades`,
                  [ListSection.Claims]: t`Claims`,
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
                positionsData={positionsInfoData}
                ordersData={ordersInfoData}
                isLoading={isPositionsLoading}
                savedIsPnlInLeverage={savedIsPnlInLeverage}
                onOrdersClick={() => setListSection(ListSection.Orders)}
                onSelectPositionClick={onSelectPositionClick}
                onClosePositionClick={setClosingPositionKey}
                onEditCollateralClick={setEditingPositionKey}
                showPnlAfterFees={showPnlAfterFees}
                savedShowPnlAfterFees={savedShowPnlAfterFees}
                currentMarketAddress={marketAddress}
                currentCollateralAddress={collateralAddress}
                currentTradeType={tradeType}
                openSettings={openSettings}
              />
            )}
            {listSection === ListSection.Orders && (
              <OrderList
                marketsInfoData={marketsInfoData}
                tokensData={tokensData}
                positionsData={positionsInfoData}
                ordersData={ordersInfoData}
                selectedOrdersKeys={selectedOrdersKeys}
                setSelectedOrdersKeys={setSelectedOrdersKeys}
                isLoading={isOrdersLoading}
                setPendingTxns={setPendingTxns}
              />
            )}
            {listSection === ListSection.Trades && (
              <TradeHistory
                account={account}
                marketsInfoData={marketsInfoData}
                tokensData={tokensData}
                shouldShowPaginationButtons
              />
            )}
            {listSection === ListSection.Claims && (
              <ClaimHistory marketsInfoData={marketsInfoData} tokensData={tokensData} shouldShowPaginationButtons />
            )}
          </div>
        </div>

        <div className="Exchange-right">
          <div className="Exchange-swap-box">
            <TradeBox
              tradeMode={tradeMode}
              tradeType={tradeType}
              availableTradeModes={avaialbleTradeModes}
              tradeFlags={tradeFlags}
              isWrapOrUnwrap={isWrapOrUnwrap}
              fromTokenAddress={fromTokenAddress}
              fromToken={fromToken}
              toTokenAddress={toTokenAddress}
              toToken={toToken}
              marketAddress={marketAddress}
              marketInfo={marketInfo}
              collateralAddress={collateralAddress}
              collateralToken={collateralToken}
              avaialbleTokenOptions={availableTokensOptions}
              savedIsPnlInLeverage={savedIsPnlInLeverage}
              existingPosition={selectedPosition}
              existingOrder={existingOrder}
              shouldDisableValidation={shouldDisableValidation}
              acceptablePriceImpactBpsForLimitOrders={acceptablePriceImpactBps}
              allowedSlippage={allowedSlippage!}
              isHigherSlippageAllowed={isHigherSlippageAllowed}
              tokensData={tokensData}
              ordersInfo={ordersInfoData}
              positionsInfo={positionsInfoData}
              marketsInfoData={marketsInfoData}
              setIsHigherSlippageAllowed={setIsHigherSlippageAllowed}
              onSelectMarketAddress={setMarketAddress}
              onSelectCollateralAddress={setCollateralAddress}
              onSelectFromTokenAddress={setFromTokenAddress}
              onSelectToTokenAddress={setToTokenAddress}
              onSelectTradeMode={setTradeMode}
              onSelectTradeType={setTradeType}
              setIsEditingAcceptablePriceImpact={onEditAcceptablePriceImpact}
              setPendingTxns={setPendingTxns}
              setIsClaiming={setIsClaiming}
              switchTokenAddresses={switchTokenAddresses}
            />
          </div>
        </div>

        <div className="Exchange-lists small">
          <div className="Exchange-list-tab-container">
            <Tab
              options={Object.keys(ListSection)}
              optionLabels={{
                [ListSection.Positions]: t`Positions${positionsCount ? ` (${positionsCount})` : ""}`,
                [ListSection.Orders]: t`Orders${ordersCount ? ` (${ordersCount})` : ""}`,
                [ListSection.Trades]: t`Trades`,
                [ListSection.Claims]: t`Claims`,
              }}
              option={listSection}
              onChange={(section) => setListSection(section)}
              type="inline"
              className="Exchange-list-tabs"
            />
          </div>
          {listSection === ListSection.Positions && (
            <PositionList
              positionsData={positionsInfoData}
              ordersData={ordersInfoData}
              savedIsPnlInLeverage={savedIsPnlInLeverage}
              isLoading={isPositionsLoading}
              onOrdersClick={() => setListSection(ListSection.Orders)}
              onSelectPositionClick={onSelectPositionClick}
              onClosePositionClick={setClosingPositionKey}
              onEditCollateralClick={setEditingPositionKey}
              showPnlAfterFees={showPnlAfterFees}
              savedShowPnlAfterFees={savedShowPnlAfterFees}
              currentMarketAddress={marketAddress}
              currentCollateralAddress={collateralAddress}
              currentTradeType={tradeType}
              openSettings={openSettings}
            />
          )}
          {listSection === ListSection.Orders && (
            <OrderList
              marketsInfoData={marketsInfoData}
              tokensData={tokensData}
              positionsData={positionsInfoData}
              ordersData={ordersInfoData}
              isLoading={isOrdersLoading}
              selectedOrdersKeys={selectedOrdersKeys}
              setSelectedOrdersKeys={setSelectedOrdersKeys}
              setPendingTxns={setPendingTxns}
            />
          )}
          {listSection === ListSection.Trades && (
            <TradeHistory
              account={account}
              marketsInfoData={marketsInfoData}
              tokensData={tokensData}
              shouldShowPaginationButtons
            />
          )}
          {listSection === ListSection.Claims && (
            <ClaimHistory marketsInfoData={marketsInfoData} tokensData={tokensData} shouldShowPaginationButtons />
          )}
        </div>
      </div>

      <PositionSeller
        position={closingPosition!}
        marketsInfoData={marketsInfoData}
        tokensData={tokensData}
        showPnlInLeverage={savedIsPnlInLeverage}
        onClose={onPositionSellerClose}
        setPendingTxns={setPendingTxns}
        availableTokensOptions={availableTokensOptions}
        isHigherSlippageAllowed={isHigherSlippageAllowed}
        setIsHigherSlippageAllowed={setIsHigherSlippageAllowed}
        shouldDisableValidation={shouldDisableValidation}
        onSelectPositionClick={onSelectPositionClick}
      />

      <PositionEditor
        tokensData={tokensData}
        showPnlInLeverage={savedIsPnlInLeverage}
        position={editingPosition}
        allowedSlippage={allowedSlippage}
        onClose={onPositionEditorClose}
        setPendingTxns={setPendingTxns}
        shouldDisableValidation={shouldDisableValidation}
      />

      <AcceptbablePriceImpactEditor
        isVisible={isAcceptablePriceImpactEditing}
        savedAcceptablePriceImpactBps={savedAcceptablePriceImpactBps!}
        saveAcceptablePriceImpactBps={saveAcceptablePriceImpactBps}
        onClose={() => setIsAcceptablePriceImpactEditing(false)}
      />

      <ClaimModal
        marketsInfoData={marketsInfoData}
        isVisible={isClaiming}
        onClose={() => setIsClaiming(false)}
        setPendingTxns={setPendingTxns}
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
