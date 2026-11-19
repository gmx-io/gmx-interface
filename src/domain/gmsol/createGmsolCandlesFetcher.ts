import { getIsSolanaNetworkEnabled } from "config/ab";
import { getGmsolTokenBySymbol } from "config/gmsol/tokenLookup";
import type { CandlesFetcher } from "domain/tradingview/DataFeed";
import type { OracleFetcher } from "lib/oracleKeeperFetcher";

import { getGmsolOracleSymbol } from "./gmsolOracleUtils";

// The chart asks for candles by its symbol. On Solana that symbol names a Solana token, whose candles come
// from the Arbitrum keeper for its arbitrumTokenAddress.
export function createGmsolCandlesFetcher(arbitrumFetcher: OracleFetcher): CandlesFetcher {
  return {
    fetchOracleCandles: async (tokenSymbol, period, limit) => {
      const token = getGmsolTokenBySymbol(tokenSymbol);

      if (!token) {
        throw new Error(`No Solana token for chart symbol ${tokenSymbol}`);
      }

      if (!getIsSolanaNetworkEnabled()) {
        throw new Error("Solana network is disabled");
      }

      return arbitrumFetcher.fetchOracleCandles(getGmsolOracleSymbol(token.address), period, limit);
    },
  };
}
