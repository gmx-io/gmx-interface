import { act, cleanup, render, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "lib/monkeyPatching";
import {
  IS_TOKEN_PERMITS_EOA_ENABLED_UI_FLAG,
  IS_TOKEN_PERMITS_METAMASK_7702_ENABLED_UI_FLAG,
  type UiFlags,
} from "domain/synthetics/uiFlags/uiFlags";
import { PERMIT_WALLET_CHANGED_ERROR } from "lib/errors/customErrors";
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
  account: "0x0000000000000000000000000000000000000001",
  createAndSignTokenPermit: vi.fn(),
  isPermitSignatureValid: true,
}));

vi.mock("lib/chains", () => ({ useChainId: () => ({ chainId: CHAIN_ID }) }));
vi.mock("lib/wallets/useWallet", () => ({
  default: () => ({ signer: { address: mocks.account, provider: {} } }),
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
  validateTokenPermitSignature: async () => ({ isValid: mocks.isPermitSignatureValid }),
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

function Tree() {
  return (
    <SWRConfig value={SWR_CONFIG}>
      <TokenPermitsContextProvider>
        <Harness />
      </TokenPermitsContextProvider>
    </SWRConfig>
  );
}

async function setup() {
  const { rerender } = render(<Tree />);

  await waitFor(() => expect(state.accountType).toBe(mocks.accountType));

  return { rerender: () => rerender(<Tree />) };
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
    mocks.account = ACCOUNT;
    mocks.isPermitSignatureValid = true;
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

  it("keeps every permit signed in one flow and passes the requested deadline through", async () => {
    await setup();

    const usdc = permit(USDC, { deadline: 2n ** 256n - 1n });
    const weth = permit(WETH, { deadline: 2n ** 256n - 1n, r: `0x${"55".repeat(32)}` });
    mocks.createAndSignTokenPermit.mockResolvedValueOnce({ permit: usdc }).mockResolvedValueOnce({ permit: weth });

    const { addTokenPermit } = state;

    await act(async () => {
      await addTokenPermit(USDC, ROUTER, 100n, { deadline: usdc.deadline });
      await addTokenPermit(WETH, ROUTER, 100n, { deadline: weth.deadline });
    });

    expect(mocks.createAndSignTokenPermit.mock.calls.map((call) => call[5])).toEqual([usdc.deadline, weth.deadline]);
    expect(readStoredTokens()).toEqual([USDC, WETH]);
    expect(state.tokenPermits.map((p) => p.deadline)).toEqual([usdc.deadline, weth.deadline]);
  });
  it("reports a wallet switch, not a bad signature, when the wallet signed with the new account", async () => {
    const { rerender } = await setup();

    let resolveSigning: (value: { permit: SignedTokenPermit }) => void = () => undefined;
    mocks.createAndSignTokenPermit.mockReturnValue(new Promise((resolve) => (resolveSigning = resolve)));
    mocks.isPermitSignatureValid = false;

    const { addTokenPermit } = state;
    const signing = addTokenPermit(USDC, ROUTER, 100n);

    mocks.account = "0x0000000000000000000000000000000000000002";
    rerender();
    resolveSigning({ permit: permit(USDC) });

    await expect(signing).rejects.toThrow(PERMIT_WALLET_CHANGED_ERROR);
  });

  it("keeps a permit signed after an earlier render when a stale callback removes another one", async () => {
    const usdc = permit(USDC);
    storePermits([usdc]);
    await setup();

    const { removeTokenPermits, addTokenPermit } = state;
    const weth = permit(WETH, { r: `0x${"66".repeat(32)}` });
    mocks.createAndSignTokenPermit.mockResolvedValue({ permit: weth });

    await act(async () => {
      await addTokenPermit(WETH, ROUTER, 100n);
      removeTokenPermits([usdc]);
    });

    expect(readStoredTokens()).toEqual([WETH]);
  });

  it("stores nothing when the account changes while a permit is being signed", async () => {
    const { rerender } = await setup();

    let resolveSigning: (value: { permit: SignedTokenPermit }) => void = () => undefined;
    mocks.createAndSignTokenPermit.mockReturnValue(new Promise((resolve) => (resolveSigning = resolve)));

    const { addTokenPermit } = state;
    const signing = addTokenPermit(USDC, ROUTER, 100n);

    mocks.account = "0x0000000000000000000000000000000000000002";
    rerender();
    resolveSigning({ permit: permit(USDC) });

    await expect(signing).rejects.toThrow(PERMIT_WALLET_CHANGED_ERROR);
    expect(readStoredTokens()).toEqual([]);
    expect(
      JSON.parse(localStorage.getItem(JSON.stringify([CHAIN_ID, mocks.account, "token-permits"])) ?? "[]")
    ).toEqual([]);
  });
});
