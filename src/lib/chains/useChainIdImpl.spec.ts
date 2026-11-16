import { describe, expect, it } from "vitest";

import { ARBITRUM, AVALANCHE, SOURCE_ETHEREUM_MAINNET } from "config/chains";

import {
  canWalletChainUpdateSelectedNetwork,
  getSelectedSourceChainId,
  getWalletNetworkSelection,
} from "./useChainIdImpl";

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

describe("getWalletNetworkSelection", () => {
  const account = "0x865386FCB1bbD2A75364c40AdabD4B1062FfFFd2";
  const otherAccount = "0x4cf82FEAf3d70105d898D18F4b67AF4172Cc65F7";

  it("ignores a wallet switch to a chain the app does not support", () => {
    expect(
      getWalletNetworkSelection({
        account: { chainId: 137, address: account },
        prevAccount: { chainId: ARBITRUM, address: account },
        settlementChainId: ARBITRUM,
      })
    ).toBeUndefined();
  });

  it("ignores a source chain reported at connect time", () => {
    expect(
      getWalletNetworkSelection({
        account: { chainId: SOURCE_ETHEREUM_MAINNET, address: account },
        prevAccount: { chainId: undefined, address: undefined },
        settlementChainId: ARBITRUM,
      })
    ).toBeUndefined();
  });

  it("follows a source chain the user switched to while connected", () => {
    expect(
      getWalletNetworkSelection({
        account: { chainId: SOURCE_ETHEREUM_MAINNET, address: account },
        prevAccount: { chainId: ARBITRUM, address: account },
        settlementChainId: ARBITRUM,
      })
    ).toEqual({ chainId: SOURCE_ETHEREUM_MAINNET, wasAppSelected: true });
  });

  it("ignores a source chain that arrives together with a different account", () => {
    expect(
      getWalletNetworkSelection({
        account: { chainId: SOURCE_ETHEREUM_MAINNET, address: otherAccount },
        prevAccount: { chainId: ARBITRUM, address: account },
        settlementChainId: ARBITRUM,
      })
    ).toBeUndefined();
  });

  it("keeps contract chains passive so the app does not claim the user selected them", () => {
    expect(
      getWalletNetworkSelection({
        account: { chainId: ARBITRUM, address: account },
        prevAccount: { chainId: SOURCE_ETHEREUM_MAINNET, address: account },
        settlementChainId: ARBITRUM,
      })
    ).toEqual({ chainId: ARBITRUM, wasAppSelected: false });
  });

  it("ignores a source chain that belongs to a different settlement chain", () => {
    expect(
      getWalletNetworkSelection({
        account: { chainId: SOURCE_ETHEREUM_MAINNET, address: account },
        prevAccount: { chainId: AVALANCHE, address: account },
        settlementChainId: AVALANCHE,
      })
    ).toBeUndefined();
  });

  it("ignores an account with no chain", () => {
    expect(
      getWalletNetworkSelection({
        account: { chainId: undefined, address: account },
        prevAccount: { chainId: ARBITRUM, address: account },
        settlementChainId: ARBITRUM,
      })
    ).toBeUndefined();
  });
});
