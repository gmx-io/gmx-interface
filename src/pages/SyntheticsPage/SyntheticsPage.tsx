import { Plural, Trans, t } from "@lingui/macro";
import { useWeb3React } from "@web3-react/core";
import cx from "classnames";
import Checkbox from "components/Checkbox/Checkbox";
import Footer from "components/Footer/Footer";
import { AcceptbablePriceImpactEditor } from "components/Synthetics/AcceptablePriceImpactEditor/AcceptablePriceImpactEditor";
import { ClaimHistory } from "components/Synthetics/ClaimHistory/ClaimHistory";
import { ClaimModal } from "components/Synthetics/ClaimModal/ClaimModal";
import { OrderList } from "components/Synthetics/OrderList/OrderList";
import { PositionList } from "components/Synthetics/PositionList/PositionList";
import { TVChart } from "components/Synthetics/TVChart/TVChart";
import { TradeBox } from "components/Synthetics/TradeBox/TradeBox";
import { TradeHistory } from "components/Synthetics/TradeHistory/TradeHistory";
import { PositionSeller } from "components/Synthetics/PositionSeller/PositionSeller";
import Tab from "components/Tab/Tab";
import { DEFAULT_ACCEPABLE_PRICE_IMPACT_BPS } from "config/factors";
import {
  getAcceptablePriceImpactBpsKey,
  getAllowedSlippageKey,
  getSyntheticsCollateralAddressKey,
  getSyntheticsFromTokenAddressKey,
  getSyntheticsListSectionKey,
  getSyntheticsMarketAddressKey,
  getSyntheticsToTokenAddressKey,
  getSyntheticsTradeModeKey,
  getSyntheticsTradeTypeKey,
} from "config/localStorage";
import { getToken } from "config/tokens";
import { useMarketsInfo } from "domain/synthetics/markets";
import { isSwapOrderType } from "domain/synthetics/orders";
import { cancelOrdersTxn } from "domain/synthetics/orders/cancelOrdersTxn";
import { useOrdersInfo } from "domain/synthetics/orders/useOrdersInfo";
import { getPositionKey } from "domain/synthetics/positions";
import { usePositionsInfo } from "domain/synthetics/positions/usePositionsInfo";
import { useAvailableTokensData } from "domain/synthetics/tokens";
import { TradeMode, TradeType, useAvailableTokenOptions } from "domain/synthetics/trade";
import { useTradeFlags } from "domain/synthetics/trade/useTradeFlags";
import { getIsUnwrap, getIsWrap } from "domain/tokens";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { DEFAULT_HIGHER_SLIPPAGE_AMOUNT, DEFAULT_SLIPPAGE_AMOUNT } from "lib/legacy";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { bigNumberify } from "lib/numbers";
import { getByKey } from "lib/objects";
import { useCallback, useMemo, useState } from "react";
import { useVirtualInventory } from "domain/synthetics/fees/useVirtualInventory";
import { PositionEditor } from "components/Synthetics/PositionEditor/PositionEditor";

import "./SyntheticsPage.scss";

