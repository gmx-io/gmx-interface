import { ClaimHistoryList } from '@/components/ExchangeNew/ExchangeList/ClaimHistoryList';
import { getGmw235Enabled, getGmw329Enabled, getGmw422Enabled, getGmw456Enabled } from '@/config/featureFlagEnable';
import { OrderList } from '@/components/ExchangeNew/ExchangeList/OrderList/OrderList';
import PositionList from '@/components/ExchangeNew/ExchangeList/PositionList/PositionList';
import { TradeHistoryList } from '@/components/ExchangeNew/ExchangeList/TradeHistoryList';
import Tab from '@/components/Common/Tab/Tab';
import { formatMarketName } from '@/components/TradeBoxNew/utils/formatMarketName'
import { getSyntheticsListSectionKey } from '@/config/localStorage';
import { useLocalStorageSerializeKey } from '@/hooks/initializeHooks';
import { useClosePosition } from '@/hooks/positionSellerHooks/useClosePosition';
import { useTriggerCancelOrder } from '@/hooks/triggerHooks/useTriggerCancelOrder';
import { selectChainId } from '@/selectors/network/baseSelectors';
import { selectOrdersCountForDisplay } from '@/selectors/order/baseSelectors';
import { selectPositionsCount } from '@/selectors/position/baseSelectors';
import { selectPositionsInfo } from '@/selectors/position/selectPositionsInfo';
import {
  PositionInfo,
  PositionMarketInfo,
} from '@/selectors/position/types';
import { TradeMode, TradeType } from '@/selectors/trade/types';
import {
  selectResetTradeOptions,
  selectSetTradeboxMarketTokenAddress,
  selectSetTradeboxTradeParams,
  selectSetTradeboxTradeType,
} from '@/selectors/tradebox/baseSelectors';
import { helperNotice } from '@/utils/lib/helperNotice';
import { EMPTY_ARRAY, getByKey } from '@/utils/lib/object';
import { selectIndexMarket } from '@/utils/market/selectIndexMarket';
import { setSelectedIndexToken } from '@/utils/market/selectedIndexToken';
import { useAppStore } from '@/zustand/useAppStore';
import { Trans, t } from '@lingui/macro';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOrdersData } from '@/hooks/orderHooks/useOrdersData';
import { usePositionsData } from '@/hooks/positionHooks/usePositionsData';
import { useTickers } from '@/components/TradeBoxNew/Hooks/useTicker';
import { useAnchor, useStoreProgram } from '@/contexts/anchor';
import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
import ToggleSwitch from '@/components/Common/ToggleSwitch/ToggleSwitch';
import usePositionSocketStore from '@/zustand/positionSocketStore';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import { marketInfo } from '@/zustand/slices/marketSlice'
import 'react-calendar/dist/Calendar.css';

enum ListSection {
  Positions = 'Positions',
  Orders = 'Orders',
  Trades = 'Trades',
  Claims = 'Claims',
}

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

