import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AccountType } from "lib/wallets/useAccountType";

import { useWalletCapabilitiesMetric } from "./useWalletCapabilitiesMetric";

const METAMASK_DELEGATOR = "0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B";

const mocks = vi.hoisted(() => ({
  account: { address: "", connector: { uid: "" } },
  wallets: [] as { address: string; connectorType: string }[],
  chainId: 42161,
  srcChainId: undefined as number | undefined,
  pushEvent: vi.fn(),
  getAccountType: vi.fn(),
  getDelegation: vi.fn(),
  fetchWalletChainCapabilities: vi.fn(),
}));

vi.mock("wagmi", () => ({ useAccount: () => mocks.account }));
vi.mock("@privy-io/react-auth", () => ({ useWallets: () => ({ wallets: mocks.wallets }) }));
vi.mock("lib/chains", () => ({ useChainId: () => ({ chainId: mocks.chainId, srcChainId: mocks.srcChainId }) }));
vi.mock("./Metrics", () => ({ metrics: { pushEvent: mocks.pushEvent } }));
vi.mock("lib/wallets/walletConfig", () => ({
  getPublicClientWithRpc: () => ({ getDelegation: mocks.getDelegation }),
}));
vi.mock("lib/wallets/useAccountType", async (importOriginal) => ({
  ...(await importOriginal<typeof import("lib/wallets/useAccountType")>()),
  getAccountType: mocks.getAccountType,
}));
vi.mock("lib/wallets/walletCapabilities", () => ({
  fetchWalletChainCapabilities: mocks.fetchWalletChainCapabilities,
}));
vi.mock("lib/wallets/useWalletSessionChains", () => ({ getConnectedWalletName: async () => "MetaMask" }));

function TestComponent() {
  useWalletCapabilitiesMetric();
  return null;
}

function connect(address: string, connectorType: string) {
  mocks.account = { address, connector: { uid: `${connectorType}-${address}` } };
  mocks.wallets = [{ address, connectorType }];
}

function getStatuses() {
  return mocks.pushEvent.mock.calls.map(([event]) => event.data.capabilitiesStatus);
}

beforeEach(() => {
  mocks.chainId = 42161;
  mocks.srcChainId = undefined;
  mocks.getAccountType.mockResolvedValue(AccountType.EOA);
  mocks.fetchWalletChainCapabilities.mockResolvedValue({
    status: "ok",
    capabilities: { atomicStatus: "supported", hasAlternateGasFees: true, hasPaymasterService: undefined },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("useWalletCapabilitiesMetric", () => {
  it("reports capabilities and the 7702 delegate once per connector, account and chain", async () => {
    connect("0x0000000000000000000000000000000000000001", "injected");
    mocks.getAccountType.mockResolvedValue(AccountType.PostEip7702EOA);
    mocks.getDelegation.mockResolvedValue(METAMASK_DELEGATOR);

    const first = render(<TestComponent />);
    await waitFor(() => expect(mocks.pushEvent).toHaveBeenCalledTimes(1));
    expect(mocks.pushEvent).toHaveBeenCalledWith({
      event: "wallet.capabilities",
      isError: false,
      data: {
        chainId: 42161,
        walletName: "MetaMask",
        accountType: "postEip7702Eoa",
        delegateAddress: METAMASK_DELEGATOR,
        capabilitiesStatus: "ok",
        atomicStatus: "supported",
        hasAlternateGasFees: true,
        hasPaymasterService: undefined,
      },
    });

    first.unmount();
    mocks.srcChainId = 8453;
    render(<TestComponent />);
    await waitFor(() => expect(mocks.pushEvent).toHaveBeenCalledTimes(2));
    expect(mocks.pushEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ chainId: 8453 }) })
    );

    mocks.srcChainId = undefined;
    render(<TestComponent />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mocks.pushEvent).toHaveBeenCalledTimes(2);
  });

  it("asks only wallets that answer locally", async () => {
    connect("0x0000000000000000000000000000000000000002", "embedded");
    render(<TestComponent />);
    await waitFor(() => expect(mocks.pushEvent).toHaveBeenCalledTimes(1));

    connect("0x0000000000000000000000000000000000000003", "wallet_connect_v2");
    render(<TestComponent />);
    await waitFor(() => expect(mocks.pushEvent).toHaveBeenCalledTimes(2));

    expect(mocks.fetchWalletChainCapabilities).not.toHaveBeenCalled();
    expect(getStatuses()).toEqual(["unsupported", "skipped"]);
  });

  it("waits until the wallet is known to Privy", async () => {
    connect("0x0000000000000000000000000000000000000004", "injected");
    mocks.wallets = [];

    render(<TestComponent />);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mocks.pushEvent).not.toHaveBeenCalled();
  });

  it("keeps the account type when the delegate lookup fails", async () => {
    connect("0x0000000000000000000000000000000000000005", "injected");
    mocks.getAccountType.mockResolvedValue(AccountType.PostEip7702EOA);
    mocks.getDelegation.mockRejectedValue(new Error("rpc"));

    render(<TestComponent />);

    await waitFor(() => expect(mocks.pushEvent).toHaveBeenCalledTimes(1));
    expect(mocks.pushEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accountType: "postEip7702Eoa", delegateAddress: undefined }),
      })
    );
  });
});
