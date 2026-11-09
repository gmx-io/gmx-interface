import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { IS_WALLET_BATCHING_ENABLED_UI_FLAG } from "domain/synthetics/uiFlags/uiFlags";
import { disableWalletBatchingForSession, getWalletBatchingSessionKey } from "lib/wallets/walletBatchingSession";

import { useWalletBatching } from "./useWalletBatching";

const mocks = vi.hoisted(() => ({
  isFlagEnabled: true,
  isQaOverrideEnabled: false,
  atomicStatus: undefined as string | undefined,
  account: "0x0000000000000000000000000000000000000001",
  useWalletChainCapabilities: vi.fn(),
}));

vi.mock("wagmi", () => ({ useAccount: () => ({ connector: { uid: "connector" }, address: mocks.account }) }));
vi.mock("domain/synthetics/uiFlags/useUiFlagsRequest", () => ({
  useUiFlagsRequest: () => ({
    uiFlags: { [IS_WALLET_BATCHING_ENABLED_UI_FLAG]: { enabled: mocks.isFlagEnabled, createdAt: "", updatedAt: "" } },
  }),
}));
vi.mock("context/SettingsContext/SettingsContextProvider", () => ({
  useSettings: () => ({ isWalletBatchingQaOverrideEnabled: mocks.isQaOverrideEnabled }),
}));
vi.mock("lib/wallets/useWalletChainCapabilities", () => ({
  useWalletChainCapabilities: (params: { chainId: number; enabled: boolean }) => {
    mocks.useWalletChainCapabilities(params);
    return params.enabled ? { atomicStatus: mocks.atomicStatus } : undefined;
  },
}));

const ARBITRUM = 42161;

let result: ReturnType<typeof useWalletBatching>;

function Harness({ enabled = true }: { enabled?: boolean }) {
  result = useWalletBatching({ chainId: ARBITRUM, enabled });
  return null;
}

describe("useWalletBatching", () => {
  beforeEach(() => {
    mocks.isFlagEnabled = true;
    mocks.isQaOverrideEnabled = false;
    mocks.atomicStatus = "supported";
    mocks.account = `0x${Math.floor(Math.random() * 1e12)
      .toString(16)
      .padStart(40, "0")}`;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it.each([
    { status: "supported", isAvailable: true },
    { status: "ready", isAvailable: true },
    { status: "unsupported", isAvailable: false },
  ])("treats an atomic status of $status as batchable: $isAvailable", ({ status, isAvailable }) => {
    mocks.atomicStatus = status;

    render(<Harness />);

    expect(result).toEqual({ isAvailable, atomicStatus: status });
  });

  it("doesn't ask the wallet while the flag is off, unless the QA override is on", () => {
    mocks.isFlagEnabled = false;
    const view = render(<Harness />);

    expect(result.isAvailable).toBe(false);
    expect(mocks.useWalletChainCapabilities).toHaveBeenLastCalledWith({ chainId: ARBITRUM, enabled: false });

    mocks.isQaOverrideEnabled = true;
    view.rerender(<Harness />);

    expect(result.isAvailable).toBe(true);
  });

  it("stays off for the rest of the session once the wallet turned a batch down", () => {
    render(<Harness />);
    expect(result.isAvailable).toBe(true);

    act(() =>
      disableWalletBatchingForSession(
        getWalletBatchingSessionKey({ connectorUid: "connector", account: mocks.account, chainId: ARBITRUM })
      )
    );

    expect(result.isAvailable).toBe(false);
  });
});
