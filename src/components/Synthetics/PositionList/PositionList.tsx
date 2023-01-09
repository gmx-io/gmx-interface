import { Trans, t } from "@lingui/macro";
import { PositionItem } from "components/Synthetics/PositionItem/PositionItem";
import { PositionEditor } from "components/Synthetics/PositionEditor/PositionEditor";
import { PositionSeller } from "components/Synthetics/PositionSeller/PositionSeller";
import { useAggregatedPositionsData } from "domain/synthetics/positions/useAggregatedPositionsData";
import { useChainId } from "lib/chains";
import { useState } from "react";
import { useAggregatedOrdersData } from "domain/synthetics/orders/useAggregatedOrdersData";

type Props = {
  onSelectMarket: (marketAddress: string) => void;
  onOrdersClick: () => void;
};

export function PositionList(p: Props) {
  const { chainId } = useChainId();

  const [closingPositionKey, setClosingPositionKey] = useState<string>();
  const [editingPositionKey, setEditingPositionKey] = useState<string>();

  const { aggregatedPositionsData, isLoading } = useAggregatedPositionsData(chainId);
  const { aggregatedOrdersData } = useAggregatedOrdersData(chainId);

  const positions = Object.values(aggregatedPositionsData);

  const isDataLoading = isLoading;

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
              ordersData={aggregatedOrdersData}
              position={position}
              onEditCollateralClick={() => setEditingPositionKey(position.key)}
              onClosePositionClick={() => setClosingPositionKey(position.key)}
              onOrdersClick={p.onOrdersClick}
              onSelectMarketClick={() => p.onSelectMarket(position.marketAddress)}
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
          {!isDataLoading &&
            positions.map((position) => (
              <PositionItem
                key={position.key}
                ordersData={aggregatedOrdersData}
                position={position}
                onEditCollateralClick={() => setEditingPositionKey(position.key)}
                onClosePositionClick={() => setClosingPositionKey(position.key)}
                onOrdersClick={p.onOrdersClick}
                onSelectMarketClick={() => p.onSelectMarket(position.marketAddress)}
                showPnlAfterFees={false}
                isLarge={true}
              />
            ))}
        </tbody>
      </table>

      {closingPosition && (
        <PositionSeller position={closingPosition} onClose={() => setClosingPositionKey(undefined)} />
      )}

      {editingPosition && (
        <PositionEditor position={editingPosition} onClose={() => setEditingPositionKey(undefined)} />
      )}

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
