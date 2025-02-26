import React, { useState } from "react";
import { useCurrentRpcUrls, markFailedRpcProvider } from "lib/rpc/bestRpcTracker";
import Button from "components/Button/Button";
import Checkbox from "components/Checkbox/Checkbox";
import { useChainId } from "lib/chains";
import { useMarketsInfoRequest } from "domain/synthetics/markets/useMarketsInfoRequest";
import Card from "components/Common/Card";

export default function RpcDebug() {
  const { chainId } = useChainId();
  const { primary: primaryRpc, secondary: secondaryRpc } = useCurrentRpcUrls(chainId);
  const [simulateError, setSimulateError] = useState(false);
  const { marketsInfoData, isBalancesLoaded } = useMarketsInfoRequest(chainId);

  const handleForceFailure = () => {
    if (primaryRpc) {
      markFailedRpcProvider(chainId, primaryRpc);
    }
  };

  return (
    <div className="default-container page-layout">
      <Card title="RPC Debug">
        <div className="App-card-content">
          <div className="mb-base">
            <h3>Current RPC Information</h3>
            <div>Primary RPC: {primaryRpc}</div>
            <div>Secondary RPC: {secondaryRpc}</div>
          </div>

          <div className="mb-base">
            <h3>Debug Controls</h3>
            <div className="mb-sm">
              <Checkbox isChecked={simulateError} setIsChecked={setSimulateError}>
                Simulate RPC Error
              </Checkbox>
            </div>
            <Button variant="primary-action" onClick={handleForceFailure}>
              Force RPC Failure (Current Primary)
            </Button>
          </div>

          <div>
            <h3>Markets Info</h3>
            {!isBalancesLoaded ? (
              <div>Loading markets data...</div>
            ) : (
              <div>
                <div>Total Markets: {Object.keys(marketsInfoData || {}).length}</div>
                {marketsInfoData && Object.keys(marketsInfoData).length > 0 && (
                  <div>
                    <div>Sample Market:</div>
                    <pre>{JSON.stringify(Object.values(marketsInfoData)[0], null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
