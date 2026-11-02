import { ARBITRUM } from "config/chains";
import type { UiFlags } from "domain/synthetics/uiFlags/uiFlags";
import { getOracleKeeperUrl } from "sdk/configs/oracleKeeper";

export async function fetchSolanaTradingEnabled(): Promise<boolean> {
  const response = await fetch(`${getOracleKeeperUrl(ARBITRUM)}/ui-flags/v2`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch solanaTrading: HTTP ${response.status}`);
  }

  const flags = (await response.json()) as UiFlags;

  return flags.solanaTrading?.enabled === true;
}
