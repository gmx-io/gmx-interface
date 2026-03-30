import { Trans } from "@lingui/macro";
import { memo, useCallback, useMemo, useState } from "react";
import { useMedia } from "react-use";

import { useIsPositionsLoading, usePositionsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { usePositionEditorPositionState } from "context/SyntheticsStateContext/hooks/positionEditorHooks";
import { selectChainId } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { selectPositionsInfoDataSortedByMarket } from "context/SyntheticsStateContext/selectors/positionsSelectors";
import { selectShowPnlAfterFees } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { PositionInfo } from "domain/synthetics/positions";
import { TradeMode } from "domain/synthetics/trade";
import { getByKey } from "lib/objects";
import { userAnalytics } from "lib/userAnalytics";
import { SharePositionClickEvent } from "lib/userAnalytics/types";
import useWallet from "lib/wallets/useWallet";

import { EmptyTableContent } from "components/EmptyTableContent/EmptyTableContent";
import { OrderEditorContainer } from "components/OrderEditorContainer/OrderEditorContainer";
import { PositionItem } from "components/PositionItem/PositionItem";
import PositionShare from "components/PositionShare/PositionShare";
import { Sorter, useSorterHandlers } from "components/Sorter/Sorter";
import { Table, TableTh, TableTheadTr } from "components/Table/Table";
import { TableScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";

import { type PositionSortField, sortPositionsByField } from "./sortPositionsByField";
import { SymbolSortDropdown } from "./SymbolSortDropdown";

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
  const [isPositionShareModalOpen, setIsPositionShareModalOpen] = useState(false);
  const [positionToShareKey, setPositionToShareKey] = useState<string>();
  const positionToShare = getByKey(positionsInfoData, positionToShareKey);
  const defaultPositions = useSelector(selectPositionsInfoDataSortedByMarket);
  const { orderBy, direction, getSorterProps } = useSorterHandlers<PositionSortField>("position-list");

  const positions = useMemo(
    () => sortPositionsByField(defaultPositions, orderBy, direction),
    [defaultPositions, orderBy, direction]
  );

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
          hideControls
          className="flex grow flex-col bg-slate-900"
        >
          <Table className="!w-[max(100%,1180px)] table-fixed">
            <thead className="text-body-medium">
              <TableTheadTr>
                <TableTh className="w-[13%]">
                  <SymbolSortDropdown {...getSorterProps("symbol")} />
                </TableTh>
                <TableTh className="w-[12%]">
                  <Sorter {...getSorterProps("size")} showOnHover>
                    <Trans>SIZE</Trans>
                  </Sorter>
                </TableTh>
                <TableTh className="w-[17%]">
                  <Sorter {...getSorterProps("netValue")} showOnHover>
                    <Trans>NET VALUE</Trans>
                  </Sorter>
                </TableTh>
                <TableTh className="w-[11%]">
                  <Sorter {...getSorterProps("collateral")} showOnHover>
                    <Trans>COLLATERAL</Trans>
                  </Sorter>
                </TableTh>
                <TableTh className="w-[9%]">
                  <Sorter {...getSorterProps("entryPrice")} showOnHover>
                    <Trans>ENTRY PRICE</Trans>
                  </Sorter>
                </TableTh>
                <TableTh className="w-[9%]">
                  <Sorter {...getSorterProps("markPrice")} showOnHover>
                    <Trans>MARK PRICE</Trans>
                  </Sorter>
                </TableTh>
                <TableTh className="w-[9%]">
                  <Sorter {...getSorterProps("liqPrice")} showOnHover>
                    <Trans>LIQUIDATION PRICE</Trans>
                  </Sorter>
                </TableTh>
                {!hideActions && (
                  <TableTh className="w-[8%] text-left">
                    <Trans>TP/SL</Trans>
                  </TableTh>
                )}
                {!isLoading && !p.hideActions && <TableTh className="PositionItem-actions-cell w-[11%]" />}
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
          pnlAfterFeesUsd={positionToShare.pnlAfterFees}
          setIsPositionShareModalOpen={setIsPositionShareModalOpen}
          isPositionShareModalOpen={isPositionShareModalOpen}
          entryPrice={positionToShare.entryPrice}
          indexToken={positionToShare.indexToken}
          isLong={positionToShare.isLong}
          leverageWithoutPnl={positionToShare.leverageWithoutPnl}
          leverageWithPnl={positionToShare.leverageWithPnl}
          markPrice={positionToShare.markPrice}
          account={positionToShare.account}
          pnlAfterFeesPercentage={positionToShare?.pnlAfterFeesPercentage}
          chainId={chainId}
          shareSource="positions-list"
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
    const { account } = useWallet();
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

    const isShareAvailable = account === position.account;

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
        onCancelOrder={handleCancelOrder}
        onShareClick={isShareAvailable ? handleShareClick : undefined}
      />
    );
  }
);
