import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CURRENT_PROVIDER_LOCALSTORAGE_KEY, SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY } from "config/localStorage";

import { useDisconnectAndClose } from "../useDisconnectAndClose";

const mocks = vi.hoisted(() => ({
  disconnectAsync: vi.fn(),
  logout: vi.fn(),
  pushEvent: vi.fn(),
  setIsSettingsVisible: vi.fn(),
  setIsVisible: vi.fn(),
  wallets: [] as { disconnect: ReturnType<typeof vi.fn> }[],
  disconnectPrivyWalletsFromWagmi: vi.fn(),
}));

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({
    logout: mocks.logout,
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

vi.mock("lib/wallets/privyWagmi", () => ({
  disconnectPrivyWalletsFromWagmi: mocks.disconnectPrivyWalletsFromWagmi,
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
    mocks.disconnectPrivyWalletsFromWagmi.mockResolvedValue(undefined);
    mocks.wallets = [{ disconnect: vi.fn() }, { disconnect: vi.fn() }];

    localStorage.setItem(SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY, "true");
    localStorage.setItem(CURRENT_PROVIDER_LOCALSTORAGE_KEY, "metamask");
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
    expect(mocks.disconnectPrivyWalletsFromWagmi).toHaveBeenCalledTimes(2);
    expect(mocks.disconnectPrivyWalletsFromWagmi).toHaveBeenCalledWith(mocks.wallets);
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
    expect(mocks.setIsVisible).toHaveBeenCalledWith(false);
    expect(mocks.setIsSettingsVisible).toHaveBeenCalledWith(false);
  });

  it("still closes account UI when provider disconnects fail", async () => {
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
      await expect(handleDisconnect()).resolves.toBeUndefined();
    });

    expect(mocks.setIsVisible).toHaveBeenCalledWith(false);
    expect(mocks.setIsSettingsVisible).toHaveBeenCalledWith(false);
  });
});
