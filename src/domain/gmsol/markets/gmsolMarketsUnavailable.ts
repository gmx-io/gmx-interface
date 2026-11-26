// A failed request or a stale snapshot blocks every Solana market; a coverage gap blocks only the markets it names.
export type GmsolMarketsUnavailableReason = "request" | "stale" | "coverage";

// Thrown into marketsInfo when the Solana host or prices fail: Solana has no RPC fallback.
export class GmsolMarketsUnavailableError extends Error {
  constructor(
    readonly reason: GmsolMarketsUnavailableReason,
    readonly marketAddresses: readonly string[] = [],
    readonly requestError?: Error
  ) {
    super("Solana market data is unavailable");
    this.name = "GmsolMarketsUnavailableError";
  }
}
