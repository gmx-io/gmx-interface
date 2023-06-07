import { Plural, Trans, t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
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
import { DEFAULT_ACCEPABLE_PRICE_IMPACT_BPS } from "config/factors";
import {
  getAcceptablePriceImpactBpsKey,
  getAllowedSlippageKey,
  getSyntheticsListSectionKey,
} from "config/localStorage";
import { getToken } from "config/tokens";
import { isSwapOrderType } from "domain/synthetics/orders";
import { cancelOrdersTxn } from "domain/synthetics/orders/cancelOrdersTxn";
import { useOrdersInfo } from "domain/synthetics/orders/useOrdersInfo";
import { getPositionKey } from "domain/synthetics/positions";
import { usePositionsInfo } from "domain/synthetics/positions/usePositionsInfo";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { DEFAULT_HIGHER_SLIPPAGE_AMOUNT, DEFAULT_SLIPPAGE_AMOUNT, getPageTitle } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { bigNumberify, formatUsd } from "lib/numbers";
import { getByKey } from "lib/objects";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useSelectedTradeOption } from "domain/synthetics/trade/useSelectedTradeOption";
import { useMarketsInfo } from "domain/synthetics/markets";

export type Props = {
  savedIsPnlInLeverage: boolean;
  shouldDisableValidation: boolean;
  savedShouldShowPositionLines: boolean;
  showPnlAfterFees: boolean;
  savedShowPnlAfterFees: boolean;
  onConnectWallet: () => void;
  setSavedShouldShowPositionLines: (value: boolean) => void;
  setPendingTxns: (txns: any) => void;
  tradePageVersion: number;
  setTradePageVersion: (version: number) => void;
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
    onConnectWallet,
    setSavedShouldShowPositionLines,
    setPendingTxns,
    setTradePageVersion,
    savedShowPnlAfterFees,
  } = p;
  const { chainId } = useChainId();
  const { library, account } = useWeb3React();
  const { marketsInfoData, tokensData, pricesUpdatedAt } = useMarketsInfo(chainId);

  const { positionsInfoData, isLoading: isPositionsLoading } = usePositionsInfo(chainId, {
    marketsInfoData,
    tokensData,
    pricesUpdatedAt,
    showPnlInLeverage: savedIsPnlInLeverage,
  });

  const { ordersInfoData, isLoading: isOrdersLoading } = useOrdersInfo(chainId, { marketsInfoData, tokensData });

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
  const { indexTokens } = availableTokensOptions;

  const { chartToken, availableChartTokens } = useMemo(() => {
    if (!fromTokenAddress || !toTokenAddress) {
      return {};
    }

    try {
      const fromToken = getToken(chainId, fromTokenAddress);
      const toToken = getToken(chainId, toTokenAddress);

      const chartToken = isSwap && toToken?.isStable && !fromToken?.isStable ? fromToken : toToken;
      const availableChartTokens = isSwap ? [chartToken] : indexTokens;

      return {
        chartToken,
        availableChartTokens,
      };
    } catch (e) {
      return {};
    }
  }, [chainId, fromTokenAddress, indexTokens, isSwap, toTokenAddress]);

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

  const [savedSlippageAmount] = useLocalStorageSerializeKey(getAllowedSlippageKey(chainId), DEFAULT_SLIPPAGE_AMOUNT);
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
    setIsCancelOrdersProcessig(true);
    cancelOrdersTxn(chainId, library, {
      orderKeys: selectedOrdersKeysArr,
      setPendingTxns: setPendingTxns,
    }).finally(() => setIsCancelOrdersProcessig(false));
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

  return (
    <div className="Exchange page-layout">
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
                onSelectPositionClick={(key, tradeMode) =>
                  setActivePosition(getByKey(positionsInfoData, key), tradeMode)
                }
                onClosePositionClick={setClosingPositionKey}
                onEditCollateralClick={setEditingPositionKey}
                showPnlAfterFees={showPnlAfterFees}
                savedShowPnlAfterFees={savedShowPnlAfterFees}
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
              <TradeHistory marketsInfoData={marketsInfoData} tokensData={tokensData} shouldShowPaginationButtons />
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
              onConnectWallet={onConnectWallet}
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
              optionLabels={ListSection}
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
              onSelectPositionClick={(key, tradeMode) => setActivePosition(getByKey(positionsInfoData, key), tradeMode)}
              onClosePositionClick={setClosingPositionKey}
              onEditCollateralClick={setEditingPositionKey}
              showPnlAfterFees={showPnlAfterFees}
              savedShowPnlAfterFees={savedShowPnlAfterFees}
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
            <TradeHistory marketsInfoData={marketsInfoData} tokensData={tokensData} shouldShowPaginationButtons />
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
        allowedSlippage={allowedSlippage}
        availableTokensOptions={availableTokensOptions}
        isHigherSlippageAllowed={isHigherSlippageAllowed}
        setIsHigherSlippageAllowed={setIsHigherSlippageAllowed}
        onConnectWallet={onConnectWallet}
      />

      <PositionEditor
        tokensData={tokensData}
        showPnlInLeverage={savedIsPnlInLeverage}
        position={editingPosition}
        allowedSlippage={allowedSlippage}
        onClose={onPositionEditorClose}
        setPendingTxns={setPendingTxns}
        onConnectWallet={onConnectWallet}
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
