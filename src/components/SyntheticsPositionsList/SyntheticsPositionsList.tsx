import { Trans } from "@lingui/macro";
import { SyntheticsPosition } from "components/SyntheticsPosition/SyntheticsPosition";
import { SyntheticsPositionSeller } from "components/SyntheticsPositionSeller/SyntheticsPositionSeller";
import { getPositions, usePositionsData } from "domain/synthetics/positions";
import { useChainId } from "lib/chains";
import { useState } from "react";

export function SyntheticsPositionsList() {
  const { chainId } = useChainId();
  const [closingPositionKey, setClosingPositionKey] = useState<string>();

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
            <SyntheticsPosition
              onClosePositionClick={() => setClosingPositionKey(position.key)}
              key={position.key}
              position={position}
            />
          ))}
        </tbody>
      </table>

      {closingPositionKey && (
        <SyntheticsPositionSeller positionKey={closingPositionKey} onClose={() => setClosingPositionKey(undefined)} />
      )}
    </div>
  );
}
