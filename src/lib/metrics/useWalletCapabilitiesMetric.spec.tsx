import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getPrivyWagmiConnectorId } from "lib/wallets/privyWagmi";
import { AccountType } from "lib/wallets/useAccountType";

import { useWalletCapabilitiesMetric } from "./useWalletCapabilitiesMetric";

const METAMASK_DELEGATOR = "0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B";

const mocks = vi.hoisted(() => ({
  account: { address: "", connector: { id: "", uid: "", name: "MetaMask" } },
  wallets: [] as {
    address: string;
    connectorType: string;
    walletClientType: string;
    meta: { id: string; name: string };
  }[],
  chainId: 42161,
  srcChainId: undefined as number | undefined,
  pushEvent: vi.fn(),
  getAccountType: vi.fn(),
  getDelegation: vi.fn(),
  getConnectedWalletName: vi.fn(),
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
vi.mock("lib/wallets/useWalletSessionChains", () => ({ getConnectedWalletName: mocks.getConnectedWalletName }));

function TestComponent() {
  useWalletCapabilitiesMetric();
  return null;
}

function getWallet(address: string, connectorType: string) {
  const isEmbedded = connectorType === "embedded";

  return {
    address,
    connectorType,
    walletClientType: isEmbedded ? "privy" : connectorType,
    meta: {
      id: isEmbedded ? "io.privy.wallet" : `wallet.${connectorType}`,
      name: isEmbedded ? "Privy" : connectorType,
    },
  };
}

function connect(address: string, connectorType: string) {
  const wallet = getWallet(address, connectorType);
  const connectorId = getPrivyWagmiConnectorId(wallet);

  mocks.account = { address, connector: { id: connectorId, uid: `${connectorId}-uid`, name: "MetaMask" } };
  mocks.wallets = [wallet];
}

function getStatuses() {
  return mocks.pushEvent.mock.calls.map(([event]) => event.data.capabilitiesStatus);
}

beforeEach(() => {
  mocks.chainId = 42161;
  mocks.srcChainId = undefined;
  mocks.getAccountType.mockResolvedValue(AccountType.EOA);
  mocks.getConnectedWalletName.mockResolvedValue("MetaMask");
  mocks.fetchWalletChainCapabilities.mockResolvedValue({
    status: "ok",
    durationMs: 8000,
    timeoutMs: 30_000,
    capabilities: { atomicStatus: "supported", hasAlternateGasFees: true, hasPaymasterService: undefined },
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
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
        connectorId: "wallet.injected",
        connectorType: "injected",
        accountType: "postEip7702Eoa",
        delegateAddress: METAMASK_DELEGATOR,
        capabilitiesStatus: "ok",
        capabilitiesDurationMs: 8000,
        capabilitiesTimeoutMs: 30_000,
        capabilitiesErrorCode: undefined,
        capabilitiesErrorName: undefined,
        capabilitiesErrorMessage: undefined,
        capabilitiesErrorReason: undefined,
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

  it("reports a stable embedded wallet ID without disclosing the account address", async () => {
    const addresses = ["0x0000000000000000000000000000000000000010", "0x0000000000000000000000000000000000000011"];

    for (const [index, address] of addresses.entries()) {
      connect(address, "embedded");
      expect(mocks.account.connector.id).toContain(address);
      const component = render(<TestComponent />);
      await waitFor(() => expect(mocks.pushEvent).toHaveBeenCalledTimes(index + 1));
      component.unmount();
    }

    for (const [event] of mocks.pushEvent.mock.calls) {
      expect(event.data).toMatchObject({ connectorId: "io.privy.wallet", connectorType: "embedded" });
      for (const address of addresses) {
        expect(JSON.stringify(event)).not.toContain(address);
      }
    }
    expect(mocks.fetchWalletChainCapabilities).not.toHaveBeenCalled();
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

  it("keeps the known account type when the delegate lookup times out", async () => {
    vi.useFakeTimers();
    connect("0x0000000000000000000000000000000000000012", "injected");
    mocks.getAccountType.mockResolvedValue(AccountType.PostEip7702EOA);
    mocks.getDelegation.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(METAMASK_DELEGATOR), 6000))
    );

    render(<TestComponent />);
    await vi.advanceTimersByTimeAsync(5000);

    expect(mocks.pushEvent).toHaveBeenCalledTimes(1);
    expect(mocks.pushEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accountType: "postEip7702Eoa", delegateAddress: undefined }),
      })
    );

    await vi.advanceTimersByTimeAsync(1000);
    expect(mocks.pushEvent).toHaveBeenCalledTimes(1);
  });

  it("asks Base Account, which answers from its own storage", async () => {
    connect("0x0000000000000000000000000000000000000006", "base_account");

    render(<TestComponent />);

    await waitFor(() => expect(mocks.pushEvent).toHaveBeenCalledTimes(1));
    expect(mocks.fetchWalletChainCapabilities).toHaveBeenCalledTimes(1);
    expect(getStatuses()).toEqual(["ok"]);
  });

  it("uses the wallet behind the active connector when an address is connected twice", async () => {
    const address = "0x0000000000000000000000000000000000000007";
    connect(address, "wallet_connect_v2");
    mocks.wallets = [getWallet(address, "injected"), getWallet(address, "wallet_connect_v2")];

    render(<TestComponent />);

    await waitFor(() => expect(mocks.pushEvent).toHaveBeenCalledTimes(1));
    expect(mocks.fetchWalletChainCapabilities).not.toHaveBeenCalled();
    expect(getStatuses()).toEqual(["skipped"]);
  });

  it("reports the provider diagnostics with the active connector", async () => {
    connect("0x0000000000000000000000000000000000000008", "injected");
    mocks.fetchWalletChainCapabilities.mockResolvedValue({
      status: "error",
      capabilities: undefined,
      durationMs: 100,
      timeoutMs: 30_000,
      errorCode: -32002,
      errorName: "ResourceUnavailableRpcError",
      errorMessage: "Request already pending",
      errorReason: "requestPending",
    });

    render(<TestComponent />);

    await waitFor(() => expect(mocks.pushEvent).toHaveBeenCalledTimes(1));
    expect(mocks.pushEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          connectorId: "wallet.injected",
          connectorType: "injected",
          capabilitiesStatus: "error",
          capabilitiesDurationMs: 100,
          capabilitiesErrorCode: -32002,
          capabilitiesErrorName: "ResourceUnavailableRpcError",
          capabilitiesErrorMessage: "Request already pending",
          capabilitiesErrorReason: "requestPending",
        }),
      })
    );
  });

  it("still reports capabilities if account metadata or wallet name lookups stall", async () => {
    vi.useFakeTimers();
    connect("0x0000000000000000000000000000000000000009", "injected");
    mocks.getAccountType.mockReturnValue(new Promise(() => undefined));
    mocks.getConnectedWalletName.mockReturnValue(new Promise(() => undefined));

    render(<TestComponent />);
    await vi.advanceTimersByTimeAsync(5000);

    expect(mocks.pushEvent).toHaveBeenCalledTimes(1);
    expect(mocks.pushEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          walletName: "MetaMask",
          accountType: undefined,
          capabilitiesStatus: "ok",
          atomicStatus: "supported",
        }),
      })
    );
  });
});
