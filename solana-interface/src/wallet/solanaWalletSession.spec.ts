import { describe, expect, it } from "vitest";

import { decideSolanaSession, indexTokenPrices, solanaTokenUsd, type SolanaWalletCandidate } from "./solanaWalletSession";

const base = {
  connected: [] as SolanaWalletCandidate[],
  remembered: null,
  suppressedAddress: null,
  isSocial: false,
  evmWalletClientType: undefined,
  networkChanged: false,
};

describe("decideSolanaSession", () => {
  it("selects the remembered wallet when it is still connected", () => {
    expect(
      decideSolanaSession({
        ...base,
        remembered: { address: "A", name: "Phantom" },
        connected: [{ address: "A", name: "Phantom", embedded: false }],
      })
    ).toEqual({ type: "select", wallet: { address: "A", name: "Phantom" } });
  });

  it("disconnects a wallet the user explicitly disconnected", () => {
    expect(
      decideSolanaSession({
        ...base,
        suppressedAddress: "A",
        remembered: { address: "A", name: "Phantom" },
        connected: [{ address: "A", name: "Phantom", embedded: false }],
        networkChanged: true,
      })
    ).toEqual({ type: "disconnect", wallet: { address: "A", name: "Phantom" } });
  });

  it("selects a social embedded wallet that Privy already has", () => {
    expect(
      decideSolanaSession({
        ...base,
        isSocial: true,
        connected: [{ address: "E", name: "Privy", embedded: true }],
      })
    ).toEqual({ type: "select", wallet: { address: "E", name: "Privy" } });
  });

  it("creates an embedded wallet when a social user switches onto Solana", () => {
    expect(decideSolanaSession({ ...base, isSocial: true, networkChanged: true })).toEqual({ type: "createEmbedded" });
  });

  it("does not create an embedded wallet on refresh", () => {
    expect(decideSolanaSession({ ...base, isSocial: true })).toEqual({ type: "none" });
  });

  it("does not recreate an embedded wallet after an explicit disconnect", () => {
    expect(
      decideSolanaSession({
        ...base,
        isSocial: true,
        suppressedAddress: "E",
        networkChanged: true,
      })
    ).toEqual({ type: "openConnect" });
  });

  it("selects the Solana account of a dual-chain wallet Privy already connected", () => {
    expect(
      decideSolanaSession({
        ...base,
        evmWalletClientType: "phantom",
        connected: [{ address: "P", name: "Phantom", embedded: false }],
      })
    ).toEqual({ type: "select", wallet: { address: "P", name: "Phantom" } });
  });

  it("asks the dual-chain wallet for Solana authorization when that account is not connected", () => {
    expect(
      decideSolanaSession({
        ...base,
        evmWalletClientType: "phantom",
        networkChanged: true,
      })
    ).toEqual({ type: "openConnect", preSelectedWalletId: "phantom" });
  });

  it("does not open a connect flow on refresh when nothing is remembered", () => {
    expect(decideSolanaSession(base)).toEqual({ type: "none" });
  });

  it("opens a connect flow when switching with no wallet", () => {
    expect(decideSolanaSession({ ...base, networkChanged: true })).toEqual({ type: "openConnect" });
  });
});

describe("indexTokenPrices", () => {
  it("reads positive symbol prices and ignores zeroes", () => {
    expect(
      indexTokenPrices({
        type: "indexTokens",
        data: [
          { symbol: "SOL", price: 150 },
          { symbol: "BTC", price: 0 },
        ],
      })
    ).toEqual({ SOL: 150 });
  });
});

describe("solanaTokenUsd", () => {
  it("converts a token amount with a price into 30-decimal USD", () => {
    expect(solanaTokenUsd(1_000_000_000n, 9, 100)).toBe(100n * 10n ** 30n);
  });

  it("returns undefined when no price is available", () => {
    expect(solanaTokenUsd(1_000_000_000n, 9, undefined)).toBeUndefined();
  });
});
