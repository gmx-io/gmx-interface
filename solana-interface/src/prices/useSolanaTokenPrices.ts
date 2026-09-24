import { useEffect } from "react";

import { retainSolanaMarketSocket, useSolanaMarketSocketState } from "../markets/solanaMarketSocketStore";

/** Token min/max unit prices (keyed by mint) from the GMTrade backend `tickers` feed. */
export function useSolanaTokenPrices() {
  useEffect(() => retainSolanaMarketSocket(), []);
  const { tokenPriceByMint } = useSolanaMarketSocketState();
  return { tokenPriceByMint };
}
