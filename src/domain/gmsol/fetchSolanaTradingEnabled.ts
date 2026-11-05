import { fetchSolanaUiFlags } from "./fetchSolanaUiFlags";

export async function fetchSolanaTradingEnabled(): Promise<boolean> {
  const flags = await fetchSolanaUiFlags();

  return flags.solanaTrading?.enabled === true;
}
