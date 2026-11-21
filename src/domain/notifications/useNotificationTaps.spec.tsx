import { act, cleanup, render, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useNotificationTaps } from "./useNotificationTaps";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    networkId: 42161,
    srcChainId: undefined as number | undefined,
    isConnected: true,
    switchNetwork: vi.fn(),
    setSettlementChainId: vi.fn(),
  },
}));

vi.mock("lib/chains", () => ({
  useChainId: () => ({ networkId: mocks.networkId, srcChainId: mocks.srcChainId }),
}));

vi.mock("context/GmxAccountContext/hooks", () => ({
  useGmxAccountSettlementChainId: () => [mocks.networkId, mocks.setSettlementChainId],
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ isConnected: mocks.isConnected }),
}));

vi.mock("lib/wallets/useIsWalletInitializing", () => ({
  useIsWalletInitializing: () => false,
}));

vi.mock("lib/wallets", () => ({
  switchNetwork: mocks.switchNetwork,
}));

vi.mock("components/Errors/errorToasts", () => ({
  getSmartWalletChainUnavailableToastContent: () => null,
}));

const ROUTE = "/trade/long?chainId=42161&market=ETH&pool=ETH-USDC";
const TRADE_PATH = "/trade/long?market=ETH&pool=ETH-USDC";

function setup(initialEntry = "/earn") {
  const location = { current: "" };
  const initialEntries = [initialEntry];

  function Probe() {
    useNotificationTaps();
    const { pathname, search } = useLocation();
    location.current = `${pathname}${search}`;
    return null;
  }

  const tree = () => (
    <MemoryRouter initialEntries={initialEntries}>
      <Probe />
    </MemoryRouter>
  );
  const { rerender } = render(tree());

  return { location, rerender: () => rerender(tree()) };
}

function sendTap(route: string) {
  act(() => {
    navigator.serviceWorker.dispatchEvent(
      new MessageEvent("message", { data: { type: "gmx-notification-click", route } })
    );
  });
}

describe("useNotificationTaps", () => {
  beforeEach(() => {
    mocks.networkId = 42161;
    mocks.srcChainId = undefined;
    mocks.isConnected = true;
    mocks.switchNetwork.mockReset().mockResolvedValue(undefined);
    mocks.setSettlementChainId.mockReset();
    Object.defineProperty(navigator, "serviceWorker", { value: new EventTarget(), configurable: true });
  });

  afterEach(() => {
    cleanup();
  });

  it("opens the trade page with no network prompt when the app is on the notification's chain", async () => {
    const { location } = setup();

    sendTap(ROUTE);

    await waitFor(() => expect(location.current).toBe(TRADE_PATH));
    expect(mocks.switchNetwork).not.toHaveBeenCalled();
  });

  it("switches the wallet first and opens the market on the new chain", async () => {
    mocks.networkId = 43114;
    const { location, rerender } = setup();

    sendTap(ROUTE);

    await waitFor(() => expect(mocks.switchNetwork).toHaveBeenCalledExactlyOnceWith(42161, true));
    expect(location.current).toBe("/earn");

    mocks.networkId = 42161;
    rerender();

    await waitFor(() => expect(location.current).toBe(TRADE_PATH));
  });

  it("changes nothing when the user refuses the switch", async () => {
    mocks.networkId = 43114;
    mocks.switchNetwork.mockRejectedValue(new Error("User rejected the request"));
    const { location } = setup();

    sendTap(ROUTE);

    await waitFor(() => expect(mocks.switchNetwork).toHaveBeenCalledOnce());
    await act(async () => undefined);
    expect(location.current).toBe("/earn");
  });

  it("moves a GMX Account to the notification's chain without a wallet prompt", async () => {
    mocks.networkId = 43114;
    mocks.srcChainId = 8453;
    const { location, rerender } = setup();

    sendTap(ROUTE);

    await waitFor(() => expect(mocks.setSettlementChainId).toHaveBeenCalledExactlyOnceWith(42161));
    expect(mocks.switchNetwork).not.toHaveBeenCalled();

    mocks.networkId = 42161;
    rerender();

    await waitFor(() => expect(location.current).toBe(TRADE_PATH));
  });

  it("takes the tap from the URL of a new window", async () => {
    const { location } = setup(`/trade?notification=${encodeURIComponent(ROUTE)}`);

    await waitFor(() => expect(location.current).toBe(TRADE_PATH));
  });

  it.each(["/earn", "https://evil.example/trade"])("drops a route outside the trade page: %s", async (route) => {
    const { location } = setup(`/trade?notification=${encodeURIComponent(route)}`);

    await waitFor(() => expect(location.current).toBe("/trade"));
    sendTap(route);
    await act(async () => undefined);

    expect(location.current).toBe("/trade");
    expect(mocks.switchNetwork).not.toHaveBeenCalled();
  });
});
