import Button from "components/Button/Button";
import Card from "components/Common/Card";
import { getIsLargeAccount } from "domain/stats/isLargeAccount";
import { useMarketsInfoRequest } from "domain/synthetics/markets/useMarketsInfoRequest";
import { useChainId } from "lib/chains";
import { formatUsd } from "lib/numbers";
import { markFailedRpcProvider, useCurrentRpcUrls } from "lib/rpc/bestRpcTracker";
import { getMarkPrice } from "sdk/utils/prices";

export default function RpcDebug() {
  const { chainId } = useChainId();
  const { primary: primaryRpc, secondary: secondaryRpc } = useCurrentRpcUrls(chainId);
  const { marketsInfoData } = useMarketsInfoRequest(chainId);

  const handleForceFailure = (isPrimary: boolean) => {
    if (isPrimary && primaryRpc) {
      markFailedRpcProvider(chainId, primaryRpc);
    } else if (secondaryRpc) {
      markFailedRpcProvider(chainId, secondaryRpc);
    }
  };

  return (
    <div className="default-container page-layout">
      <Card title="RPC Debug">
        <div className="App-card-content">
          <div className="mb-base mb-12 ">
            <h3 className="mb-12">is Large Account: {getIsLargeAccount().toString()}</h3>
            <h3 className="text-xl mb-12 font-bold">Current RPC</h3>
            <div className="mb-12">Primary RPC: {primaryRpc}</div>
            <div>Secondary RPC: {secondaryRpc}</div>
          </div>

          <div className="mb-base mb-12 ">
            <h3 className="text-xl mb-12 font-bold">Debug Controls</h3>

            <Button variant="secondary" onClick={() => handleForceFailure(true)}>
              Force RPC Failure (Current Primary)
            </Button>
            <div className="mb-12"></div>
            <Button variant="secondary" onClick={() => handleForceFailure(false)}>
              Force RPC Failure (Current Secondary)
            </Button>
          </div>

          <div>
            <h1 className="text-xl mb-12 font-bold">Markets Info</h1>
            {!marketsInfoData ? (
              <div>Loading markets data...</div>
            ) : (
              <div>
                {Object.values(marketsInfoData || {}).map((marketInfo) => (
                  <div key={marketInfo.name}>
                    <div>
                      {marketInfo.name};{" "}
                      {formatUsd(
                        getMarkPrice({ prices: marketInfo.indexToken.prices, isIncrease: true, isLong: true })
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