export default function Exchange() {
  const isRefreshPositionAndOrder = usePositionSocketStore(
    (state) => state.isRefreshPositionAndOrder
  );
  const setIsRefreshPositionAndOrder = usePositionSocketStore(
    (state) => state.setIsRefreshPositionAndOrder
  );
  const { shouldShowPositionLines, setShouldShowPositionLines } = useAppStore(
    (state) => state.settings
  );
  const [updatePosition, setUpdatePosition] = useState(false);
  const [updateOrder, setUpdateOrder] = useState(false);
  const [dateRange, setDateRange] = useState<Value>(null);
  const isGmw329Enabled = getGmw329Enabled();

  usePositionsData({ updatePosition, setUpdatePosition });
  useTickers();

  const { owner } = useAnchor();
  const program = useStoreProgram();
  useEffect(() => {
    if (!owner) {
      return;
    }
    if (
      isGmw329Enabled &&
      (!program?.provider?.connection || !program?.programId || !program?.coder)
    ) {
      return;
    }
    const connection = program.provider.connection;
    let logSubscriptionId: number | null = null;

    // Position event
    logSubscriptionId = connection.onLogs(
      program.programId,
      (logInfo) => {
        const TRADE_EVENT_DISCRIMINATOR = Buffer.from([
          189, 219, 127, 211, 78, 230, 97, 238,
        ]);
        const ORDER_REMOVED_DISCRIMINATOR = Buffer.from([
          84, 155, 121, 142, 240, 235, 144, 23,
        ]);
        const executionOrder = logInfo.logs.some((e) =>
          /Instruction: (CloseOrderV2|Execute.*Order)/.test(e)
        );
        logInfo.logs.forEach((e) => {
          if (e.startsWith('Program data: ')) {
            const base64Data = e.replace('Program data: ', '');
            program.coder.events.decode(base64Data);
          }
        });

        if (!executionOrder) {
          // console.log('Not execution order, skip');
          return;
        }

        void program.provider.connection
          .getTransaction(logInfo.signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
          })
          .then((tx) => {
            tx?.meta.innerInstructions?.forEach((inner) => {
              inner.instructions.forEach((ix) => {
                const data = bs58.decode(ix.data);
                if (
                  Buffer.compare(
                    data.slice(8, 16),
                    TRADE_EVENT_DISCRIMINATOR
                  ) === 0
                ) {
                  const tradeEvent = program.coder.types.decode<
                    { user?: { toBase58(): string } } | null
                  >('tradeEvent', data.slice(16));
                  // Only the connected wallet's own trades should trigger a refresh
                  if (tradeEvent?.user?.toBase58() !== owner.toBase58()) {
                    return;
                  }
                  setUpdatePosition(true);
                  setUpdateOrder(true);
                  setTimeout(() => {
                    setUpdatePosition(false);
                    setUpdateOrder(false);
                  }, 3000);
                }
                if (
                  Buffer.compare(
                    data.slice(8, 16),
                    ORDER_REMOVED_DISCRIMINATOR
                  ) === 0
                ) {
                  program.coder.types.decode('orderRemoved', data.slice(16));
                }
              });
            });
          })
          .catch((error: unknown) => {
            console.error('[exchange] failed to process program logs', error);
          });
      },
      'confirmed'
    );

    const ORDER_DISCRIMATOR = 'PXZJQQ2HEmx';
    const DISCRIMATOR_LENGTH = 8;
    const SELECTOR_OFFSET = 80;
    const selector = Buffer.concat([owner?.toBytes()]);
    let subscriptionId: number | null = null;
    const filters = [
      {
        memcmp: {
          offset: 0,
          bytes: ORDER_DISCRIMATOR,
        },
      },
      {
        memcmp: {
          offset: DISCRIMATOR_LENGTH + SELECTOR_OFFSET,
          bytes: bs58.encode(selector),
          encoding: 'base58',
        },
      },
    ];
    subscriptionId = connection.onProgramAccountChange(
      program.programId,
      (info) => {
        // const order = program.coder.accounts.decode(
        //     'order',
        //     info.accountInfo.data
        // );
        setUpdateOrder(true);
        setTimeout(() => {
          setUpdateOrder(false);
        }, 1000);
      },
      'confirmed',
      filters
    );

    return () => {
      if (isGmw329Enabled && logSubscriptionId !== null) {
        connection
          .removeOnLogsListener(logSubscriptionId)
          .catch((e) => console.error('Unsubscribe logs error:', e));
      }
      if (subscriptionId !== null) {
        connection
          .removeProgramAccountChangeListener(subscriptionId)
          .catch((e) => console.error('Unsubscribe error:', e));
      }
    };
  }, [isGmw329Enabled, owner, program, setUpdateOrder]);
  useEffect(() => {
    // console.log(
    //   'isRefreshPositionAndOrder',
    //   isRefreshPositionAndOrder,
    //   new Date().getTime()
    // );
    if (isRefreshPositionAndOrder) {
      setUpdatePosition(true);
      setTimeout(() => {
        setUpdateOrder(true);
        setTimeout(() => {
          setUpdateOrder(false);
        }, 0);
      }, 200);
      setIsRefreshPositionAndOrder(false);
    }
  }, [isRefreshPositionAndOrder, setIsRefreshPositionAndOrder]);

  const chainId = useAppStore(selectChainId);
  const closePosition = useClosePosition();
  const [selectedOrderKeys, setSelectedOrderKeys] =
    useState<string[]>(EMPTY_ARRAY);
  const [listSection, setListSection] = useLocalStorageSerializeKey(
    getSyntheticsListSectionKey(chainId ?? ''),
    ListSection.Positions
  );
  useOrdersData({
    updateOrder,
    pollingEnabled: listSection === ListSection.Orders,
  });

  const positionsCount = useAppStore(selectPositionsCount);
  const ordersCount = useAppStore(selectOrdersCountForDisplay);
  const positionsInfoData = useAppStore(selectPositionsInfo);

  const resetOptions = useAppStore(selectResetTradeOptions);
  const setTradeboxMarketTokenAddress = useAppStore(
    selectSetTradeboxMarketTokenAddress
  );

  const setTradeboxTradeType = useAppStore(selectSetTradeboxTradeType);
  const setMarketInfo = useAppStore((state) => state.markets.setMarketInfo);
  const setIndexToken = useAppStore(
    (state) => state.indexTokens.setIndexToken
  );
  const setCollateralToken = useAppStore(
    (state) => state.collateralTokens.setCollateralToken
  );
  const setMarketDirection = useAppStore(
    (state) => state.TradeboxNew.setMarketDirection
  );
  const setMarketType = useAppStore(
    (state) => state.TradeboxNew.setMarketType
  );
  const setHasIndexTokenChange = useAppStore(
    (state) => state.indexTokens.setHasIndexTokenChange
  );
  const navigate = useNavigate();
  const location = useLocation();

  const getCountBadge = (count: number) => {
    return count ? (
      <span
        style={{
          display: 'inline-block',
          color: '#A3A3A3',
          padding: '0.15rem 0.6rem',
          background: '#323232',
          borderRadius: '2rem',
          position: 'relative',
        }}
      >
        {count}{' '}
        {/* <em
                    style={{
                        display: 'inline-block',
                        background: '#FF5454',
                        width: '0.6rem',
                        height: '0.6rem',
                        borderRadius: '50%',
                        position: 'absolute',
                        top: 0,
                        right: 0,
                    }}
                ></em> */}
      </span>
    ) : null;
  };

  const tabLabels = useMemo(
    () => ({
      [ListSection.Positions]: (
        <>
          <Trans>Positions</Trans>&nbsp;{getCountBadge(positionsCount)}
        </>
      ),
      [ListSection.Orders]: (
        <>
          <Trans>Orders</Trans>&nbsp;
          {getCountBadge(ordersCount)}
        </>
      ),
      [ListSection.Trades]: <Trans>Trades</Trans>,
      [ListSection.Claims]: <Trans>Claims</Trans>,
    }),
    [positionsCount, ordersCount]
  );

  const tabOptions = useMemo(
    () => Object.keys(ListSection).map((section) => section as ListSection),
    []
  );

  const setTradeboxTradeParams = useAppStore(selectSetTradeboxTradeParams);
  const handleSelectPositionClick = useCallback(
    (tradeMode?: TradeMode, selectedPosition?: PositionInfo) => {
      if (!selectedPosition) return;

      const positionKey = selectedPosition.address.toBase58();
      const position = getByKey(positionsInfoData, positionKey);
      const marketInfo =
        selectedPosition.marketInfo as unknown as PositionMarketInfo;
      if (!marketInfo) return;

      if (getGmw235Enabled()) {
        selectIndexMarket(navigate, {
          indexToken: marketInfo.indexToken,
          search: location.search,
        });
      } else {
        setIndexToken(marketInfo.indexToken);
        if (getGmw422Enabled()) {
          setSelectedIndexToken(marketInfo.indexToken);
        } else {
          sessionStorage.setItem('selectedIndexToken', marketInfo.indexToken);
        }
      }
      setMarketInfo(marketInfo as unknown as marketInfo);
      if (getGmw456Enabled()) {
        setHasIndexTokenChange(false);
      }
      setCollateralToken(selectedPosition.collateralTokenAddress.toBase58());
      setMarketDirection(selectedPosition.isLong ? 'Long' : 'Short');

      if (tradeMode === TradeMode.Market) {
        setMarketType('Market');
      } else if (tradeMode === TradeMode.Limit) {
        setMarketType('Limit');
      }

      if (position) {
        resetOptions(position.marketInfo);
      }

      setTradeboxTradeParams({
        marketTokenAddress: selectedPosition.marketTokenAddress.toBase58(),
        collateralTokenAddress:
          selectedPosition.collateralTokenAddress.toBase58(),
        tradeMode,
      });
      setTradeboxTradeType(
        selectedPosition.isLong ? TradeType.Long : TradeType.Short
      );
      setTradeboxMarketTokenAddress(
        selectedPosition.marketTokenAddress.toBase58()
      );

      const indexName = formatMarketName(marketInfo.indexToken);
      const getTokenSymbol = (address: string) => {
        const symbol = GMX_SOLANA_TOKENS_RAW[address]?.symbol;
        return symbol === 'WGMX' ? 'GMX' : symbol;
      };
      const longTokenSymbol = getTokenSymbol(marketInfo.longToken);
      const shortTokenSymbol = getTokenSymbol(marketInfo.shortToken);
      const poolName =
        marketInfo.longToken === marketInfo.shortToken
          ? longTokenSymbol
          : `${longTokenSymbol}/${shortTokenSymbol}`;

      const longText = t`Long`;
      const shortText = t`Short`;
      const marketSelectedText = t`market selected`;
      const directionText = selectedPosition.isLong ? longText : shortText;
      const message = `${directionText} ${indexName} [${poolName}] ${marketSelectedText}.`;
      helperNotice.success(message);
    },
    [
      positionsInfoData,
      resetOptions,
      setTradeboxTradeParams,
      setTradeboxTradeType,
      setTradeboxMarketTokenAddress,
      navigate,
      location.search,
      setIndexToken,
      setMarketInfo,
      setCollateralToken,
      setMarketDirection,
      setMarketType,
      setHasIndexTokenChange,
    ]
  );

  const handleTabChange = useCallback(
    (section: ListSection) => {
      setListSection(section);
      setDateRange(null);
    },
    [setListSection]
  );
  const handlePositionListOrdersClick = useCallback(() => { }, []);
  const hanldeClosePositionClick = useCallback(
    (key: string) => {
      requestAnimationFrame(() => closePosition(key));
    },
    [closePosition]
  );
  const openSettings = useCallback(() => { }, []);

  const { trigger: cancelOrder, isSending: isCancelOrdersProcessing } =
    useTriggerCancelOrder();
  const onCancelSelectedOrders = useCallback(() => {
    if (!selectedOrderKeys?.length) return;
    // Execute cancel orders sequentially
    const cancelOrders = async () => {
      for (const orderKey of selectedOrderKeys) {
        try {
          await cancelOrder({
            skipPreflight: false,
            orderAddress: orderKey,
          });
        } catch (error) {
          console.error(`Failed to cancel order ${orderKey}:`, error);
        }
      }
      setSelectedOrderKeys(EMPTY_ARRAY);
    };

    void cancelOrders();
  }, [cancelOrder, selectedOrderKeys, setSelectedOrderKeys]);

  const renderActiveList = () => {
    switch (listSection) {
      case ListSection.Positions:
        return (
          <PositionList
            onOrdersClick={handlePositionListOrdersClick}
            onSelectPositionClick={handleSelectPositionClick}
            onClosePositionClick={hanldeClosePositionClick}
            openSettings={openSettings}
            onCancelOrder={onCancelSelectedOrders}
          />
        );
      case ListSection.Orders:
        return <OrderList />;
      case ListSection.Trades:
        return <TradeHistoryList dateRange={dateRange} />;
      case ListSection.Claims:
        return <ClaimHistoryList dateRange={dateRange} />;
      default:
        return null;
    }
  };

  return (
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
        {(listSection === ListSection.Positions ||
          listSection === ListSection.Orders) && (
            <div className="Exchange-setting-section">
              <div className="setting-row">
                <div className="setting-label">{t`Show Positions on Chart`}</div>
                <div className="setting-value">
                  <ToggleSwitch
                    isChecked={shouldShowPositionLines}
                    setIsChecked={() =>
                      setShouldShowPositionLines(!shouldShowPositionLines)
                    }
                  />
                </div>
              </div>
            </div>
          )}

        {/* <div className="align-right Exchange-should-show-position-lines">
                    {listSection === ListSection.Orders &&
                        selectedOrderKeys.length > 0 && (
                            <button
                                className="muted cancel-order-btn text-body-medium"
                                disabled={isCancelOrdersProcessing}
                                type="button"
                                onClick={onCancelSelectedOrders}
                            >
                                <Plural
                                    value={selectedOrderKeys.length}
                                    one="Cancel order"
                                    other="Cancel # orders"
                                />
                            </button>
                        )}
                </div> */}
      </div>

      {renderActiveList()}
    </div>
  );
}
