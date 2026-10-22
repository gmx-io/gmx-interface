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

  const usdc = permit(USDC);
  const weth = permit(WETH);

  it.each([
    {
      name: "carries only the permits for tokens the relay call spends",
      isGmxAccount: false,
      tokenPermits: [usdc, permit(USDT), weth],
      expected: [usdc, weth],
    },
    {
      name: "never carries permits into GMX Account relay calls",
      isGmxAccount: true,
      tokenPermits: [usdc],
      expected: [],
    },
    {
      name: "drops permits for another spender and expired permits",
      isGmxAccount: false,
      tokenPermits: [permit(USDC, { spender: OTHER_SPENDER }), permit(WETH, { deadline: BigInt(NOW - 1) })],
      expected: [],
    },
  ])("$name", ({ isGmxAccount, tokenPermits, expected }) => {
    expect(
      getRelayTokenPermits({ chainId: ARBITRUM, isGmxAccount, tokenPermits, spentTokenAddresses: [USDC, WETH] })
    ).toEqual(expected);
  });
});

describe("getPermitsExpiryTimeoutMs", () => {
  it.each([
    { name: "fires shortly after the nearest deadline", deadlines: [NOW + 10, NOW + 60], expected: 11_500 },
    { name: "fires immediately for an already expired permit", deadlines: [NOW - 100], expected: 0 },
    {
      name: "clamps far deadlines to the largest delay setTimeout honours",
      deadlines: [NOW + 365 * 24 * 3600],
      expected: 2 ** 31 - 1,
    },
  ])("$name", ({ deadlines, expected }) => {
    const permits = deadlines.map((deadline) => permit(USDC, { deadline: BigInt(deadline) }));

    expect(getPermitsExpiryTimeoutMs(permits, NOW)).toBe(expected);
  });
});
