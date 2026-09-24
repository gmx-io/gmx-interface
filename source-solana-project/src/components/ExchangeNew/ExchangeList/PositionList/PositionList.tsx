/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { BottomTablePagination } from '@/components/Common/Pagination/BottomTablePagination';
import {
  Table,
  TableTh,
  TableTheadTr,
} from '@/components/Common/Table/Table';
import { PositionItem } from '@/components/ExchangeNew/ExchangeList/PositionList/PositionItem';
import { OrderEditorContainer } from '@/components/OrderEditor/OrderEditorContainer';
import { NEW_EXCHANGE_LIST_PER_PAGE } from '@/config/ui';
import { GMX_SOLANA_TOKENS_RAW } from '@/config/program';
import { useAnchor } from '@/contexts/anchor';
import { formatMarketName } from '@/components/TradeBoxNew/utils/formatMarketName';
import MarketDecrease from './components/MarketDecrease';
import TpSlDecrease from './components/TpSlDecrease';
import EditCollateral from './components/EditCollateral';
import { selectIsPositionLoading } from '@/selectors/position/baseSelectors';
import { PositionInfo } from '@/selectors/position/types';
import { selectPositionEditorSetPositionAddress } from '@/selectors/positionEditor/baseSelectors';
import { selectShowPnlAfterFees } from '@/selectors/setting/baseSelectors';
import { TradeMode } from '@/selectors/trade/types';
import { useAppStore } from '@/zustand/useAppStore';
import { t, Trans } from '@lingui/macro';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { selectIndexMarket } from '@/utils/market/selectIndexMarket';
import { useMedia } from 'react-use';
import TPSLDialog from './components/TPSLDialog/index';
import ShareDialog from './components/ShareDialog';
import { TableScrollFadeContainer } from '@/components/Common/Table/TableScrollFade/TableScrollFade';
import LoadingComponent from '@/utils/LoadingComponent';
import { getTableEmptyStateClass } from '@/config/tableHeights';

type Props = {
  onSelectPositionClick: (
    tradeMode?: TradeMode,
    position?: PositionInfo
  ) => void;
  onClosePositionClick: (key: string) => void;
  onOrdersClick: (positionKey: string, orderKey: string | undefined) => void;
  onCancelOrder: (key: string) => void;
  openSettings: () => void;
  hideActions?: boolean;
};

