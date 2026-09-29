/**
 * GMX ships icons per EVM symbol; GMTrade symbols are not all covered (`WSOL`, `WPUMP`, `EURUSD`, unknown
 * mints rendered as shortened addresses). `TokenIcon` throws on a missing icon, so callers resolve the
 * symbol first and render no icon when nothing matches.
 */
export function iconSymbolCandidates(symbol: string): string[] {
  const candidates = [symbol];
  const unwrapped = symbol.replace(/^W(?=[A-Z0-9]{2,})/, "");
  if (unwrapped !== symbol) candidates.push(unwrapped);
  const forexBase = symbol.replace(/USD$/, "");
  if (forexBase && forexBase !== symbol) candidates.push(forexBase);
  return candidates;
}

/** First candidate that `hasIcon` accepts, or undefined. */
export function pickSolanaTokenIconSymbol(symbol: string | undefined, hasIcon: (symbol: string) => boolean): string | undefined {
  if (!symbol) return undefined;
  return iconSymbolCandidates(symbol).find(hasIcon);
}
