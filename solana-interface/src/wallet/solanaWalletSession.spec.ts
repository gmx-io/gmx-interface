import { describe, expect, it } from "vitest";

import {
  decideSolanaSession,
  indexTokenPrices,
  readSplAmount,
  solanaDisplaySymbol,
  solanaPriceSymbol,
  solanaTokenUsd,
  swapTokenMints,
  type SolanaWalletCandidate,
} from "./solanaWalletSession";

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

  it("stays disconnected after Phantom is disconnected while a social embedded wallet is connected", () => {
    expect(
      decideSolanaSession({
        ...base,
        isSocial: true,
        suppressedAddress: "P",
        connected: [{ address: "E", name: "Privy", embedded: true }],
      })
    ).toEqual({ type: "none" });
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
  it("reads 20-decimal payload prices as 30-decimal USD", () => {
    expect(
      indexTokenPrices({
        type: "indexTokens",
        payload: [
          { symbol: "SOL", indexToken: "So111", price: (116n * 10n ** 20n).toString() },
          { symbol: "BTC", price: "0" },
        ],
      })
    ).toEqual({ SOL: 116n * 10n ** 30n, So111: 116n * 10n ** 30n });
  });
});

describe("solanaTokenUsd", () => {
  it("converts a token amount with a 30-decimal price into USD", () => {
    expect(solanaTokenUsd(1_000_000_000n, 9, 116n * 10n ** 30n)).toBe(116n * 10n ** 30n);
  });

  it("returns undefined when no price is available", () => {
    expect(solanaTokenUsd(1_000_000_000n, 9, undefined)).toBeUndefined();
  });

  it("matches Available to Trade unitPrice valuation", () => {
    const decimals = 8;
    const unitPrice = 85429841615448807n;
    const amount = 10n ** BigInt(decimals);
    const prices = indexTokenPrices({
      payload: [{ symbol: "BTC", price: (unitPrice * 10n ** BigInt(decimals)).toString() }],
    });
    expect(solanaTokenUsd(amount, decimals, prices.BTC)).toBe(amount * unitPrice * 10n ** 10n);
  });
});

describe("swapTokenMints", () => {
  it("reads trade token mints and ignores everything else", () => {
    expect(
      swapTokenMints({
        type: "swapList",
        payload: [{ tokenAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" }, { lpAmount: "1" }, null],
      })
    ).toEqual(["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"]);
    expect(solanaPriceSymbol("WSOL")).toBe("SOL");
    expect(solanaPriceSymbol("WGMX")).toBe("GMX");
    expect(solanaDisplaySymbol("WGMX")).toBe("GMX");
    expect(solanaDisplaySymbol("WSOL")).toBe("WSOL");
  });
});

describe("readSplAmount", () => {
  it("reads the token-account amount at byte 64", () => {
    const data = new Uint8Array(72);
    data[64] = 1;
    expect(readSplAmount(data)).toBe(1n);
    expect(readSplAmount(new Uint8Array(8))).toBeUndefined();
  });
});
