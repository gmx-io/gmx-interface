import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CURRENT_PROVIDER_LOCALSTORAGE_KEY, SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY } from "config/localStorage";
import { getActivePrivyWalletStorageKey } from "lib/wallets/activeWalletStorage";

import { useDisconnectAndClose } from "../useDisconnectAndClose";

const mocks = vi.hoisted(() => ({
  disconnectAsync: vi.fn(),
  logout: vi.fn(),
  pushEvent: vi.fn(),
  setIsSettingsVisible: vi.fn(),
  setIsVisible: vi.fn(),
  user: { id: "did:privy:user-id" },
  wallets: [] as { disconnect: ReturnType<typeof vi.fn> }[],
}));

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({
    logout: mocks.logout,
    user: mocks.user,
  }),
  useWallets: () => ({
    wallets: mocks.wallets,
  }),
}));

vi.mock("wagmi", () => ({
  useDisconnect: () => ({
    disconnectAsync: mocks.disconnectAsync,
  }),
}));

vi.mock("context/GmxAccountContext/hooks", () => ({
  useGmxAccountModalOpen: () => [false, mocks.setIsVisible],
}));

vi.mock("context/SettingsContext/SettingsContextProvider", () => ({
  useSettings: () => ({
    setIsSettingsVisible: mocks.setIsSettingsVisible,
  }),
}));

vi.mock("lib/userAnalytics", () => ({
  userAnalytics: {
    pushEvent: mocks.pushEvent,
  },
}));

function setup() {
  let handleDisconnect!: ReturnType<typeof useDisconnectAndClose>;

  function TestComponent() {
    handleDisconnect = useDisconnectAndClose();
    return null;
  }

  render(<TestComponent />);

  return handleDisconnect;
}

describe("useDisconnectAndClose", () => {
  beforeEach(() => {
    mocks.disconnectAsync.mockResolvedValue(undefined);
    mocks.logout.mockResolvedValue(undefined);
    mocks.wallets = [{ disconnect: vi.fn() }, { disconnect: vi.fn() }];

    localStorage.setItem(SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY, "true");
    localStorage.setItem(CURRENT_PROVIDER_LOCALSTORAGE_KEY, "metamask");
    localStorage.setItem(
      getActivePrivyWalletStorageKey(mocks.user.id),
      JSON.stringify({
        address: "0x0000000000000000000000000000000000000001",
        connectorType: "embedded",
        walletClientType: "privy",
      })
    );
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("clears wagmi, Privy wallets, Privy auth, legacy storage, and closes account UI", async () => {
    const handleDisconnect = setup();

    await act(async () => {
      await handleDisconnect();
    });

    expect(mocks.disconnectAsync).toHaveBeenCalledTimes(1);
    expect(mocks.wallets[0].disconnect).toHaveBeenCalledTimes(1);
    expect(mocks.wallets[1].disconnect).toHaveBeenCalledTimes(1);
    expect(mocks.logout).toHaveBeenCalledTimes(1);
    expect(mocks.pushEvent).toHaveBeenCalledWith({
      event: "ConnectWalletAction",
      data: {
        action: "Disconnect",
      },
    });

    expect(localStorage.getItem(SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(CURRENT_PROVIDER_LOCALSTORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(getActivePrivyWalletStorageKey(mocks.user.id))).toBeNull();
    expect(mocks.setIsVisible).toHaveBeenCalledWith(false);
    expect(mocks.setIsSettingsVisible).toHaveBeenCalledWith(false);
  });

  it("rejects and keeps account UI open when provider disconnects fail", async () => {
    mocks.disconnectAsync.mockRejectedValue(new Error("wagmi disconnect failed"));
    mocks.wallets = [
      {
        disconnect: vi.fn(() => {
          throw new Error("wallet disconnect failed");
        }),
      },
    ];
    mocks.logout.mockRejectedValue(new Error("logout failed"));

    const handleDisconnect = setup();

    await act(async () => {
      await expect(handleDisconnect()).rejects.toThrow("wagmi disconnect failed");
    });

    expect(mocks.setIsVisible).not.toHaveBeenCalled();
    expect(mocks.setIsSettingsVisible).not.toHaveBeenCalled();
  });
});
