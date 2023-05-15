import { Trans, t } from "@lingui/macro";
import { PositionItem } from "components/Synthetics/PositionItem/PositionItem";
import { OrdersInfoData, PositionOrderInfo, isOrderForPosition } from "domain/synthetics/orders";
import { PositionsInfoData } from "domain/synthetics/positions";

type Props = {
  onSelectPositionClick: (key: string) => void;
  onClosePositionClick: (key: string) => void;
  onEditCollateralClick: (key: string) => void;
  positionsData?: PositionsInfoData;
  ordersData?: OrdersInfoData;
  savedIsPnlInLeverage: boolean;
  isLoading: boolean;
  onOrdersClick: () => void;
  showPnlAfterFees: boolean;
};

export function PositionList(p: Props) {
  const positions = Object.values(p.positionsData || {});
  const orders = Object.values(p.ordersData || {});
  const isDataLoading = p.isLoading;

  return (
    <div>
      <div className="Exchange-list small">
        {positions.length === 0 && (
          <div className="Exchange-empty-positions-list-note App-card">
            {isDataLoading ? t`Loading...` : t`No open positions`}
          </div>
        )}
        {!isDataLoading &&
          positions.map((position) => (
            <PositionItem
              key={position.key}
              positionOrders={orders.filter((order) => isOrderForPosition(order, position.key)) as PositionOrderInfo[]}
              position={position}
              onEditCollateralClick={() => p.onEditCollateralClick(position.key)}
              onClosePositionClick={() => p.onClosePositionClick(position.key)}
              onOrdersClick={p.onOrdersClick}
              onSelectPositionClick={() => p.onSelectPositionClick(position.key)}
              showPnlAfterFees={p.showPnlAfterFees}
              isLarge={false}
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
                  {isDataLoading ? t`Loading...` : t`No open positions`}
                </div>
              </td>
            </tr>
          )}
          {!isDataLoading &&
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
                onSelectPositionClick={() => p.onSelectPositionClick(position.key)}
                showPnlAfterFees={p.showPnlAfterFees}
                isLarge={true}
              />
            ))}
        </tbody>
      </table>
    </div>
  );
}
