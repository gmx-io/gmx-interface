import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "sdk/configs/chains";
import { getContract } from "sdk/configs/contracts";
import type { SignedTokenPermit } from "sdk/utils/tokens/types";

import { getPermitsExpiryTimeoutMs, getRelayTokenPermits } from "./permitUtils";

const NOW = 1_800_000_000;
const OWNER = "0x0000000000000000000000000000000000000001";
const OTHER_SPENDER = "0x0000000000000000000000000000000000000002";
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const USDT = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";

function permit(token: string, overrides: Partial<SignedTokenPermit> = {}): SignedTokenPermit {
  return {
    token,
    owner: OWNER,
    spender: getContract(ARBITRUM, "SyntheticsRouter"),
    value: 100n,
    deadline: BigInt(NOW + 3600),
    v: 27,
    r: `0x${"11".repeat(32)}`,
    s: `0x${"22".repeat(32)}`,
    onchainParams: { name: "Token", version: "1", nonce: 0n },
    ...overrides,
  };
}

describe("getRelayTokenPermits", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW * 1000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("carries only the permits for tokens the relay call spends", () => {
    const usdc = permit(USDC);
    const weth = permit(WETH);

    expect(
      getRelayTokenPermits({
        chainId: ARBITRUM,
        isGmxAccount: false,
        tokenPermits: [usdc, permit(USDT), weth],
        spentTokenAddresses: [USDC, WETH],
      })
    ).toEqual([usdc, weth]);
  });

  it("never carries permits into GMX Account relay calls", () => {
    expect(
      getRelayTokenPermits({
        chainId: ARBITRUM,
        isGmxAccount: true,
        tokenPermits: [permit(USDC)],
        spentTokenAddresses: [USDC],
      })
    ).toEqual([]);
  });

  it("drops permits for another spender and expired permits", () => {
    expect(
      getRelayTokenPermits({
        chainId: ARBITRUM,
        isGmxAccount: false,
        tokenPermits: [permit(USDC, { spender: OTHER_SPENDER }), permit(WETH, { deadline: BigInt(NOW - 1) })],
        spentTokenAddresses: [USDC, WETH],
      })
    ).toEqual([]);
  });
});

describe("getPermitsExpiryTimeoutMs", () => {
  it("fires shortly after the nearest deadline", () => {
    const permits = [permit(USDC, { deadline: BigInt(NOW + 10) }), permit(WETH, { deadline: BigInt(NOW + 60) })];

    expect(getPermitsExpiryTimeoutMs(permits, NOW)).toBe(11_500);
  });

  it("fires immediately for an already expired permit", () => {
    expect(getPermitsExpiryTimeoutMs([permit(USDC, { deadline: BigInt(NOW - 100) })], NOW)).toBe(0);
  });

  it("clamps far deadlines to the largest delay setTimeout honours", () => {
    const farDeadline = permit(USDC, { deadline: BigInt(NOW + 365 * 24 * 3600) });

    expect(getPermitsExpiryTimeoutMs([farDeadline], NOW)).toBe(2 ** 31 - 1);
  });
});
