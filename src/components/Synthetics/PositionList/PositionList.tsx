import { Trans } from "@lingui/macro";

import { PositionItem } from "components/Synthetics/PositionItem/PositionItem";
import { PositionEditor } from "components/Synthetics/PositionEditor/PositionEditor";
import { PositionSeller } from "components/Synthetics/PositionSeller/PositionSeller";
import { getAggregatedPositionData, usePositionsData } from "domain/synthetics/positions";
import { useChainId } from "lib/chains";
import { useMemo, useState } from "react";
import { useMarketsData } from "domain/synthetics/markets";
import { useAvailableTokensData } from "domain/synthetics/tokens";

export function PositionList() {
  const { chainId } = useChainId();

  const [closingPositionKey, setClosingPositionKey] = useState<string>();
  const [editingPositionKey, setEditingPositionKey] = useState<string>();

  const positionsData = usePositionsData(chainId);
  const marketsData = useMarketsData(chainId);
  const tokensData = useAvailableTokensData(chainId);

  const positions = useMemo(() => {
    return Object.keys(positionsData)
      .map((key) => getAggregatedPositionData(positionsData, marketsData, tokensData, key)!)
      .reverse();
  }, [marketsData, positionsData, tokensData]);

  const closingPosition = positions.find((position) => position.key === closingPositionKey);
  const editingPosition = positions.find((position) => position.key === editingPositionKey);

  return (
    <div>
      <table className="Exchange-list Orders App-box">
        <tbody>
          <tr className="Exchange-list-header">
            <th>
              <div>
                <Trans>Position</Trans>
              </div>
            </th>
            <th>
              <div>
                <Trans>Net Value</Trans>
              </div>
            </th>
            <th>
              <div>
                <Trans>Size</Trans>
              </div>
            </th>
            <th>
              <div>
                <Trans>Collateral</Trans>
              </div>
            </th>
            <th>
              <div>
                <Trans>Mark Price</Trans>
              </div>
            </th>
            <th>
              <div>
                <Trans>Entry Price</Trans>
              </div>
            </th>
            <th>
              <div>
                <Trans>Liq Price</Trans>
              </div>
            </th>
          </tr>
          {positions.map((position) => (
            <PositionItem
              onEditCollateralClick={() => setEditingPositionKey(position.key)}
              onClosePositionClick={() => setClosingPositionKey(position.key)}
              key={position.key}
              position={position}
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
