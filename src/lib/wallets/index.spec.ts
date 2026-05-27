import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  SELECTED_NETWORK_LOCAL_STORAGE_KEY,
  SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY,
} from "config/localStorage";

const { switchChainMock } = vi.hoisted(() => ({
  switchChainMock: vi.fn(),
}));

vi.mock("@wagmi/core", () => ({
  switchChain: switchChainMock,
}));

vi.mock("./walletConfig", () => ({
  getWagmiConfig: () => ({}),
}));

import { switchNetwork } from "./index";

describe("switchNetwork", () => {
  beforeEach(() => {
    localStorage.clear();
    switchChainMock.mockReset();
  });

  it("keeps strict switchChain behavior by default", async () => {
    switchChainMock.mockRejectedValueOnce(new Error("unsupported chain"));

    await expect(switchNetwork(42161, true)).rejects.toThrow("unsupported chain");
    expect(localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY)).toBeNull();
  });

  it("falls back to app selection when requested", async () => {
    switchChainMock.mockRejectedValueOnce(new Error("unsupported chain"));
    const networkChangeHandler = vi.fn();
    document.addEventListener("networkChange", networkChangeHandler);

    await switchNetwork(43113, true, { fallbackToAppSelectionOnError: true });

    expect(localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY)).toBe("43113");
    expect(localStorage.getItem(SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY)).toBe("true");
    expect(networkChangeHandler).toHaveBeenCalledWith(expect.objectContaining({ detail: { chainId: 43113 } }));

    document.removeEventListener("networkChange", networkChangeHandler);
  });
});
