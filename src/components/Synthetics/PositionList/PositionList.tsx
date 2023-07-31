import { Trans, t } from "@lingui/macro";
import { PositionItem } from "components/Synthetics/PositionItem/PositionItem";
import { OrdersInfoData, PositionOrderInfo, isOrderForPosition } from "domain/synthetics/orders";
import { PositionsInfoData } from "domain/synthetics/positions";
import { TradeMode, TradeType } from "domain/synthetics/trade";

type Props = {
  onSelectPositionClick: (key: string, tradeMode?: TradeMode) => void;
  onClosePositionClick: (key: string) => void;
  onEditCollateralClick: (key: string) => void;
  positionsData?: PositionsInfoData;
  ordersData?: OrdersInfoData;
  savedIsPnlInLeverage: boolean;
  isLoading: boolean;
  onOrdersClick: () => void;
  showPnlAfterFees: boolean;
  savedShowPnlAfterFees: boolean;
  currentMarketAddress?: string;
  currentCollateralAddress?: string;
  currentTradeType?: TradeType;
  openSettings: () => void;
  hideActions?: boolean;
};

export function PositionList(p: Props) {
  const positions = Object.values(p.positionsData || {});
  const orders = Object.values(p.ordersData || {});

  return (
    <div>
      {positions.length === 0 && (
        <div className="Exchange-empty-positions-list-note App-card small">
          {p.isLoading ? t`Loading...` : t`No open positions`}
        </div>
      )}
      <div className="Exchange-list small">
        {!p.isLoading &&
          positions.map((position) => (
            <PositionItem
              key={position.key}
              positionOrders={orders.filter((order) => isOrderForPosition(order, position.key)) as PositionOrderInfo[]}
              position={position}
              onEditCollateralClick={() => p.onEditCollateralClick(position.key)}
              onClosePositionClick={() => p.onClosePositionClick(position.key)}
              onOrdersClick={p.onOrdersClick}
              onSelectPositionClick={(tradeMode?: TradeMode) => p.onSelectPositionClick(position.key, tradeMode)}
              showPnlAfterFees={p.showPnlAfterFees}
              savedShowPnlAfterFees={p.savedShowPnlAfterFees}
              isLarge={false}
              currentMarketAddress={p.currentMarketAddress}
              currentCollateralAddress={p.currentCollateralAddress}
              currentTradeType={p.currentTradeType}
              openSettings={p.openSettings}
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
              <Trans>Liq Price</Trans>
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
                onOrdersClick={p.onOrdersClick}
                onSelectPositionClick={(tradeMode?: TradeMode) => p.onSelectPositionClick(position.key, tradeMode)}
                showPnlAfterFees={p.showPnlAfterFees}
                isLarge={true}
                savedShowPnlAfterFees={p.savedShowPnlAfterFees}
                currentMarketAddress={p.currentMarketAddress}
                currentCollateralAddress={p.currentCollateralAddress}
                currentTradeType={p.currentTradeType}
                openSettings={p.openSettings}
                hideActions={p.hideActions}
              />
            ))}
        </tbody>
      </table>
    </div>
  );
}
