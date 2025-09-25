import { Trans } from "@lingui/macro";
import { memo, useCallback, useState } from "react";
import { useMedia } from "react-use";

import { useIsPositionsLoading, usePositionsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { usePositionEditorPositionState } from "context/SyntheticsStateContext/hooks/positionEditorHooks";
import { selectAccount, selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectPositionsInfoDataSortedByMarket } from "context/SyntheticsStateContext/selectors/positionsSelectors";
import { selectShowPnlAfterFees } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { PositionInfo } from "domain/synthetics/positions";
import { TradeMode } from "domain/synthetics/trade";
import { getByKey } from "lib/objects";
import { userAnalytics } from "lib/userAnalytics";
import { SharePositionClickEvent } from "lib/userAnalytics/types";

import { EmptyTableContent } from "components/EmptyTableContent/EmptyTableContent";
import { OrderEditorContainer } from "components/OrderEditorContainer/OrderEditorContainer";
import { PositionItem } from "components/PositionItem/PositionItem";
import PositionShare from "components/PositionShare/PositionShare";
import { Table, TableTh, TableTheadTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";

type Props = {
  onSelectPositionClick: (key: string, tradeMode?: TradeMode, showCurtain?: boolean) => void;
  onClosePositionClick: (key: string) => void;
  onOrdersClick: (positionKey: string, orderKey: string | undefined) => void;
  onCancelOrder: (key: string) => void;
  openSettings: () => void;
  hideActions?: boolean;
};

export function PositionList(p: Props) {
  const { onClosePositionClick, onOrdersClick, onSelectPositionClick, onCancelOrder, hideActions } = p;
  const positionsInfoData = usePositionsInfoData();
  const chainId = useSelector(selectChainId);
  const account = useSelector(selectAccount);
  const [isPositionShareModalOpen, setIsPositionShareModalOpen] = useState(false);
  const [positionToShareKey, setPositionToShareKey] = useState<string>();
  const positionToShare = getByKey(positionsInfoData, positionToShareKey);
  const positions = useSelector(selectPositionsInfoDataSortedByMarket);

  const handleSharePositionClick = useCallback((positionKey: string) => {
    userAnalytics.pushEvent<SharePositionClickEvent>({
      event: "SharePositionAction",
      data: {
        action: "SharePositionClick",
      },
    });
    setPositionToShareKey(positionKey);
    setIsPositionShareModalOpen(true);
  }, []);
  const [, setEditingPositionKey] = usePositionEditorPositionState();
  const isLoading = useIsPositionsLoading();
  const isMobile = useMedia("(max-width: 1024px)");

  return (
    <div className="flex grow flex-col">
      {isMobile && (
        <>
          <EmptyTableContent
            isLoading={isLoading}
            isEmpty={positions.length === 0}
            emptyText={<Trans>No open positions</Trans>}
          />
          <div className="grid grid-cols-1 gap-8 min-[800px]:grid-cols-2">
            {!isLoading &&
              positions.map((position) => (
                <PositionItemWrapper
                  key={position.key}
                  position={position}
                  onEditCollateralClick={setEditingPositionKey}
                  onClosePositionClick={onClosePositionClick}
                  onOrdersClick={onOrdersClick}
                  onSelectPositionClick={onSelectPositionClick}
                  isLarge={false}
                  onShareClick={handleSharePositionClick}
                  hideActions={hideActions}
                  onCancelOrder={onCancelOrder}
                />
              ))}
          </div>
        </>
      )}

      {!isMobile && (
        <TableScrollFadeContainer
          disableScrollFade={positions.length === 0}
          className="flex grow flex-col bg-slate-900"
        >
          <Table className="!w-[max(100%,900px)] table-fixed">
            <thead className="text-body-medium">
              <TableTheadTr>
                <TableTh className="w-[18%]">
                  <Trans>Position</Trans>
                </TableTh>
                <TableTh className="w-[10%]">
                  <Trans>Size</Trans>
                </TableTh>
                <TableTh className="w-[14%]">
                  <Trans>Net Value</Trans>
                </TableTh>
                <TableTh className="w-[14%]">
                  <Trans>Collateral</Trans>
                </TableTh>
                <TableTh className="w-[10%]">
                  <Trans>Entry Price</Trans>
                </TableTh>
                <TableTh className="w-[10%]">
                  <Trans>Mark Price</Trans>
                </TableTh>
                <TableTh className="w-[10%]">
                  <Trans>Liq. Price</Trans>
                </TableTh>
                {!isLoading && !p.hideActions && (
                  <>
                    <TableTh className="w-[124px]"></TableTh>
                  </>
                )}
              </TableTheadTr>
            </thead>
            <tbody>
              {!isLoading &&
                positions.map((position) => (
                  <PositionItemWrapper
                    key={position.key}
                    position={position}
                    onEditCollateralClick={setEditingPositionKey}
                    onClosePositionClick={onClosePositionClick}
                    onOrdersClick={onOrdersClick}
                    onSelectPositionClick={onSelectPositionClick}
                    isLarge
                    onShareClick={handleSharePositionClick}
                    hideActions={hideActions}
                    onCancelOrder={onCancelOrder}
                  />
                ))}
            </tbody>
          </Table>

          <EmptyTableContent
            isLoading={isLoading}
            isEmpty={positions.length === 0}
            emptyText={<Trans>No open positions</Trans>}
          />
        </TableScrollFadeContainer>
      )}
      {positionToShare && (
        <PositionShare
          key={positionToShare.key}
          setIsPositionShareModalOpen={setIsPositionShareModalOpen}
          isPositionShareModalOpen={isPositionShareModalOpen}
          entryPrice={positionToShare.entryPrice}
          indexToken={positionToShare.indexToken}
          isLong={positionToShare.isLong}
          leverage={positionToShare.leverageWithPnl}
          markPrice={positionToShare.markPrice}
          pnlAfterFeesPercentage={positionToShare?.pnlAfterFeesPercentage}
          chainId={chainId}
          account={account}
        />
      )}
      <OrderEditorContainer />
    </div>
  );
}

const PositionItemWrapper = memo(
  ({
    position,
    hideActions,
    isLarge,
    onClosePositionClick,
    onEditCollateralClick,
    onOrdersClick,
    onSelectPositionClick,
    onShareClick,
    onCancelOrder,
  }: {
    position: PositionInfo;
    onEditCollateralClick: (positionKey: string) => void;
    onClosePositionClick: (positionKey: string) => void;
    onOrdersClick: (positionKey: string, orderKey: string | undefined) => void;
    onSelectPositionClick: (positionKey: string, tradeMode: TradeMode | undefined, showCurtain?: boolean) => void;
    isLarge: boolean;
    onShareClick: (positionKey: string) => void;
    hideActions: boolean | undefined;
    onCancelOrder: (orderKey: string) => void;
  }) => {
    const showPnlAfterFees = useSelector(selectShowPnlAfterFees);
    const handleEditCollateralClick = useCallback(
      () => onEditCollateralClick(position.key),
      [onEditCollateralClick, position.key]
    );
    const handleClosePositionClick = useCallback(
      () => onClosePositionClick(position.key),
      [onClosePositionClick, position.key]
    );

    const handleSelectPositionClick = useCallback(
      (tradeMode?: TradeMode, showCurtain?: boolean) => onSelectPositionClick(position.key, tradeMode, showCurtain),
      [onSelectPositionClick, position.key]
    );
    const handleShareClick = useCallback(() => onShareClick(position.key), [onShareClick, position.key]);
    const handleCancelOrder = useCallback((orderKey: string) => onCancelOrder(orderKey), [onCancelOrder]);
    const handleOrdersClick = useCallback(
      (orderKey: string | undefined) => {
        onOrdersClick(position.key, orderKey);
      },
      [onOrdersClick, position.key]
    );

    return (
      <PositionItem
        position={position}
        onEditCollateralClick={handleEditCollateralClick}
        onClosePositionClick={handleClosePositionClick}
        onOrdersClick={handleOrdersClick}
        onSelectPositionClick={handleSelectPositionClick}
        showPnlAfterFees={showPnlAfterFees}
        isLarge={isLarge}
        hideActions={hideActions}
        onShareClick={handleShareClick}
        onCancelOrder={handleCancelOrder}
      />
    );
  }
);
