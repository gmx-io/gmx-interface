import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  SELECTED_NETWORK_LOCAL_STORAGE_KEY,
  SELECTED_NETWORK_WAS_APP_SELECTED_LOCAL_STORAGE_KEY,
} from "config/localStorage";
import { SMART_WALLET_CHAIN_UNAVAILABLE_ERROR } from "lib/errors/customErrors";

const { switchChainMock, getAccountMock, willChangeAccountMock } = vi.hoisted(() => ({
  switchChainMock: vi.fn(),
  getAccountMock: vi.fn(),
  willChangeAccountMock: vi.fn(),
}));

vi.mock("@wagmi/core", () => ({
  switchChain: switchChainMock,
  getAccount: getAccountMock,
}));

vi.mock("./walletConfig", () => ({
  getWagmiConfig: () => ({}),
}));

vi.mock("./useWalletSessionChains", () => ({
  getWillChainSwitchChangeAccount: willChangeAccountMock,
}));

import { switchNetwork } from "./index";

describe("switchNetwork", () => {
  beforeEach(() => {
    localStorage.clear();
    switchChainMock.mockReset();
    getAccountMock.mockReset().mockReturnValue({ address: undefined });
    willChangeAccountMock.mockReset().mockResolvedValue(false);
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

  it("refuses a switch that would change the connected account", async () => {
    getAccountMock.mockReturnValue({ address: "0x865386FCB1bbD2A75364c40AdabD4B1062FfFFd2" });
    willChangeAccountMock.mockResolvedValue(true);

    await expect(switchNetwork(8453, true)).rejects.toThrow(SMART_WALLET_CHAIN_UNAVAILABLE_ERROR);
    expect(switchChainMock).not.toHaveBeenCalled();
    expect(localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY)).toBeNull();
  });

  it("does not let the app-selection fallback mask an account change", async () => {
    getAccountMock.mockReturnValue({ address: "0x865386FCB1bbD2A75364c40AdabD4B1062FfFFd2" });
    willChangeAccountMock.mockResolvedValue(true);

    await expect(switchNetwork(8453, true, { fallbackToAppSelectionOnError: true })).rejects.toThrow(
      SMART_WALLET_CHAIN_UNAVAILABLE_ERROR
    );
    expect(localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY)).toBeNull();
  });

  it("allows a switch that keeps the connected account", async () => {
    getAccountMock.mockReturnValue({ address: "0x865386FCB1bbD2A75364c40AdabD4B1062FfFFd2" });

    await switchNetwork(42161, true);

    expect(switchChainMock).toHaveBeenCalledWith({}, { chainId: 42161 });
    expect(localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY)).toBe("42161");
  });
});
