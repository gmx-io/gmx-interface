import { Trans, t } from "@lingui/macro";
import { PositionLarge, PositionSmall } from "components/Synthetics/Position/Position";
import { PositionEditor } from "components/Synthetics/PositionEditor/PositionEditor";
import { PositionSeller } from "components/Synthetics/PositionSeller/PositionSeller";
import { useAggregatedPositionsData } from "domain/synthetics/positions/useAggregatedPositionsData";
import { useChainId } from "lib/chains";
import { useState } from "react";

type Props = {
  onSelectMarket: (marketAddress: string) => void;
};

export function PositionList(p: Props) {
  const { chainId } = useChainId();

  const [closingPositionKey, setClosingPositionKey] = useState<string>();
  const [editingPositionKey, setEditingPositionKey] = useState<string>();

  const { aggregatedPositionsData, isLoading } = useAggregatedPositionsData(chainId);

  const positions = Object.values(aggregatedPositionsData);

  const isDataLoading = isLoading;

  const closingPosition = positions.find((position) => position.key === closingPositionKey);
  // const editingPosition = positions.find((position) => position.key === editingPositionKey);

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
            <PositionSmall
              key={position.key}
              position={position}
              onEditCollateralClick={() => setEditingPositionKey(position.key)}
              onClosePositionClick={() => setClosingPositionKey(position.key)}
              onOrdersClick={() => {}}
              onSelectMarketClick={() => p.onSelectMarket(position.marketAddress)}
              onShareClick={() => {}}
              showPnlAfterFees={false}
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
              <PositionLarge
                key={position.key}
                position={position}
                onEditCollateralClick={() => setEditingPositionKey(position.key)}
                onClosePositionClick={() => setClosingPositionKey(position.key)}
                onOrdersClick={() => {}}
                onSelectMarketClick={() => p.onSelectMarket(position.marketAddress)}
                onShareClick={() => {}}
                showPnlAfterFees={false}
              />
            ))}
        </tbody>
      </table>

      {closingPosition && (
        <PositionSeller position={closingPosition} onClose={() => setClosingPositionKey(undefined)} />
      )}

      {editingPositionKey && (
        <PositionEditor positionKey={editingPositionKey} onClose={() => setEditingPositionKey(undefined)} />
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
