import { ARBITRUM } from "config/chains";
import type { UiFlags } from "domain/synthetics/uiFlags/uiFlags";
import { getOracleKeeperUrl } from "sdk/configs/oracleKeeper";

// Solana has no oracle keeper of its own: its UI flags (solanaTrading, the Solana banners) live on the Arbitrum keeper.
// Read directly, so no EVM oracle keeper fetcher or endpoint probe starts while Solana is selected.
export async function fetchSolanaUiFlags(): Promise<UiFlags> {
  const response = await fetch(`${getOracleKeeperUrl(ARBITRUM)}/ui-flags/v2`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Solana UI flags: HTTP ${response.status}`);
  }

  return (await response.json()) as UiFlags;
}
