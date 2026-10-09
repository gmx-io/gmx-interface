import { act, cleanup, render, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "lib/monkeyPatching";
import {
  IS_TOKEN_PERMITS_EOA_ENABLED_UI_FLAG,
  IS_TOKEN_PERMITS_METAMASK_7702_ENABLED_UI_FLAG,
  type UiFlags,
} from "domain/synthetics/uiFlags/uiFlags";
import type { SignedTokenPermit } from "sdk/utils/tokens/types";

import { TokenPermitsContextProvider, TokenPermitsState, useTokenPermitsContext } from "./TokenPermitsContextProvider";

const CHAIN_ID = 42161;
const ACCOUNT = "0x0000000000000000000000000000000000000001";
const ROUTER = "0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6";
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
const ARB = "0x912CE59144191C1204E64559FE8253a0e49E6548";

const mocks = vi.hoisted(() => ({
  uiFlags: undefined as UiFlags | undefined,
  isQaOverrideEnabled: false,
  accountType: "eoa" as string,
  createAndSignTokenPermit: vi.fn(),
}));

vi.mock("lib/chains", () => ({ useChainId: () => ({ chainId: CHAIN_ID }) }));
vi.mock("lib/wallets/useWallet", () => ({
  default: () => ({ signer: { address: ACCOUNT, provider: {} } }),
}));
vi.mock("lib/wallets/walletConfig", () => ({ getPublicClientWithRpc: () => ({}) }));
vi.mock("domain/synthetics/uiFlags/useUiFlagsRequest", () => ({
  useUiFlagsRequest: () => ({ uiFlags: mocks.uiFlags }),
}));
vi.mock("context/SettingsContext/SettingsContextProvider", () => ({
  useSettings: () => ({ isTokenPermitsQaOverrideEnabled: mocks.isQaOverrideEnabled }),
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
    mocks.isQaOverrideEnabled = false;
    mocks.accountType = "eoa";
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("exposes stored permits for allowlisted tokens when the account type's flag is on", async () => {
    storePermits([permit(USDC), permit(ARB)]);

    await setup();

    expect(state.tokenPermits.map((p) => p.token)).toEqual([USDC]);
    expect(state.getIsPermitAvailable(USDC)).toBe(true);
    expect(state.getIsPermitAvailable(ARB)).toBe(false);
  });

  it("switches permits off when the flag for the account type is off", async () => {
    mocks.accountType = "metaMask7702";
    storePermits([permit(USDC)]);

    await setup();

    expect(state.tokenPermits).toEqual([]);
    expect(state.getIsPermitAvailable(USDC)).toBe(false);
  });

  it("lets the QA override turn permits on before the flags are", async () => {
    mocks.uiFlags = flag(IS_TOKEN_PERMITS_METAMASK_7702_ENABLED_UI_FLAG, false);
    mocks.isQaOverrideEnabled = true;
    mocks.accountType = "metaMask7702";

    await setup();

    expect(state.getIsPermitAvailable(USDC)).toBe(true);
  });

  it("keeps permits off for unsupported accounts even with the QA override", async () => {
    mocks.isQaOverrideEnabled = true;
    mocks.accountType = "unsupported";

    await setup();

    expect(state.getIsPermitAvailable(USDC)).toBe(false);
  });

  it("ignores and retires the sticky global disable older builds left behind", async () => {
    localStorage.setItem(JSON.stringify("permits-disabled"), "true");

    await setup();

    expect(state.getIsPermitAvailable(USDC)).toBe(true);
    expect(localStorage.getItem(JSON.stringify("permits-disabled"))).toBeNull();
  });

  it("hides permits signed by another owner", async () => {
    storePermits([permit(USDC, { owner: "0x0000000000000000000000000000000000000002" })]);

    await setup();

    expect(state.tokenPermits).toEqual([]);
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
});
