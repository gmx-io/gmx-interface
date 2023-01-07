import { Trans, t } from "@lingui/macro";
import { PositionEditor } from "components/Synthetics/PositionEditor/PositionEditor";
import { PositionSeller } from "components/Synthetics/PositionSeller/PositionSeller";
import { useMarketsData } from "domain/synthetics/markets";
import { getAggregatedPositionData, usePositionsData } from "domain/synthetics/positions";
import { useAvailableTokensData } from "domain/synthetics/tokens";
import { useChainId } from "lib/chains";
import { useMemo, useState } from "react";
import { PositionSmall, PositionLarge } from "components/Synthetics/Position/Position";

export function PositionList() {
  const { chainId } = useChainId();

  const [closingPositionKey, setClosingPositionKey] = useState<string>();
  const [editingPositionKey, setEditingPositionKey] = useState<string>();

  const { positionsData, isLoading: isPositionsLoading } = usePositionsData(chainId);
  const { marketsData, isLoading: isMarketsLoading } = useMarketsData(chainId);
  const { tokensData, isLoading: isTokensLoading } = useAvailableTokensData(chainId);

  const positions = useMemo(() => {
    return Object.keys(positionsData)
      .map((key) => getAggregatedPositionData(positionsData, marketsData, tokensData, key)!)
      .reverse();
  }, [marketsData, positionsData, tokensData]);

  const isDataLoading = isPositionsLoading || isMarketsLoading || isTokensLoading;

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
              onSelectMarketClick={() => {}}
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
                onSelectMarketClick={() => {}}
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
    </div>
  );
}
