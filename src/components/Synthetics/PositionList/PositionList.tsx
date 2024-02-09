import { Trans, t } from "@lingui/macro";
import PositionShare from "components/Exchange/PositionShare";
import { PositionItem } from "components/Synthetics/PositionItem/PositionItem";
import { useOrdersInfoData, usePositionsInfoData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { PositionOrderInfo, isOrderForPosition } from "domain/synthetics/orders";
import { TradeMode } from "domain/synthetics/trade";
import { useChainId } from "lib/chains";
import { getByKey } from "lib/objects";
import useWallet from "lib/wallets/useWallet";
import { useState } from "react";

type Props = {
  onSelectPositionClick: (key: string, tradeMode?: TradeMode) => void;
  onClosePositionClick: (key: string) => void;
  onEditCollateralClick: (key: string) => void;
  onSettlePositionFeesClick: (key: string) => void;
  isLoading: boolean;
  onOrdersClick: () => void;
  showPnlAfterFees: boolean;
  openSettings: () => void;
  hideActions?: boolean;
};

export function PositionList(p: Props) {
  const {
    isLoading,
    onClosePositionClick,
    onEditCollateralClick,
    onOrdersClick,
    onSelectPositionClick,
    onSettlePositionFeesClick,
    openSettings,
    showPnlAfterFees,
    hideActions,
  } = p;
  const positionsInfoData = usePositionsInfoData();
  const ordersData = useOrdersInfoData();
  const { chainId } = useChainId();
  const { account } = useWallet();
  const [isPositionShareModalOpen, setIsPositionShareModalOpen] = useState(false);
  const [positionToShareKey, setPositionToShareKey] = useState<string>();
  const positionToShare = getByKey(positionsInfoData, positionToShareKey);
  const positions = Object.values(positionsInfoData || {});
  const orders = Object.values(ordersData || {});
  const handleSharePositionClick = (positionKey: string) => {
    setPositionToShareKey(positionKey);
    setIsPositionShareModalOpen(true);
  };

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
            <PositionItem
              key={position.key}
              positionOrders={orders.filter((order) => isOrderForPosition(order, position.key)) as PositionOrderInfo[]}
              position={position}
              onEditCollateralClick={() => onEditCollateralClick(position.key)}
              onClosePositionClick={() => onClosePositionClick(position.key)}
              onGetPendingFeesClick={() => onSettlePositionFeesClick(position.key)}
              onOrdersClick={onOrdersClick}
              onSelectPositionClick={(tradeMode?: TradeMode) => onSelectPositionClick(position.key, tradeMode)}
              showPnlAfterFees={showPnlAfterFees}
              isLarge={false}
              onShareClick={() => handleSharePositionClick(position.key)}
              openSettings={openSettings}
              hideActions={hideActions}
            />
          ))}
      </div>

      <table className="Exchange-list large App-box">
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
                  {p.isLoading ? t`Loading...` : t`No open positions`}
                </div>
              </td>
            </tr>
          )}
          {!p.isLoading &&
            positions.map((position) => (
              <PositionItem
                key={position.key}
                positionOrders={
                  orders.filter((order) => isOrderForPosition(order, position.key)) as PositionOrderInfo[]
                }
                position={position}
                onEditCollateralClick={() => p.onEditCollateralClick(position.key)}
                onClosePositionClick={() => p.onClosePositionClick(position.key)}
                onGetPendingFeesClick={() => p.onSettlePositionFeesClick(position.key)}
                onOrdersClick={p.onOrdersClick}
                onSelectPositionClick={(tradeMode?: TradeMode) => p.onSelectPositionClick(position.key, tradeMode)}
                showPnlAfterFees={p.showPnlAfterFees}
                isLarge={true}
                openSettings={p.openSettings}
                hideActions={p.hideActions}
                onShareClick={() => handleSharePositionClick(position.key)}
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
