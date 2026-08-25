import { describe, expect, it } from "vitest";

import { ARBITRUM, DEFAULT_SETTLEMENT_CHAIN_ID } from "config/chains";

import { getPrivyWalletList, getSupportedChains, PRIVY_WALLET_LIST } from "./walletConfig";

const METAMASK_IOS_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_4_1 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 WebView MetaMaskMobile";

describe("getPrivyWalletList", () => {
  it("only offers the injected connector inside MetaMask iOS", () => {
    expect(getPrivyWalletList(METAMASK_IOS_USER_AGENT)).toEqual(["detected_ethereum_wallets"]);
  });

  it("keeps the configured wallet list in other browsers", () => {
    expect(getPrivyWalletList("Mobile Safari")).toBe(PRIVY_WALLET_LIST);
  });
});

describe("getSupportedChains", () => {
  it("uses Arbitrum as the default settlement chain", () => {
    expect(DEFAULT_SETTLEMENT_CHAIN_ID).toBe(ARBITRUM);
  });

  it("places the default settlement chain first", () => {
    const supportedChains = getSupportedChains();

    expect(supportedChains[0].id).toBe(DEFAULT_SETTLEMENT_CHAIN_ID);
  });

  it("does not duplicate chains when pinning the default chain first", () => {
    const chainIds = getSupportedChains().map((chain) => chain.id);

    expect(new Set(chainIds).size).toBe(chainIds.length);
  });
});
