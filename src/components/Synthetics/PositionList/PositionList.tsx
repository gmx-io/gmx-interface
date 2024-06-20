import { Trans, t } from "@lingui/macro";
import PositionShare from "components/Exchange/PositionShare";
import { PositionItem } from "components/Synthetics/PositionItem/PositionItem";
import { useIsPositionsLoading, usePositionsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { usePositionEditorPositionState } from "context/SyntheticsStateContext/hooks/positionEditorHooks";
import { selectPositionsInfoDataSortedByMarket } from "context/SyntheticsStateContext/selectors/positionsSelectors";
import { selectShowPnlAfterFees } from "context/SyntheticsStateContext/selectors/settingsSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { PositionInfo } from "domain/synthetics/positions";
import { TradeMode } from "domain/synthetics/trade";
import { useChainId } from "lib/chains";
import { getByKey } from "lib/objects";
import useWallet from "lib/wallets/useWallet";
import { memo, useCallback, useState } from "react";

type Props = {
  onSelectPositionClick: (key: string, tradeMode?: TradeMode) => void;
  onClosePositionClick: (key: string) => void;
  onSettlePositionFeesClick: (key: string) => void;
  onOrdersClick: (key?: string) => void;
  openSettings: () => void;
  hideActions?: boolean;
};

export function PositionList(p: Props) {
  const {
    onClosePositionClick,
    onOrdersClick,
    onSelectPositionClick,
    onSettlePositionFeesClick,
    openSettings,
    hideActions,
  } = p;
  const positionsInfoData = usePositionsInfoData();
  const { chainId } = useChainId();
  const { account } = useWallet();
  const [isPositionShareModalOpen, setIsPositionShareModalOpen] = useState(false);
  const [positionToShareKey, setPositionToShareKey] = useState<string>();
  const positionToShare = getByKey(positionsInfoData, positionToShareKey);
  const positions = useSelector(selectPositionsInfoDataSortedByMarket);
  const handleSharePositionClick = useCallback((positionKey: string) => {
    setPositionToShareKey(positionKey);
    setIsPositionShareModalOpen(true);
  }, []);
  const [, setEditingPositionKey] = usePositionEditorPositionState();
  const isLoading = useIsPositionsLoading();

  return (
    <div>
      {positions.length === 0 && (
        <div className="Exchange-empty-positions-list-note App-card small">
          {isLoading ? t`Loading...` : t`No open positions`}
        </div>
      )}
      <div className="Exchange-list small">
        {!isLoading &&
          positions.map((position) => (
            <PositionItemWrapper
              key={position.key}
              position={position}
              onEditCollateralClick={setEditingPositionKey}
              onClosePositionClick={onClosePositionClick}
              onGetPendingFeesClick={onSettlePositionFeesClick}
              onOrdersClick={onOrdersClick}
              onSelectPositionClick={onSelectPositionClick}
              isLarge={false}
              onShareClick={handleSharePositionClick}
              openSettings={openSettings}
              hideActions={hideActions}
            />
          ))}
      </div>

      <table className="Exchange-list Position-list large App-box">
        <tbody>
          <tr className="Exchange-list-header">
            <th>
              <Trans>Position</Trans>
            </th>
            <th>
              <Trans>Net Value</Trans>
            </th>
            <th>
              <Trans>Size</Trans>
            </th>
            <th>
              <Trans>Collateral</Trans>
            </th>
            <th>
              <Trans>Entry Price</Trans>
            </th>
            <th>
              <Trans>Mark Price</Trans>
            </th>
            <th>
              <Trans>Liq. Price</Trans>
            </th>
          </tr>
          {positions.length === 0 && (
            <tr>
              <td colSpan={15}>
                <div className="Exchange-empty-positions-list-note">
                  {isLoading ? t`Loading...` : t`No open positions`}
                </div>
              </td>
            </tr>
          )}
          {!isLoading &&
            positions.map((position) => (
              <PositionItemWrapper
                key={position.key}
                position={position}
                onEditCollateralClick={setEditingPositionKey}
                onClosePositionClick={onClosePositionClick}
                onGetPendingFeesClick={onSettlePositionFeesClick}
                onOrdersClick={onOrdersClick}
                onSelectPositionClick={onSelectPositionClick}
                isLarge
                onShareClick={handleSharePositionClick}
                openSettings={openSettings}
                hideActions={hideActions}
              />
            ))}
        </tbody>
      </table>
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
    onGetPendingFeesClick,
    onOrdersClick,
    onSelectPositionClick,
    onShareClick,
    openSettings,
  }: {
    position: PositionInfo;
    onEditCollateralClick: (positionKey: string) => void;
    onClosePositionClick: (positionKey: string) => void;
    onGetPendingFeesClick: (positionKey: string) => void;
    onOrdersClick: (key: string | undefined) => void;
    onSelectPositionClick: (positionKey: string, tradeMode: TradeMode | undefined) => void;
    isLarge: boolean;
    onShareClick: (positionKey: string) => void;
    openSettings: () => void;
    hideActions: boolean | undefined;
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
    const handleGetPendingFeesClick = useCallback(
      () => onGetPendingFeesClick(position.key),
      [onGetPendingFeesClick, position.key]
    );
    const handleSelectPositionClick = useCallback(
      (tradeMode?: TradeMode) => onSelectPositionClick(position.key, tradeMode),
      [onSelectPositionClick, position.key]
    );
    const handleShareClick = useCallback(() => onShareClick(position.key), [onShareClick, position.key]);

    return (
      <PositionItem
        position={position}
        onEditCollateralClick={handleEditCollateralClick}
        onClosePositionClick={handleClosePositionClick}
        onGetPendingFeesClick={handleGetPendingFeesClick}
        onOrdersClick={onOrdersClick}
        onSelectPositionClick={handleSelectPositionClick}
        showPnlAfterFees={showPnlAfterFees}
        isLarge={isLarge}
        openSettings={openSettings}
        hideActions={hideActions}
        onShareClick={handleShareClick}
      />
    );
  }
);
