import { act, cleanup, render, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "lib/monkeyPatching";
import { IS_TOKEN_PERMITS_EOA_ENABLED_UI_FLAG, type UiFlags } from "domain/synthetics/uiFlags/uiFlags";
import type { SignedTokenPermit } from "sdk/utils/tokens/types";

import { TokenPermitsContextProvider, TokenPermitsState, useTokenPermitsContext } from "./TokenPermitsContextProvider";

const CHAIN_ID = 42161;
const ACCOUNT = "0x0000000000000000000000000000000000000001";
const ROUTER = "0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6";
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const LINK = "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4";

const mocks = vi.hoisted(() => ({
  uiFlags: undefined as UiFlags | undefined,
  accountType: "eoa" as string,
  hasProvider: true,
  createAndSignTokenPermit: vi.fn(),
}));

vi.mock("lib/chains", () => ({ useChainId: () => ({ chainId: CHAIN_ID }) }));
vi.mock("lib/wallets/useWallet", () => ({
  default: () => ({ signer: { address: ACCOUNT, provider: mocks.hasProvider ? {} : undefined } }),
}));
vi.mock("lib/wallets/walletConfig", () => ({ getPublicClientWithRpc: () => ({}) }));
vi.mock("domain/synthetics/uiFlags/useUiFlagsRequest", () => ({
  useUiFlagsRequest: () => ({ uiFlags: mocks.uiFlags }),
}));
vi.mock("context/SettingsContext/SettingsContextProvider", () => ({
  useSettings: () => ({ isTokenPermitsQaOverrideEnabled: false }),
}));
vi.mock("domain/tokens/tokenPermitsEligibility", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getTokenPermitAccountType: async () => mocks.accountType,
}));
vi.mock("domain/tokens/permitUtils", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createAndSignTokenPermit: mocks.createAndSignTokenPermit,
  validateTokenPermitSignature: async () => ({ isValid: true }),
}));

function permit(token: string, overrides: Partial<SignedTokenPermit> = {}): SignedTokenPermit {
  return {
    token,
    owner: ACCOUNT,
    spender: ROUTER,
    value: 100n,
    deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
    v: 27,
    r: `0x${"11".repeat(32)}`,
    s: `0x${"22".repeat(32)}`,
    onchainParams: { name: "Token", version: "1", nonce: 0n },
    ...overrides,
  };
}

const PERMITS_KEY = JSON.stringify([CHAIN_ID, ACCOUNT, "token-permits"]);
const FALLBACK_KEY = JSON.stringify([CHAIN_ID, ACCOUNT, "token-permits-fallback"]);

function storePermits(permits: SignedTokenPermit[]) {
  localStorage.setItem(PERMITS_KEY, JSON.stringify(permits));
}

function readStoredTokens(): string[] {
  return JSON.parse(localStorage.getItem(PERMITS_KEY) ?? "[]").map((p: SignedTokenPermit) => p.token);
}

// a fresh cache per render keeps the account type from leaking between tests
const SWR_CONFIG = { provider: () => new Map(), dedupingInterval: 0 };

let state: TokenPermitsState;

function Harness() {
  state = useTokenPermitsContext();
  return null;
}

async function setup() {
  render(
    <SWRConfig value={SWR_CONFIG}>
      <TokenPermitsContextProvider>
        <Harness />
      </TokenPermitsContextProvider>
    </SWRConfig>
  );

  await waitFor(() => expect(state.accountType).toBe(mocks.accountType));
}

function flag(name: string, enabled: boolean): UiFlags {
  return { [name]: { enabled, createdAt: "", updatedAt: "" } };
}

describe("TokenPermitsContextProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.uiFlags = flag(IS_TOKEN_PERMITS_EOA_ENABLED_UI_FLAG, true);
    mocks.accountType = "eoa";
    mocks.hasProvider = true;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("exposes stored permits for allowlisted tokens when the account type's flag is on", async () => {
    storePermits([permit(USDC), permit(LINK), permit(WETH, { owner: "0x0000000000000000000000000000000000000002" })]);

    await setup();

    expect(state.tokenPermits.map((p) => p.token)).toEqual([USDC]);
    expect(state.getIsPermitAvailable(USDC)).toBe(true);
    expect(state.getIsPermitAvailable(LINK)).toBe(false);
  });

  it("sends a token whose permit failed back to approvals without touching other tokens", async () => {
    storePermits([permit(USDC), permit(WETH)]);
    await setup();

    act(() => state.disableTokenPermits([USDC]));

    expect(state.getIsPermitAvailable(USDC)).toBe(false);
    expect(state.getIsPermitAvailable(WETH)).toBe(true);
    expect(state.tokenPermits.map((p) => p.token)).toEqual([WETH]);
  });

  it("removes only the given permits", async () => {
    const usdc = permit(USDC);
    const weth = permit(WETH, { r: `0x${"33".repeat(32)}` });
    storePermits([usdc, weth]);
    await setup();

    act(() => state.removeTokenPermits([usdc]));

    expect(readStoredTokens()).toEqual([WETH]);
  });

  it("removes used permits stored for another chain without touching the current one", async () => {
    const AVALANCHE = 43114;
    const avalancheKey = JSON.stringify([AVALANCHE, ACCOUNT, "token-permits"]);
    const usdc = permit(USDC);
    localStorage.setItem(avalancheKey, JSON.stringify([usdc]));
    storePermits([usdc]);
    await setup();

    act(() => state.removeTokenPermits([usdc], AVALANCHE));

    expect(JSON.parse(localStorage.getItem(avalancheKey)!)).toEqual([]);
    expect(readStoredTokens()).toEqual([USDC]);
  });

  it("keeps every token disabled in a row, even from callbacks of an earlier render", async () => {
    await setup();
    const { disableTokenPermits } = state;

    act(() => {
      disableTokenPermits([USDC]);
      disableTokenPermits([WETH]);
    });

    expect(JSON.parse(localStorage.getItem(FALLBACK_KEY)!)).toEqual([USDC, WETH]);
    expect(state.getIsPermitAvailable(USDC)).toBe(false);
    expect(state.getIsPermitAvailable(WETH)).toBe(false);
  });

  it("disables a token for the account the permit belongs to, without touching the current one", async () => {
    const otherAccount = "0x0000000000000000000000000000000000000002";
    const otherKey = JSON.stringify([CHAIN_ID, otherAccount, "token-permits-fallback"]);
    await setup();

    act(() => state.disableTokenPermits([USDC], { chainId: CHAIN_ID, account: otherAccount }));

    expect(JSON.parse(localStorage.getItem(otherKey)!)).toEqual([USDC]);
    expect(state.getIsPermitAvailable(USDC)).toBe(true);
  });

  it("replaces an older permit for the same token and spender", async () => {
    storePermits([permit(USDC), permit(WETH)]);
    await setup();

    const newer = permit(USDC, { value: 500n, r: `0x${"44".repeat(32)}` });
    mocks.createAndSignTokenPermit.mockResolvedValue({ permit: newer });

    await act(() => state.addTokenPermit(USDC, ROUTER, 500n));

    expect(state.tokenPermits.map((p) => [p.token, p.value])).toEqual([
      [WETH, 100n],
      [USDC, 500n],
    ]);
  });
  it("fails instead of reporting a signed permit when the wallet isn't ready", async () => {
    mocks.hasProvider = false;
    await setup();

    await expect(state.addTokenPermit(USDC, ROUTER, 100n)).rejects.toThrow();
    expect(mocks.createAndSignTokenPermit).not.toHaveBeenCalled();
  });
});
