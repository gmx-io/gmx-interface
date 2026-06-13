import { describe, expect, it } from "vitest";

import { ARBITRUM, AVALANCHE, SOURCE_ETHEREUM_MAINNET } from "config/chains";

import { canWalletChainUpdateSelectedNetwork, getSelectedSourceChainId } from "./useChainIdImpl";

describe("getSelectedSourceChainId", () => {
  it("ignores stored source chains that were not selected by the app", () => {
    expect(
      getSelectedSourceChainId({
        chainIdFromLocalStorage: SOURCE_ETHEREUM_MAINNET,
        selectedNetworkWasAppSelected: false,
        settlementChainId: ARBITRUM,
      })
    ).toBeUndefined();
  });

  it("keeps an app-selected source chain related to the settlement chain", () => {
    expect(
      getSelectedSourceChainId({
        chainIdFromLocalStorage: SOURCE_ETHEREUM_MAINNET,
        selectedNetworkWasAppSelected: true,
        settlementChainId: ARBITRUM,
      })
    ).toBe(SOURCE_ETHEREUM_MAINNET);
  });

  it("ignores app-selected source chains unrelated to the settlement chain", () => {
    expect(
      getSelectedSourceChainId({
        chainIdFromLocalStorage: SOURCE_ETHEREUM_MAINNET,
        selectedNetworkWasAppSelected: true,
        settlementChainId: AVALANCHE,
      })
    ).toBeUndefined();
  });
});

describe("canWalletChainUpdateSelectedNetwork", () => {
  it("does not let passive wallet source chains update the selected network", () => {
    expect(canWalletChainUpdateSelectedNetwork(SOURCE_ETHEREUM_MAINNET)).toBe(false);
  });

  it("lets wallet contract chains update the selected network", () => {
    expect(canWalletChainUpdateSelectedNetwork(ARBITRUM)).toBe(true);
  });
});
