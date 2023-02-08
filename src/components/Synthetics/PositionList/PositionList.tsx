import { Trans, t } from "@lingui/macro";
import { PositionEditor } from "components/Synthetics/PositionEditor/PositionEditor";
import { PositionItem } from "components/Synthetics/PositionItem/PositionItem";
import { PositionSeller } from "components/Synthetics/PositionSeller/PositionSeller";
import { AggregatedOrdersData } from "domain/synthetics/orders";
import { AggregatedPositionsData } from "domain/synthetics/positions";
import { useState } from "react";

type Props = {
  onSelectPositionClick: (key: string) => void;
  positionsData: AggregatedPositionsData;
  ordersData: AggregatedOrdersData;
  savedIsPnlInLeverage: boolean;
  isLoading: boolean;
  onOrdersClick: () => void;
};

export function PositionList(p: Props) {
  const [closingPositionKey, setClosingPositionKey] = useState<string>();
  const [editingPositionKey, setEditingPositionKey] = useState<string>();

  const positions = Object.values(p.positionsData);

  const isDataLoading = p.isLoading;

  const closingPosition = positions.find((position) => position.key === closingPositionKey);
  const editingPosition = positions.find((position) => position.key === editingPositionKey);

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
              ordersData={p.ordersData}
              position={position}
              onEditCollateralClick={() => setEditingPositionKey(position.key)}
              onClosePositionClick={() => setClosingPositionKey(position.key)}
              onOrdersClick={p.onOrdersClick}
              onSelectPositionClick={() => p.onSelectPositionClick(position.key)}
              showPnlAfterFees={false}
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
              <Trans>Mark Price</Trans>
            </th>
            <th>
              <Trans>Entry Price</Trans>
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
                ordersData={p.ordersData}
                position={position}
                onEditCollateralClick={() => setEditingPositionKey(position.key)}
                onClosePositionClick={() => setClosingPositionKey(position.key)}
                onOrdersClick={p.onOrdersClick}
                onSelectPositionClick={() => p.onSelectPositionClick(position.key)}
                showPnlAfterFees={false}
                isLarge={true}
              />
            ))}
        </tbody>
      </table>

      <PositionSeller
        savedIsPnlInLeverage={p.savedIsPnlInLeverage}
        position={closingPosition}
        onClose={() => setClosingPositionKey(undefined)}
      />

      <PositionEditor
        savedIsPnlInLeverage={p.savedIsPnlInLeverage}
        position={editingPosition}
        onClose={() => setEditingPositionKey(undefined)}
      />

      {/* {sharingPosition && (
        <PositionShare
          isPositionShareModalOpen={true}
          setIsPositionShareModalOpen={() => setSharingPositionKey(undefined)}
          positionToShare={sharingPosition}
          chainId={chainId}
          account={account}
        />
      )} */}
    </div>
  );
}
