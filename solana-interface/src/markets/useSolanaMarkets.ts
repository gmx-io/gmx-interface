import { useEffect } from "react";

import { retainSolanaMarketSocket, useSolanaMarketSocketState } from "./solanaMarketSocketStore";

/** Market list (tokens, supply) from the GMTrade backend `indexTokens` feed. */
export function useSolanaMarkets() {
  useEffect(() => retainSolanaMarketSocket(), []);
  const { marketInfoByToken, status, error } = useSolanaMarketSocketState();
  return { marketInfoByToken, status, error };
}
