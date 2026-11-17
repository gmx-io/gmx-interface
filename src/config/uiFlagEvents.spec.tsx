import { beforeEach, describe, expect, it, vi } from "vitest";

import { getIsSolanaNetworkEnabled } from "config/ab";
import { ARBITRUM, SOLANA_NETWORK_ID } from "config/chains";

import { getIsUiFlagEventOnNetwork, uiFlagEventsData } from "./uiFlagEvents";

vi.mock("config/ab", async (importOriginal) => ({
  ...(await importOriginal<typeof import("config/ab")>()),
  getIsSolanaNetworkEnabled: vi.fn(),
}));

const solanaBanner = uiFlagEventsData.find((event) => event.id === "solana-service-disruption")!;
const evmBanner = uiFlagEventsData.find((event) => !event.network)!;

describe("getIsUiFlagEventOnNetwork", () => {
  beforeEach(() => {
    vi.mocked(getIsSolanaNetworkEnabled).mockReturnValue(true);
  });

  it("shows the Solana banner only on Solana with the solanaNetwork flag on", () => {
    expect(getIsUiFlagEventOnNetwork(solanaBanner, SOLANA_NETWORK_ID)).toBe(true);
    expect(getIsUiFlagEventOnNetwork(solanaBanner, ARBITRUM)).toBe(false);

    vi.mocked(getIsSolanaNetworkEnabled).mockReturnValue(false);
    expect(getIsUiFlagEventOnNetwork(solanaBanner, SOLANA_NETWORK_ID)).toBe(false);
  });

  it("keeps EVM banners off Solana and on EVM regardless of the flag", () => {
    expect(getIsUiFlagEventOnNetwork(evmBanner, ARBITRUM)).toBe(true);
    expect(getIsUiFlagEventOnNetwork(evmBanner, SOLANA_NETWORK_ID)).toBe(false);

    vi.mocked(getIsSolanaNetworkEnabled).mockReturnValue(false);
    expect(getIsUiFlagEventOnNetwork(evmBanner, ARBITRUM)).toBe(true);
  });
});
