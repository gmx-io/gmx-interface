import { t, Trans } from '@lingui/macro';
import { BN } from '@coral-xyz/anchor';
import './index.scss';
import closeIcons from '@/img/header/close.svg';
import cx from 'classnames';
import { useShallow } from 'zustand/react/shallow';
import { AnimatePresence, motion, Variants } from 'framer-motion';
import React, {
  memo,
  PropsWithChildren,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MdClose } from 'react-icons/md';
import { RemoveScroll } from 'react-remove-scroll';
import { PositionInfo } from '@/selectors/position/types';
// import { formatLiquidationPrice, formatParseUsdToBN, formatPriceUsd } from '@/utils/legacy';
import { GMX_SOLANA_TOKENS_RAW, GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS } from '@/config/program';
import {
  Table,
  TableTd,
  TableTh,
  TableTheadTr,
  TableTr,
} from '@/components/Common/Table/Table';
import {
  formatLiquidationPrice,
  formatAmount,
  formatParseUsdToBN,
  formatPriceUsd,
  formatTokenAmount,
  formatUsd,
  formatDivision,
  formatPercentage,
  formComputeReceiveUsd,
} from '@/utils/legacy/format';
import IconTpEdit from '@/img/tp-edit.svg?react';
import IconTpClose from '@/img/tp-close.svg?react';
import { OrderInfo } from '@/selectors/order/types';
import {
  isDecreaseOrderType,
  isLimitIncreaseOrderType,
  isLimitSwapOrderType,
} from '@/utils/order/isOrderType';
import { getTriggerNameByOrderType } from '@/utils/order/getTriggerNameByOrderType';
import { useOrderErrors } from '@/hooks/orderHooks/useOrderErrors';
import Tooltip from '@/components/Common/Tooltip/Tooltip';
import { PositionOrderInfo, OrderType } from '@/selectors/order/types';
import StatsTooltipRow from '@/components/Common/Tooltip/StatsTooltipRow';
import { getTriggerThresholdType } from '@/utils/order/getTriggerThresholdType';
import { formatAcceptablePriceDisplay } from '@/utils/order/formatAcceptablePriceDisplay';
import { BN_ONE, BN_NEG_ONE, BN_ZERO } from '@/config/constants';
import { useAppStore } from '@/zustand/useAppStore';
// import { getSimulateOrderBySLTP } from '@/components/TradeBoxNew/utils/getSimulateResult';
import { useSimulateOrderBySLTP } from '@/components/TradeBoxNew/Hooks/useSimulateOrder';
import { getNormalizedTokenSymbolForFetchingPrice } from '@/utils/token/getNormalizedTokenSymbolForFetchingPrice';
import IconTpIncrease from '@/img/tp-increase.svg?react';
import TpSlDecrease from '../TpSlDecrease';
import TpDecrease from '../TpDecrease';
import SlDecrease from '../SlDecrease';
import { useStoreProgram } from '@/contexts/anchor';
import { useTriggerCancelOrder } from '@/hooks/triggerHooks/useTriggerCancelOrder';
import { useMedia } from 'react-use';
import { getGmw385Enabled } from '@/config/featureFlagEnable';
const FADE_VARIANTS: Variants = {
  hidden: { opacity: 0, pointerEvents: 'none' },
  visible: { opacity: 1, pointerEvents: 'auto' },
};

const VISIBLE_STYLES: React.CSSProperties = {
  overflow: 'hidden',
  position: 'fixed',
};

const HIDDEN_STYLES: React.CSSProperties = {
  overflow: 'visible',
  position: 'fixed',
};

const TRANSITION = { duration: 0.2 };

function getPositionIndexTokenAddress(position: PositionInfo) {
  const indexToken = position.marketInfo?.indexToken;

  if (typeof indexToken === 'string') {
    return indexToken;
  }

  return indexToken?.address?.toBase58();
}