export type Props = {
  savedIsPnlInLeverage: boolean;
  shouldDisableValidation: boolean;
  savedShouldShowPositionLines: boolean;
  showPnlAfterFees: boolean;
  onConnectWallet: () => void;
  setSavedShouldShowPositionLines: (value: boolean) => void;
  setPendingTxns: (txns: any) => void;
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
    onConnectWallet,
    setSavedShouldShowPositionLines,
    setPendingTxns,
  } = p;
  const { chainId } = useChainId();
  const { library, account } = useWeb3React();
  const { tokensData } = useAvailableTokensData(chainId);
  const { marketsInfoData } = useMarketsInfo(chainId);
  const { virtualInventoryForPositions } = useVirtualInventory(chainId);
  const { positionsInfoData, isLoading: isPositionsLoading } = usePositionsInfo(chainId, {
    showPnlInLeverage: savedIsPnlInLeverage,
  });

  const { ordersInfoData, isLoading: isOrdersLoading } = useOrdersInfo(chainId);

  const [listSection, setListSection] = useLocalStorageSerializeKey(
    getSyntheticsListSectionKey(chainId),
    ListSection.Positions
  );

  const [tradeType, setTradeType] = useLocalStorageSerializeKey(getSyntheticsTradeTypeKey(chainId), TradeType.Long);
  const [tradeMode, setTradeMode] = useLocalStorageSerializeKey(getSyntheticsTradeModeKey(chainId), TradeMode.Market);
  const tradeFlags = useTradeFlags(tradeType!, tradeMode!);
  const { isSwap, isLong } = tradeFlags;

  const availableTokensOptions = useAvailableTokenOptions(chainId);
  const { indexTokens, tokensMap } = availableTokensOptions;

  const [fromTokenAddress, setFromTokenAddress] = useLocalStorageSerializeKey<string | undefined>(
    getSyntheticsFromTokenAddressKey(chainId, isSwap),
    undefined
  );
  const fromToken = getByKey(tokensMap, fromTokenAddress);
  const fromTokenData = getByKey(tokensData, fromTokenAddress);

  const [toTokenAddress, setToTokenAddress] = useLocalStorageSerializeKey<string | undefined>(
    getSyntheticsToTokenAddressKey(chainId, isSwap),
    undefined
  );
  const toToken = getByKey(tokensMap, toTokenAddress);
  const toTokenData = getByKey(tokensData, toTokenAddress);

  const isWrapOrUnwrap = Boolean(
    isSwap && fromToken && toToken && (getIsWrap(fromToken, toToken) || getIsUnwrap(fromToken, toToken))
  );

  const [marketAddress, setMarketAddress] = useLocalStorageSerializeKey<string | undefined>(
    getSyntheticsMarketAddressKey(chainId, tradeType, toTokenAddress),
    undefined
  );
  const marketInfo = getByKey(marketsInfoData, marketAddress);

  const [collateralAddress, setCollateralAddress] = useLocalStorageSerializeKey<string | undefined>(
    getSyntheticsCollateralAddressKey(chainId, tradeType, marketAddress),
    undefined
  );
  const collateralTokenData = getByKey(tokensData, collateralAddress);

  const chartTokenAddress = useMemo(() => {
    if (isSwap && toToken?.isStable && !fromToken?.isStable) {
      return fromTokenAddress;
    } else {
      return toTokenAddress;
    }
  }, [fromToken?.isStable, fromTokenAddress, isSwap, toToken?.isStable, toTokenAddress]);

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

  function onSelectPosition(positionKey: string) {
    const position = getByKey(positionsInfoData, positionKey);

    if (!position) return;

    // disable merge state updates to correctly save values to local storage
    setTimeout(() => {
      setTradeType(position.isLong ? TradeType.Long : TradeType.Short);
      setToTokenAddress(position.indexToken.address);
      setMarketAddress(position.marketAddress);
      setCollateralAddress(position.collateralTokenAddress);
    });
  }

  function onCancelOrdersClick() {
    setIsCancelOrdersProcessig(true);
    cancelOrdersTxn(chainId, library, {
      orderKeys: selectedOrdersKeysArr,
      setPendingTxns: setPendingTxns,
    }).finally(() => setIsCancelOrdersProcessig(false));
  }

  return (
    <div className="SyntheticsTrade page-layout">
      <div className="SyntheticsTrade-content">
        <div className="SyntheticsTrade-left">
          <TVChart
            savedShouldShowPositionLines={savedShouldShowPositionLines}
            ordersInfo={ordersInfoData}
            positionsInfo={positionsInfoData}
            chartTokenAddress={chartTokenAddress}
            availableTokens={isSwap && chartTokenAddress ? [getToken(chainId, chartTokenAddress)] : indexTokens}
            onSelectChartTokenAddress={setToTokenAddress}
            disableSelectToken={isSwap}
          />

          <div className="SyntheticsTrade-lists large">
            <div className="SyntheticsTrade-list-tab-container">
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
                onSelectPositionClick={onSelectPosition}
                onClosePositionClick={setClosingPositionKey}
                onEditCollateralClick={setEditingPositionKey}
                showPnlAfterFees={showPnlAfterFees}
              />
            )}
            {listSection === ListSection.Orders && (
              <OrderList
                positionsData={positionsInfoData}
                ordersData={ordersInfoData}
                selectedOrdersKeys={selectedOrdersKeys}
                setSelectedOrdersKeys={setSelectedOrdersKeys}
                isLoading={isOrdersLoading}
                setPendingTxns={setPendingTxns}
              />
            )}
            {listSection === ListSection.Trades && <TradeHistory shouldShowPaginationButtons />}
            {listSection === ListSection.Claims && <ClaimHistory shouldShowPaginationButtons />}
          </div>
        </div>

        <div className="SyntheticsTrade-right">
          <div className="SyntheticsTrade-swap-box">
            <TradeBox
              tradeMode={tradeMode!}
              tradeType={tradeType!}
              tradeFlags={tradeFlags}
              isWrapOrUnwrap={isWrapOrUnwrap}
              fromTokenAddress={fromTokenAddress}
              fromToken={fromTokenData}
              toTokenAddress={toTokenAddress}
              toToken={toTokenData}
              marketAddress={marketAddress}
              marketInfo={marketInfo}
              collateralAddress={collateralAddress}
              collateralToken={collateralTokenData}
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
              virtualInventoryForPositions={virtualInventoryForPositions}
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
              positionsData={positionsInfoData}
              ordersData={ordersInfoData}
              savedIsPnlInLeverage={savedIsPnlInLeverage}
              isLoading={isPositionsLoading}
              onOrdersClick={() => setListSection(ListSection.Orders)}
              onSelectPositionClick={onSelectPosition}
              onClosePositionClick={setClosingPositionKey}
              onEditCollateralClick={setEditingPositionKey}
              showPnlAfterFees={showPnlAfterFees}
            />
          )}
          {listSection === ListSection.Orders && (
            <OrderList
              positionsData={positionsInfoData}
              ordersData={ordersInfoData}
              isLoading={isOrdersLoading}
              selectedOrdersKeys={selectedOrdersKeys}
              setSelectedOrdersKeys={setSelectedOrdersKeys}
              setPendingTxns={setPendingTxns}
            />
          )}
          {listSection === ListSection.Trades && <TradeHistory shouldShowPaginationButtons />}
          {listSection === ListSection.Claims && <ClaimHistory shouldShowPaginationButtons />}
        </div>
      </div>

      {closingPosition && (
        <PositionSeller
          position={closingPosition}
          showPnlInLeverage={savedIsPnlInLeverage}
          onClose={onPositionSellerClose}
          setPendingTxns={setPendingTxns}
          allowedSlippage={allowedSlippage}
          availableTokensOptions={availableTokensOptions}
          isHigherSlippageAllowed={isHigherSlippageAllowed}
          setIsHigherSlippageAllowed={setIsHigherSlippageAllowed}
          onConnectWallet={onConnectWallet}
        />
      )}

      {editingPosition && (
        <PositionEditor
          showPnlInLeverage={savedIsPnlInLeverage}
          position={editingPosition}
          allowedSlippage={allowedSlippage}
          onClose={onPositionEditorClose}
          setPendingTxns={setPendingTxns}
          onConnectWallet={onConnectWallet}
        />
      )}

      {isAcceptablePriceImpactEditing && (
        <AcceptbablePriceImpactEditor
          savedAcceptablePriceImpactBps={savedAcceptablePriceImpactBps!}
          saveAcceptablePriceImpactBps={saveAcceptablePriceImpactBps}
          onClose={() => setIsAcceptablePriceImpactEditing(false)}
        />
      )}

      {isClaiming && <ClaimModal onClose={() => setIsClaiming(false)} setPendingTxns={setPendingTxns} />}

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
