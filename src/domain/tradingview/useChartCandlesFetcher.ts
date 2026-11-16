import { isSolanaNetwork } from "config/chains";
import { selectChartDataProvider } from "context/SyntheticsStateContext/selectors/chartDataSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { useChainId } from "lib/chains";
import type { OracleFetcher } from "lib/oracleKeeperFetcher";

import type { CandlesFetcher } from "./DataFeed";

export function useChartCandlesFetcher(oracleKeeperFetcher: OracleFetcher): CandlesFetcher | undefined {
  const { networkId } = useChainId();
  const chartDataProvider = useSelector(selectChartDataProvider);

  return isSolanaNetwork(networkId) ? chartDataProvider?.candlesFetcher : oracleKeeperFetcher;
}