function PositionList(p: Props) {
  const [updatePosition, setUpdatePosition] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [orderInfo, setOrderInfo] = useState<PositionInfo | null>(null);
  const isScreen1024 = useMedia('(max-width: 1024px)');
  const {
    onClosePositionClick,
    onOrdersClick,
    onSelectPositionClick,
    openSettings,
    onCancelOrder,
    hideActions,
  } = p;
  const { owner } = useAnchor();
  const positions = useAppStore((state) => state.positionState.positions);
  const positionsData = useMemo(() => Object.values(positions), [positions]);
  const [page, setPage] = useState(1);

  // console.log('positionsData==========', positions);

  const setEditingPositionKey = useAppStore(
    selectPositionEditorSetPositionAddress
  );
  const isLoading = useAppStore(selectIsPositionLoading);

  const itemsPerPage = isScreen1024 ? 6 : NEW_EXCHANGE_LIST_PER_PAGE;

  const currentPagePositions = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return positionsData.slice(startIndex, endIndex);
  }, [positionsData, page, itemsPerPage]);

  const pageCount = Math.ceil(positionsData.length / itemsPerPage);

  useEffect(() => {
    setPage(1);
  }, [isScreen1024]);

  const onEditTPSLOrder = useCallback(
    (position?: PositionInfo, type?: string) => {
      if (!position) return;

      if (type === 'edit') {
        setIsVisible(true);
        setOrderInfo(position);
      } else {
        // ====
      }
    },
    []
  );

  useEffect(() => {
    if (isVisible && orderInfo) {
      const updatedPosition = positionsData.find(
        (position) =>
          position.address.toBase58() === orderInfo.address.toBase58()
      );

      if (updatedPosition) {
        setOrderInfo(updatedPosition);
      }
    }
  }, [positionsData, isVisible, positions]);

  const onOperateClick = (type: string) => { };

  const direction = orderInfo?.isLong ? t`Long` : t`Short`;
  const symbol = orderInfo?.symbol || '';

  return (
    <div>
      {!isScreen1024 && (
        <div className="Exchange-list-container">
          <div className="Exchange-list-table-wrapper">
            <div className="overflow-x-auto">
              <TableScrollFadeContainer>
                <div className={getTableEmptyStateClass('tradePrimary')}>
                  <Table className="min-w-[1000px]">
                    <thead className="text-body-medium">
                      <TableTheadTr>
                        <TableTh style={{ fontSize: '1.1rem', color: '#A3A3A3' }}>
                          <Trans>POSITION</Trans>
                        </TableTh>
                        <TableTh style={{ fontSize: '1.1rem', color: '#A3A3A3' }}>
                          <Trans>SIZE</Trans>
                        </TableTh>
                        <TableTh style={{ fontSize: '1.1rem', color: '#A3A3A3' }}>
                          <Trans>NET VALUE</Trans>
                        </TableTh>
                        <TableTh style={{ fontSize: '1.1rem', color: '#A3A3A3' }}>
                          <Trans>COLLATERAL</Trans>
                        </TableTh>
                        <TableTh style={{ fontSize: '1.1rem', color: '#A3A3A3' }}>
                          <Trans>ENTRY PRICE</Trans>
                        </TableTh>
                        <TableTh style={{ fontSize: '1.1rem', color: '#A3A3A3' }}>
                          <Trans>MARK PRICE</Trans>
                        </TableTh>
                        <TableTh style={{ fontSize: '1.1rem', color: '#A3A3A3' }}>
                          <Trans>LIQ.PRICE</Trans>
                        </TableTh>
                        <TableTh style={{ fontSize: '1.1rem', color: '#A3A3A3' }}>
                          <Trans>TP/SL</Trans>
                        </TableTh>
                        <TableTh style={{ color: '#A3A3A3' }}></TableTh>
                        <TableTh style={{ color: '#A3A3A3' }}></TableTh>
                      </TableTheadTr>
                    </thead>
                    <tbody>
                      {currentPagePositions.map((position) => (
                        <PositionItemWrapper
                          key={position.address.toBase58()}
                          position={position}
                          onEditCollateralClick={setEditingPositionKey}
                          onClosePositionClick={onClosePositionClick}
                          onOrdersClick={onOrdersClick}
                          onSelectPositionClick={onSelectPositionClick}
                          onEditTPSLOrder={onEditTPSLOrder}
                          isLarge
                          openSettings={openSettings}
                          hideActions={hideActions}
                          onCancelOrder={onCancelOrder}
                        />
                      ))}
                    </tbody>
                  </Table>
                  {currentPagePositions.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      {(isLoading && owner) && positionsData.length === 0 ? (
                        <LoadingComponent />
                      ) : (
                        <div className="text-body-medium text-center text-[#A3A3A3] font-medium">
                          {t`No open positions`}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TableScrollFadeContainer>
            </div>
          </div>
          {positionsData.length > 0 && (
            <div className="Exchange-list-pagination-wrapper">
              <BottomTablePagination
                page={page}
                pageCount={pageCount}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}
      {isScreen1024 && (
        <div className="position-cards-container">
          {currentPagePositions.length === 0 ? (
            <div className="position-cards-empty">
              {(isLoading && owner) && positionsData.length === 0 ? (
                <LoadingComponent />
              ) : (
                <div className="empty-title !text-[#A3A3A3] font-medium">
                  {t`No open positions`}
                </div>
              )}
            </div>
          ) : (
            <div className="position-cards-grid">
              {currentPagePositions.map((position) => (
                <PositionItemWrapper
                  key={position.address.toBase58()}
                  position={position}
                  onEditCollateralClick={setEditingPositionKey}
                  onClosePositionClick={onClosePositionClick}
                  onOrdersClick={onOrdersClick}
                  onSelectPositionClick={onSelectPositionClick}
                  onEditTPSLOrder={onEditTPSLOrder}
                  isLarge={false}
                  openSettings={openSettings}
                  hideActions={hideActions}
                  onCancelOrder={onCancelOrder}
                />
              ))}
            </div>
          )}
          {positionsData.length > 0 && (
            <div className="Exchange-list-pagination-wrapper">
              <BottomTablePagination
                page={page}
                pageCount={pageCount}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}
      <OrderEditorContainer />

      {(() => {
        return (
          isVisible && (
            <TPSLDialog
              key={orderInfo?.address?.toBase58()}
              isVisible={isVisible}
              label={t`TP/SL for ${formatMarketName(orderInfo?.marketInfo?.indexToken)} ${direction}`}
              setIsVisible={setIsVisible}
              position={orderInfo}
              onOperateClick={onOperateClick}
            />
          )
        );
      })()}
    </div>
  );
}
export default memo(PositionList);

const PositionItemWrapper = memo(
  ({
    position,
    hideActions,
    isLarge,
    onClosePositionClick,
    onEditCollateralClick,
    onOrdersClick,
    onSelectPositionClick,
    // onShareClick,
    openSettings,
    onCancelOrder,
    onEditTPSLOrder,
  }: {
    position: PositionInfo;
    onEditCollateralClick: (positionKey: string) => void;
    onClosePositionClick: (positionKey: string) => void;
    onOrdersClick: (positionKey: string, orderKey: string | undefined) => void;
    onSelectPositionClick: (
      tradeMode?: TradeMode,
      position?: PositionInfo
    ) => void;
    isLarge: boolean;
    openSettings: () => void;
    hideActions: boolean | undefined;
    onCancelOrder: (orderKey: string) => void;
    onEditTPSLOrder: (
      position?: PositionInfo,
      type?: string
    ) => void;
  }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const setMarketInfo = useAppStore((state) => state.markets.setMarketInfo);
    const setCollateralToken = useAppStore(
      (state) => state.collateralTokens.setCollateralToken
    );
    const setMarketDirection = useAppStore(
      (state) => state.TradeboxNew.setMarketDirection
    );
    const setMarketType = useAppStore(
      (state) => state.TradeboxNew.setMarketType
    );
    const [showMarketDecrease, setShowMarketDecrease] = useState(false);
    const [showEditTpSl, setShowEditTpSl] = useState(false);
    const [showEditCollateral, setShowEditCollateral] = useState(false);
    const [showShare, setShowShare] = useState(false);
    const [showTpDecrease, setShowTpDecrease] = useState(false);
    const [showSlDecrease, setShowSlDecrease] = useState(false);
    const [showLongOrShortLimit, setShowLongOrShortLimit] = useState(false);
    const [showSwapLimit, setShowSwapLimit] = useState(false);

    const handleMarketDecreaseClose = useCallback(() => {
      setShowMarketDecrease(false);
    }, []);

    const handleMarketDecreaseConfirm = useCallback((closeAmount: string) => {
      console.log('Close amount:', closeAmount);
      setShowMarketDecrease(false);
    }, []);
    const showPnlAfterFees = useAppStore(selectShowPnlAfterFees);
    // const handleEditCollateralClick = useCallback(
    //   () => onEditCollateralClick(position.address.toBase58()),
    //   [onEditCollateralClick, position]
    // );
    const handleEditCollateralClick = useCallback(() => {
      setShowEditCollateral(true);
    }, []);

    const handleEditTPSLOrder = useCallback(
      (position?: PositionInfo, type?: string) => {
        onEditTPSLOrder(position, type);
        if (type === 'new') {
          setShowEditTpSl(true);
        }
      },
      [onEditTPSLOrder]
    );

    const handleShareClick = () => {
      setShowShare(true);
    };
    // const handleClosePositionClick = useCallback(
    //   () => onClosePositionClick(position.address.toBase58()),
    //   [onClosePositionClick, position]
    // );
    const handleClosePositionClick = (v?: PositionInfo, type?: string) => {
      switch (type) {
        case 'Market':
          setShowMarketDecrease(true);
          break;
        case 'TpSl':
          setShowEditTpSl(true);
          break;
        default:
          break;
      }
    };

    const longText = t`Long`;
    const shortText = t`Short`;
    const directionText = position?.isLong ? longText : shortText;
    // debugger;
    const message = (
      <>
        {directionText}{' '}
        <div className="inline-flex items-center">
          <span>{formatMarketName(position?.marketInfo?.indexToken)}</span>
          <span className="subtext gm-toast lh-1">
            [
            {position?.marketInfo?.longToken?.address?.toBase58() ===
              position?.marketInfo?.shortToken?.address?.toBase58()
              ? (GMX_SOLANA_TOKENS_RAW[position?.marketInfo?.longToken?.address?.toBase58()]?.symbol === 'WGMX' ? 'GMX' : GMX_SOLANA_TOKENS_RAW[position?.marketInfo?.longToken?.address?.toBase58()]?.symbol)
              : (GMX_SOLANA_TOKENS_RAW[position?.marketInfo?.longToken?.address?.toBase58()]?.symbol === 'WGMX' ? 'GMX' : GMX_SOLANA_TOKENS_RAW[position?.marketInfo?.longToken?.address?.toBase58()]?.symbol) +
              '/' +
              (GMX_SOLANA_TOKENS_RAW[position?.marketInfo?.shortToken?.address?.toBase58()]?.symbol === 'WGMX' ? 'GMX' : GMX_SOLANA_TOKENS_RAW[position?.marketInfo?.shortToken.address.toBase58()]?.symbol)}
            ]
          </span>
        </div>{' '}
        <span>{t`market selected`}</span>.
      </>
    );
    const handleCancelOrder = useCallback(
      (orderKey: string) => onCancelOrder(orderKey),
      [onCancelOrder]
    );
    const handleOrdersClick = useCallback(
      (orderKey: string | undefined) => {
        onOrdersClick(position.address.toBase58(), orderKey);
      },
      [onOrdersClick, position]
    );
    return (
      <>
        <PositionItem
          position={position}
          onEditCollateralClick={handleEditCollateralClick}
          onShareClick={handleShareClick}
          onClosePositionClick={handleClosePositionClick}
          onOrdersClick={handleOrdersClick}
          onSelectPositionClick={onSelectPositionClick}
          showPnlAfterFees={showPnlAfterFees}
          isLarge={isLarge}
          openSettings={openSettings}
          hideActions={hideActions}
          onCancelOrder={handleCancelOrder}
          onEditTPSLOrder={handleEditTPSLOrder}
        />
        <MarketDecrease
          position={position}
          isVisible={showMarketDecrease}
          onClose={handleMarketDecreaseClose}
          onConfirm={handleMarketDecreaseConfirm}
        />
        <TpSlDecrease
          position={position}
          isVisible={showEditTpSl}
          onClose={() => setShowEditTpSl(false)}
          onConfirm={() => { }}
        />
        <EditCollateral
          position={position}
          isVisible={showEditCollateral}
          onClose={() => setShowEditCollateral(false)}
          onConfirm={() => { }}
        />
        <ShareDialog
          position={position}
          isVisible={showShare}
          onClose={() => setShowShare(false)}
          type="position"
        />
      </>
    );
  }
);

PositionItemWrapper.displayName = 'PositionItemWrapper';