export type ModalProps = PropsWithChildren<{
  className?: string;
  isVisible?: boolean;
  setIsVisible: (isVisible: boolean) => void;
  zIndex?: number;
  label?: React.ReactNode;
  headerContent?: React.ReactNode;
  footerContent?: ReactNode;
  onAfterOpen?: () => void;
  contentPadding?: boolean;
  qa?: string;
  noDivider?: boolean;
  position: PositionInfo;
  onOperateClick?: (type: string) => void;
}>;

export default function TPSLDialog({
  className,
  isVisible,
  label,
  zIndex,
  children,
  headerContent,
  footerContent,
  contentPadding = true,
  noDivider = false,
  onAfterOpen,
  setIsVisible,
  qa,
  position,
  onOperateClick,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);
  const [showEditTpSl, setShowEditTpSl] = useState(false);
  const isMobile = useMedia('(max-width: 768px)');
  const [modalHeight, setModalHeight] = useState<string>(
    'calc(100vh - 4.8rem)'
  );

  useEffect(() => {
    if (!isMobile) return;

    const updateModalHeight = () => {
      const header = document.querySelector('.App-header');
      if (header instanceof HTMLElement) {
        const actualHeaderHeight = header.offsetHeight;
        setModalHeight(`calc(100vh - ${actualHeaderHeight}px)`);
      } else {
        const headerContainer = document.querySelector('.App-header-container');
        if (headerContainer instanceof HTMLElement) {
          const actualHeaderHeight = headerContainer.offsetHeight;
          setModalHeight(`calc(100vh - ${actualHeaderHeight}px)`);
        } else {
          setModalHeight('calc(100vh - 4.8rem)');
        }
      }
    };

    updateModalHeight();
    window.addEventListener('resize', updateModalHeight);

    return () => {
      window.removeEventListener('resize', updateModalHeight);
    };
  }, [isMobile]);

  useEffect(() => {
    function close(e: KeyboardEvent) {
      if (e.keyCode === 27 && setIsVisible) {
        setIsVisible(false);
      }
    }
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [setIsVisible]);

  useEffect(() => {
    if (typeof onAfterOpen === 'function') onAfterOpen();
  }, [onAfterOpen]);

  useEffect(
    function blurOutsideOnVisible() {
      if (isVisible) {
        const focusedElement = document.activeElement;
        const isNotBody = !document.body.isSameNode(focusedElement);
        const isOutside = !modalRef.current?.contains(focusedElement);

        if (focusedElement && isNotBody && isOutside) {
          (focusedElement as HTMLElement).blur();
        }
      }
    },
    [isVisible]
  );

  const style = useMemo(() => ({ zIndex }), [zIndex]);

  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const [tabLists, setTabLists] = useState([
    {
      text: <Trans>All</Trans>,
      key: 'all',
      badge: 0,
    },
    {
      text: <Trans>Take Profit</Trans>,
      key: 'tp',
      badge: 0,
    },
    {
      text: <Trans>Stop Loss</Trans>,
      key: 'sl',
      badge: 0,
    },
  ]);

  const [dataLists, setDataLists] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // all tp sl

  useEffect(() => {
    const prevTabs = tabLists.map((tab) => {
      if (tab.key === 'tp') {
        tab.badge = position?.tpToken?.length;
      } else if (tab.key === 'sl') {
        tab.badge = position?.slToken?.length;
      }
      return tab;
    });
    setTabLists(prevTabs);
  }, [position]);

  useEffect(() => {
    if (activeTab === 'all') {
      setDataLists([
        ...(position?.tpToken || []),
        ...(position?.slToken || []),
      ]);
    } else if (activeTab === 'tp') {
      setDataLists(position?.tpToken?.length > 0 ? position?.tpToken : []);
    } else if (activeTab === 'sl') {
      setDataLists(position?.slToken?.length > 0 ? position?.slToken : []);
    }
  }, [activeTab, position]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={cx('custom-modal', className)}
          ref={modalRef}
          style={style}
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={FADE_VARIANTS}
          transition={TRANSITION}
        >
          <div
            className="custom-modal-backdrop"
            style={isVisible ? VISIBLE_STYLES : HIDDEN_STYLES}
            onClick={() => setIsVisible(false)}
          />
          <div
            className="custom-modal-content"
            onClick={stopPropagation}
            data-qa={qa}
            style={
              isMobile
                ? { height: modalHeight, maxHeight: modalHeight }
                : undefined
            }
          >
            <div className="custom-modal-header-wrapper">
              <div className="custom-modal-title-bar">
                <div className="custom-modal-title">{label}</div>
                <div
                  className="custom-modal-close-button"
                  onClick={() => setIsVisible(false)}
                  style={{ cursor: 'pointer' }}
                >
                  <img src={closeIcons} alt="close" width={20} height={20} />
                </div>
              </div>
              <div className="custom-modal-title-data">
                <div className="custom-modal-data-entry-price">
                  <p>
                    <Trans>Entry Price</Trans>
                  </p>
                  <span>
                    {formatPriceUsd(
                      formatParseUsdToBN('1', position?.decimals).mul(
                        new BN(position?.entry_price?.toString() || 0)
                      ),
                      {
                        fallbackToZero: true,
                        isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(position?.marketInfo?.indexToken)
                      }
                    ) || '...'}
                  </span>
                </div>
                <div className="custom-modal-data-mark-price">
                  <p>
                    <Trans>Mark Price</Trans>
                  </p>
                  <span>
                    {formatPriceUsd(
                      formatParseUsdToBN('1', position?.decimals).mul(
                        new BN(position?.unitPrice || 0)
                      ),
                      {
                        fallbackToZero: true,
                        isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(position?.marketInfo?.indexToken)
                      }
                    ) || '...'}
                  </span>
                </div>
                <div className="custom-modal-data-liquidation-price">
                  <p>
                    <Trans>Liquidation Price</Trans>
                  </p>
                  <span>
                    {formatLiquidationPrice(
                      formatParseUsdToBN('1', position?.decimals).mul(
                        new BN(position?.liquidation_price?.toString() || 0)
                      ),
                      {
                        displayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(position?.marketInfo?.indexToken) ? 5 : GMX_SOLANA_TOKENS_RAW[position.marketInfo?.indexToken].decimals,
                        isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(position?.marketInfo?.indexToken)
                      }
                    ) || '...'}
                  </span>
                </div>
              </div>
              <div className="custom-modal-tabs">
                <div className="custom-modal-tabs-left">
                  {tabLists &&
                    tabLists.map((item) => {
                      return (
                        <div
                          key={item.key}
                          className={`custom-modal-tab ${activeTab === item.key ? 'tab-active' : ''}`}
                          onClick={() => {
                            setActiveTab(item.key);
                          }}
                        >
                          <span>{item.text}</span>
                          {item.badge > 0 && <em>{item.badge}</em>}
                        </div>
                      );
                    })}
                </div>
                <div className="custom-modal-tabs-right">
                  {/* <div
                    className="custom-modal-tab-cancel"
                    onClick={() => onOperateClick && onOperateClick('cancel')}
                  >
                    {t`Cancel all`}
                  </div> */}
                  {!isMobile && (
                    <div
                      className="custom-modal-tab-add"
                      onClick={() => setShowEditTpSl(true)}
                    >
                      {t`Add TP/SL`} &nbsp;
                      <IconTpIncrease />
                    </div>
                  )}
                </div>
                <TpSlDecrease
                  position={position}
                  isVisible={showEditTpSl}
                  onClose={() => setShowEditTpSl(false)}
                  onConfirm={() => { }}
                />
              </div>
            </div>
            {!noDivider && <div className="divider" />}
            <RemoveScroll className="overflow-auto">
              <div
                className={cx('custom-modal-body', {
                  'no-content-padding': !contentPadding,
                })}
                ref={modalBodyRef}
              >
                <div className="custom-modal-body-list">
                  {!isMobile && (
                    <div className="min-h-[32rem]">
                      <Table>
                        <thead className="custom-modal-body-header">
                          <TableTheadTr>
                            <TableTh>
                              <Trans>TYPE</Trans>
                            </TableTh>
                            <TableTh>
                              <Trans>SIZE（% OF POSITION）</Trans>
                            </TableTh>
                            <TableTh>
                              <Trans>TRIGGER PRICE</Trans>
                            </TableTh>
                            <TableTh>
                              <Trans>EST.PNL</Trans>
                            </TableTh>
                            <TableTh>
                              <Trans>RECEIVE</Trans>
                            </TableTh>
                            <TableTh></TableTh>
                          </TableTheadTr>
                        </thead>
                        <tbody>
                          {dataLists.length === 0 && (
                            <TableTr hoverable={false} bordered={false}>
                              <TableTd colSpan={7}>
                                <div className="text-body-medium py-16 text-center text-[#A3A3A3]">
                                  {t`No data available`}
                                </div>
                              </TableTd>
                            </TableTr>
                          )}
                          {dataLists?.map((item) => {
                            return (
                              <TPSLItem
                                key={item?.address?.toBase58()}
                                order={item}
                                sourceData={dataLists}
                                position={position}
                                setIsVisible={setIsVisible}
                              />
                            );
                          })}
                        </tbody>
                      </Table>
                    </div>
                  )}

                  {isMobile && (
                    <div className="custom-modal-mobile-card-list min-h-[32rem]">
                      {dataLists.length === 0 && (
                        <div className="text-body-medium py-16 text-center text-[#A3A3A3]">
                          {t`No data available`}
                        </div>
                      )}
                      {dataLists?.map((item) => {
                        return (
                          <TPSLMobileCard
                            key={item?.address?.toBase58()}
                            order={item}
                            position={position}
                            sourceData={dataLists}
                            setIsVisible={setIsVisible}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </RemoveScroll>
            {/* Add TP/SL */}
            {isMobile && (
              <div className="custom-modal-mobile-footer">
                <button
                  className="custom-modal-mobile-footer-add-btn"
                  onClick={() => setShowEditTpSl(true)}
                >
                  <Trans>Add TP/SL</Trans>
                </button>
              </div>
            )}
            {footerContent && (
              <>
                <div className="divider" />
                <div>{footerContent}</div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const TPSLItem = memo(
  ({
    order,
    position,
    sourceData,
    setIsVisible,
  }: {
    order: OrderInfo;
    position: PositionInfo;
    sourceData: OrderInfo[];
    setIsVisible: (isVisible: boolean) => void;
  }) => {
    const [showTpDecrease, setShowTpDecrease] = useState(false);
    const [showSlDecrease, setShowSlDecrease] = useState(false);

    const handleEdit = useCallback(() => {
      switch (order.kind.toString()) {
        case '7':
          console.log(111);
          setShowTpDecrease(true);
          break;
        case '8':
          setShowSlDecrease(true);
          break;

        default:
          break;
      }
    }, []);

    const { trigger: triggerCancelOrder } = useTriggerCancelOrder();
    const handleClose = useCallback(
      async (orderAddress: string, skipPreflight?: boolean) => {
        if (!orderAddress) return;

        await triggerCancelOrder({
          skipPreflight: skipPreflight || false,
          orderAddress,
        });

        if (sourceData.length === 1) {
          setIsVisible(false);
        }
      },
      [triggerCancelOrder]
    );

    return (
      <>
        <TableTr>
          <TableTd>
            {/* type */}
            <OrderItemTypeLabel order={order} />
          </TableTd>
          <TableTd>
            {/* size of position */}
            <OrderSizeOfPosition order={order} />
          </TableTd>
          <TableTd>
            {/* trgigger price*/}
            <OrderTriggerPrice
              order={order}
              indexToken={getPositionIndexTokenAddress(position)}
            />
          </TableTd>
          <TableTd>
            {/* est.pnl */}
            <OrderPnl order={order} type="pnl" />
          </TableTd>
          <TableTd>
            {/* receive */}
            <OrderPnl order={order} type="receive" />
          </TableTd>
          <TableTd>
            {/* edit or close */}
            <div className="custom-modal-edit-box">
              <IconTpEdit
                fill=""
                className="custom-modal-edit-box-icon-edit"
                onClick={handleEdit}
              />
              <IconTpClose
                className="custom-modal-edit-box-icon-close"
                onClick={() => handleClose(order.orderAddress.toBase58())}
              />
            </div>
          </TableTd>
        </TableTr>
        <TpDecrease
          order={order}
          indexTokenAddress={getPositionIndexTokenAddress(position)}
          isVisible={showTpDecrease}
          onClose={() => setShowTpDecrease(false)}
        />
        <SlDecrease
          order={order}
          indexTokenAddress={getPositionIndexTokenAddress(position)}
          isVisible={showSlDecrease}
          onClose={() => setShowSlDecrease(false)}
        />
      </>
    );
  }
);

TPSLItem.displayName = 'TPSLItem';

// type
function OrderItemTypeLabel({ order }: { order: OrderInfo }) {
  const { errors, level } = useOrderErrors(order.orderAddress.toBase58());

  const handle = isDecreaseOrderType(order.orderType)
    ? getTriggerNameByOrderType(order.orderType)
    : t`Limit`;

  if (errors.length === 0) {
    return <>{handle}</>;
  }

  return (
    <Tooltip
      disableHandleStyle
      handle={
        <span
          className={cx(
            'cursor-help underline decoration-dashed decoration-1 underline-offset-2',
            {
              'text-red-500 decoration-red-500/50': level === 'error',
              'text-yellow-500 decoration-yellow-500/50': level === 'warning',
            }
          )}
        >
          {handle}
        </span>
      }
      content={
        errors.length ? (
          <>
            {errors.map((error) => (
              <div className="mt-0" key={error.key}>
                <span
                  className={cx({
                    'text-red-500': error.level === 'error',
                    'text-yellow-500': error.level === 'warning',
                  })}
                >
                  {error.msg}
                </span>
              </div>
            ))}
          </>
        ) : null
      }
    />
  );
}

// size of position
function OrderSizeOfPosition({ order }: { order: OrderInfo }) {
  const positionOrder = order as PositionOrderInfo;

  const percent = formatPercentage(
    positionOrder?.sizeDeltaPercentUsd?.toString()
  );

  function getCollateralLabel() {
    if (isDecreaseOrderType(positionOrder.orderType)) {
      return t`Collateral Delta`;
    }
    return t`Collateral`;
  }

  function getCollateralText() {
    const initialCollateralTokenAddress =
      GMX_SOLANA_TOKENS_RAW[order?.initialCollateralTokenAddress];

    const tokenAmountText = formatAmount(
      positionOrder.initialCollateralDeltaAmount,
      initialCollateralTokenAddress?.decimals
    );

    const tokenAmountSymbol = initialCollateralTokenAddress?.symbol;
    return `${tokenAmountText}  ${tokenAmountSymbol}`;
  }

  if (percent.indexOf('100') !== -1) {
    return (
      <>
        <em>{t`Full Position Close`}</em>
      </>
    );
  }

  return (
    <Tooltip
      disableHandleStyle
      handle={<TitleWithIcon bordered order={order} percent={percent} />}
      position="bottom-start"
      content={
        <>
          <StatsTooltipRow
            label={getCollateralLabel()}
            value={getCollateralText()}
            showDollar={false}
          />
        </>
      }
    />
  );
}

function TitleWithIcon({
  order,
  percent,
  bordered,
}: {
  order: OrderInfo;
  percent?: string;
  bordered?: boolean;
}) {
  const { sizeDeltaUsd } = order;

  const sizeText = formatUsd(
    sizeDeltaUsd.mul(
      isLimitIncreaseOrderType(order.orderType) ? BN_ONE : BN_NEG_ONE
    ),
    {
      displayPlus: true,
    }
  );

  return (
    <span
      className={cx({
        'cursor-help border-b border-dashed border-b-gray-400': bordered,
      })}
    >
      {sizeText}
      <em className="percent">(-{percent})</em>
    </span>
  );
}
// trigger price
function OrderTriggerPrice({
  order,
  indexToken,
}: {
  order: OrderInfo;
  indexToken?: string;
}) {
  const positionOrder = order as PositionOrderInfo;
  const resolvedIndexToken = getGmw385Enabled()
    ? indexToken
    : positionOrder?.marketInfo?.indexToken;
  const decimals = GMX_SOLANA_TOKENS_RAW[resolvedIndexToken]?.decimals;
  const triggerPrice = formatPriceUsd(
    formatParseUsdToBN('1', decimals).mul(
      new BN(positionOrder?.triggerPrice?.toString() || 0)
    ),
    {
      fallbackToZero: true,
      isDisplayDecimals:
        GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(resolvedIndexToken)
    }
  );
  const acceptablePriceDisplay = formatAcceptablePriceDisplay({
    orderType: positionOrder.orderType,
    isLong: positionOrder.isLong,
    acceptablePrice: positionOrder.acceptablePrice,
    triggerPrice: positionOrder.triggerPrice,
    indexTokenDecimals: decimals,
    fallbackToZero: true,
    isDisplayDecimals: GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(
      resolvedIndexToken
    ),
  });
  const triggerThresholdType = getTriggerThresholdType(
    order?.orderType,
    order?.isLong
  );

  return (
    <Tooltip
      handle={`${triggerThresholdType || ''} ${triggerPrice}`}
      position="bottom-end"
      renderContent={() => (
        <>
          <StatsTooltipRow
            label={t`Acceptable Price`}
            value={acceptablePriceDisplay}
            showDollar={false}
          />
        </>
      )}
    />
  );
}

// est pnl
function OrderPnl({
  order,
  type,
}: {
  order: OrderInfo;
  type: string;
}) {
  const { tokenPriceMap, tickers } = useAppStore(
    useShallow((state) => ({
      tokenPriceMap: state.tickersState.tokenPriceMap,
      tickers: state.tickersState.tickers,
    }))
  );
  const positionMap = useAppStore((state) => state.positionState.positionMap);
  const graphObj = useAppStore((state) => state.TradeboxNew.graphObj);
  const marketBase64Map = useAppStore((state) => state.markets.marketBase64Map);
  const oldPostionBase64 = positionMap?.get(order?.positionAddress?.toBase58());
  const storeProgram = useStoreProgram();
  const {
    positionPendingPnl,
    positionNetValue,
    positionSizeInUsd,
    collateralTokenAddress,
    sizeDeltaUsd,
  } = order || {};
  const remainingSizeInUsd = positionSizeInUsd.sub(sizeDeltaUsd);
  const collateralTokenUnitPrice = tokenPriceMap.get(
    collateralTokenAddress.toBase58()
  )?.unitPrice;
  const newNetValue = new BN(positionNetValue || 0)
    .mul(remainingSizeInUsd)
    .div(positionSizeInUsd);
  let amountValue = new BN(positionNetValue || 0).sub(newNetValue);
  if (positionPendingPnl > 0) {
    const pnLRealize = sizeDeltaUsd
      .mul(new BN(positionPendingPnl))
      .div(positionSizeInUsd);
    amountValue = amountValue.sub(pnLRealize);
  }
  const amount = amountValue.div(new BN(collateralTokenUnitPrice));
  order.amount = amount;
  // order.graphObj = graphObj;
  // order.storeProgram = storeProgram;
  // order.marketBase64Map = marketBase64Map;

  const kind = order?.orderType === 7 ? 'LimitDecrease' : 'StopLossDecrease';

  const [pnl, setPnl] = useState<BN>();
  const [receive, setReceive] = useState<BN>();
  const [pnlPercentage, setPnlPercentage] = useState<string>('0.00');
  const simulateOrderFunc = useSimulateOrderBySLTP(
    kind,
    order,
    oldPostionBase64
  );

  useEffect(() => {
    if (oldPostionBase64) {
      simulateOrderFunc().then((res) => {
        if (res?.reportData) {
          const { pnl, output_amounts } = res.reportData;
          setPnl(pnl.pnl);
          setReceive(output_amounts?.output_amount);

          if (pnl?.pnl && positionNetValue) {
            const pnlValue = Number(pnl.pnl.toString());
            const pendingPnlValue = Number(positionNetValue);
            // console.log('pnlValue', pnlValue, pendingPnlValue);

            if (pendingPnlValue !== 0) {
              const percentage = (pnlValue / pendingPnlValue) * 100;
              setPnlPercentage(percentage.toFixed(2));
            }
          }
        }
      });
    }
  }, [oldPostionBase64, simulateOrderFunc, positionNetValue]);

  const decimals =
    GMX_SOLANA_TOKENS_RAW[order?.collateralTokenAddress]?.decimals;
  const symbol = GMX_SOLANA_TOKENS_RAW[order?.collateralTokenAddress]?.symbol;

  let collateralPrice = new BN('0');
  const collateralInfo = tickers.filter((item) => {
    return item.symbol === getNormalizedTokenSymbolForFetchingPrice(symbol);
  });
  if (collateralInfo.length > 0) {
    collateralPrice = new BN(collateralInfo[0]?.price);
  }

  const receiveAmount = formatTokenAmount(receive, decimals, symbol, {
    useCommas: true,
    showDollarSign: false,
  });
  let receivePrice = new BN(0);
  if (receiveAmount > 0) {
    receivePrice = formComputeReceiveUsd(receiveAmount, collateralPrice, 20);
  }

  if (type === 'receive') {
    return (
      <>
        <div className="flex">
          <p>
            {formatTokenAmount(receive, decimals, symbol, {
              useCommas: true,
            })}
          </p>{' '}
          &nbsp;
          <span className="text-xs text-[#A3A3A3]">
            ({receivePrice?.toString()})
          </span>
        </div>
      </>
    );
  }

  const isPnlPositive = pnl && new BN(pnl).gt(new BN(0));

  return (
    <>
      <div className="flex" style={{ whiteSpace: 'nowrap' }}>
        <span className={`text-sm ${isPnlPositive ? 'positive' : 'negative'}`}>
          {formatUsd(pnl, { signed: true }) || '$0.00'}
        </span>{' '}
        &nbsp;
        <span className={`text-xs ${isPnlPositive ? 'positive' : 'negative'}`}>
          ({pnlPercentage}%)
        </span>
      </div>
    </>
  );
}

const TPSLMobileCard = memo(
  ({
    order,
    position,
    sourceData,
    setIsVisible,
  }: {
    order: OrderInfo;
    position: PositionInfo;
    sourceData: OrderInfo[];
    setIsVisible: (isVisible: boolean) => void;
  }) => {
    const [showTpDecrease, setShowTpDecrease] = useState(false);
    const [showSlDecrease, setShowSlDecrease] = useState(false);

    const handleEdit = useCallback(() => {
      if ('kind' in order) {
        switch (order.kind.toString()) {
          case '7':
            setShowTpDecrease(true);
            break;
          case '8':
            setShowSlDecrease(true);
            break;
          default:
            break;
        }
      }
    }, [order]);

    const { trigger: triggerCancelOrder } = useTriggerCancelOrder();
    const handleClose = useCallback(
      async (orderAddress: string, skipPreflight?: boolean) => {
        if (!orderAddress) return;

        await triggerCancelOrder({
          skipPreflight: skipPreflight || false,
          orderAddress,
        });

        if (sourceData.length === 1) {
          setIsVisible(false);
        }
      },
      [triggerCancelOrder, sourceData.length, setIsVisible]
    );

    const orderType = isDecreaseOrderType(order.orderType)
      ? getTriggerNameByOrderType(order.orderType)
      : t`Limit`;

    const positionOrder = order as PositionOrderInfo;
    const percent =
      'sizeDeltaPercentUsd' in positionOrder &&
        typeof positionOrder.sizeDeltaPercentUsd === 'number'
        ? formatPercentage(positionOrder.sizeDeltaPercentUsd)
        : '0%';

    let indexToken = positionOrder.marketInfo?.indexToken;
    let decimals = 18;

    if (getGmw385Enabled()) {
      indexToken = getPositionIndexTokenAddress(position);
      decimals = GMX_SOLANA_TOKENS_RAW[indexToken]?.decimals;
    } else if (indexToken) {
      const tokenData = GMX_SOLANA_TOKENS_RAW[indexToken as any];
      if (tokenData?.decimals) {
        decimals = tokenData.decimals;
      }
    }
    const triggerPrice =
      'triggerPrice' in positionOrder
        ? formatPriceUsd(
          formatParseUsdToBN('1', decimals).mul(
            new BN(positionOrder.triggerPrice?.toString() || 0)
          ),
          {
            fallbackToZero: true,
            isDisplayDecimals:
              GMX_SOLANA_FOREX_PRECISION_MARKET_TOKENS.includes(indexToken)
          }
        )
        : '$0.00';
    const triggerThresholdType = getTriggerThresholdType(
      order?.orderType,
      order?.isLong
    );

    return (
      <>
        <div className="custom-modal-mobile-card">
          <div className="custom-modal-mobile-card-row">
            <div className="custom-modal-mobile-card-row-label">
              <Trans>Type</Trans>
            </div>
            <div className="custom-modal-mobile-card-row-value">
              {orderType}
            </div>
          </div>

          <div className="custom-modal-mobile-card-row">
            <div className="custom-modal-mobile-card-row-label">
              <Trans>Size (% of position)</Trans>
            </div>
            <div className="custom-modal-mobile-card-row-value right">
              {percent.indexOf('100') !== -1 ? (
                <em>{t`Full Position Close`}</em>
              ) : (
                <>
                  {'sizeDeltaUsd' in order && (
                    <span>
                      {formatUsd(order.sizeDeltaUsd.mul(BN_NEG_ONE), {
                        displayPlus: false,
                      })}
                    </span>
                  )}
                  {/* <span className="text-xs text-gray-400">(-{percent})</span> */}
                </>
              )}
            </div>
          </div>

          <div className="custom-modal-mobile-card-row">
            <div className="custom-modal-mobile-card-row-label">
              <Trans>Trigger Price</Trans>
            </div>
            <div className="custom-modal-mobile-card-row-value">
              {triggerThresholdType || ''} {triggerPrice}
            </div>
          </div>

          <div className="custom-modal-mobile-card-row">
            <div className="custom-modal-mobile-card-row-label">
              <Trans>Est. PNL</Trans>
            </div>
            <div className="custom-modal-mobile-card-row-value">
              <OrderPnl order={order} type="pnl" />
            </div>
          </div>

          <div className="custom-modal-mobile-card-row">
            <div className="custom-modal-mobile-card-row-label">
              <Trans>Receive</Trans>
            </div>
            <div className="custom-modal-mobile-card-row-value right">
              <OrderPnl order={order} type="receive" />
            </div>
          </div>

          <div className="custom-modal-mobile-card-actions">
            <button className="edit-btn" onClick={handleEdit}>
              <Trans>Edit</Trans>
            </button>
            <button
              className="cancel-btn"
              onClick={() => {
                if ('orderAddress' in order) {
                  handleClose(order.orderAddress.toBase58());
                }
              }}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <Trans>Cancel</Trans>
              <IconTpClose
                width={16}
                height={16}
                style={{ color: '#FF5454' }}
              />
            </button>
          </div>
        </div>

        <TpDecrease
          order={order}
          indexTokenAddress={getPositionIndexTokenAddress(position)}
          isVisible={showTpDecrease}
          onClose={() => setShowTpDecrease(false)}
        />
        <SlDecrease
          order={order}
          indexTokenAddress={getPositionIndexTokenAddress(position)}
          isVisible={showSlDecrease}
          onClose={() => setShowSlDecrease(false)}
        />
      </>
    );
  }
);

TPSLMobileCard.displayName = 'TPSLMobileCard';
