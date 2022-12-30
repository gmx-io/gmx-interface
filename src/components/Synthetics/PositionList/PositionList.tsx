import { Trans } from "@lingui/macro";

import { PositionItem } from "components/Synthetics/PositionItem/PositionItem";
import { PositionEditor } from "components/Synthetics/PositionEditor/PositionEditor";
import { PositionSeller } from "components/Synthetics/PositionSeller/PositionSeller";
import { getPositions, usePositionsData } from "domain/synthetics/positions";
import { useChainId } from "lib/chains";
import { useState } from "react";

export function PositionList() {
  const { chainId } = useChainId();

  const [closingPositionKey, setClosingPositionKey] = useState<string>();
  const [editingPositionKey, setEditingPositionKey] = useState<string>();

  const positionsData = usePositionsData(chainId);
  const positions = getPositions(positionsData).reverse();

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

      {closingPositionKey && (
        <PositionSeller positionKey={closingPositionKey} onClose={() => setClosingPositionKey(undefined)} />
      )}

      {editingPositionKey && (
        <PositionEditor positionKey={editingPositionKey} onClose={() => setEditingPositionKey(undefined)} />
      )}
    </div>
  );
}
