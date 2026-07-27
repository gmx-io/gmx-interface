import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";
import { getExpressOrdersEnabledKey } from "config/localStorage";

import { SettingsContextProvider, useSettings } from "./SettingsContextProvider";

const ACCOUNT = "0x1111111111111111111111111111111111111111";

const mocks = vi.hoisted(() => ({
  account: undefined as string | undefined,
  isNonEoaAccountOnAnyChain: false,
  isNonEoaLoading: false,
  isGeminiWallet: false,
}));

vi.mock("lib/chains", () => ({
  useChainId: () => ({ chainId: ARBITRUM, srcChainId: undefined }),
}));

vi.mock("lib/wallets/useWallet", () => ({
  default: () => ({ account: mocks.account }),
}));

vi.mock("lib/wallets/useAccountType", () => ({
  useIsNonEoaAccountOnAnyChain: () => ({
    isNonEoaAccountOnAnyChain: mocks.isNonEoaAccountOnAnyChain,
    isLoading: mocks.isNonEoaLoading,
  }),
}));

vi.mock("lib/wallets/useIsGeminiWallet", () => ({
  useIsGeminiWallet: () => mocks.isGeminiWallet,
}));

const expressOrdersStorageKey = JSON.stringify(getExpressOrdersEnabledKey(ARBITRUM, ACCOUNT));

function setup() {
  let context!: ReturnType<typeof useSettings>;

  function TestComponent() {
    context = useSettings();
    return null;
  }

  render(
    <SettingsContextProvider>
      <TestComponent />
    </SettingsContextProvider>
  );

  return () => context;
}

describe("SettingsContextProvider express trading mode", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.account = ACCOUNT;
    mocks.isNonEoaAccountOnAnyChain = false;
    mocks.isNonEoaLoading = false;
    mocks.isGeminiWallet = false;
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("enables express by default for a supported wallet when nothing is stored", () => {
    const getContext = setup();

    expect(getContext().expressOrdersEnabled).toBe(true);
    expect(localStorage.getItem(expressOrdersStorageKey)).toBe("true");
  });

  it("keeps classic trading when the user has explicitly stored `false`", () => {
    localStorage.setItem(expressOrdersStorageKey, "false");

    const getContext = setup();

    expect(getContext().expressOrdersEnabled).toBe(false);
    expect(localStorage.getItem(expressOrdersStorageKey)).toBe("false");
  });

  it("keeps express enabled when the user has explicitly stored `true`", () => {
    localStorage.setItem(expressOrdersStorageKey, "true");

    const getContext = setup();

    expect(getContext().expressOrdersEnabled).toBe(true);
  });

  it("does not enable express for a disconnected wallet", () => {
    mocks.account = undefined;

    const getContext = setup();

    expect(getContext().expressOrdersEnabled).toBe(false);
    expect(localStorage.getItem(JSON.stringify(getExpressOrdersEnabledKey(ARBITRUM, undefined)))).toBe(null);
  });

  it("does not enable express for an unsupported (non-EOA) wallet", () => {
    mocks.isNonEoaAccountOnAnyChain = true;

    const getContext = setup();

    expect(getContext().expressOrdersEnabled).toBe(false);
  });
});
