import { act, cleanup, render, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { SWRConfig } from "swr";
import { afterEach, expect, it, vi } from "vitest";

import { setAbFlagEnabled } from "config/ab";
import { ARBITRUM, SOLANA_NETWORK_ID } from "config/chains";
import { getRpcProviders } from "config/rpc";
import { getIsSolanaNetworkSelected, setIsSolanaNetworkSelected } from "config/solanaNetwork";

import { getAccountType } from "./useAccountType";
import { isAccountMissingOnChain, useIsContractAccount, useWalletUnavailableChains } from "./useWalletSessionChains";
import { getPublicClientWithRpc } from "./walletConfig";

const wallet = vi.hoisted(() => ({
  address: "0x865386FCB1bbD2A75364c40AdabD4B1062FfFFd1",
  connector: {
    uid: "solana-transition",
    getProvider: async () => ({
      session: { namespaces: { eip155: { accounts: [`eip155:42161:${wallet.address}`] } } },
    }),
  },
}));

vi.mock("@wagmi/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@wagmi/core")>()),
  getAccount: () => wallet,
}));
vi.mock("wagmi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("wagmi")>()),
  useAccount: () => wallet,
}));
vi.mock("lib/chains", () => ({
  useChainId: () => ({ chainId: ARBITRUM, networkId: getIsSolanaNetworkSelected() ? SOLANA_NETWORK_ID : ARBITRUM }),
}));
vi.mock("lib/rpc", () => ({ getWsUrl: () => undefined }));
vi.mock("lib/metrics", () => ({ metrics: { pushEvent: () => undefined } }));

afterEach(() => {
  cleanup();
  setIsSolanaNetworkSelected(false);
  setAbFlagEnabled("solanaNetwork", false);
  vi.unstubAllGlobals();
});

it("keeps passive probes paused and retries interrupted eligibility when returning from Solana", async () => {
  setAbFlagEnabled("solanaNetwork", true);
  setIsSolanaNetworkSelected(true);
  const arbitrumUrls = new Set(getRpcProviders(ARBITRUM, "default").map((provider) => provider.url));
  let releaseRequests: (() => void) | undefined;
  let pendingRequests: Promise<void> | undefined;
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    await pendingRequests;
    const url = input instanceof Request ? input.url : String(input);
    const requests = JSON.parse(String(init?.body ?? (input instanceof Request ? await input.text() : "")));
    const response = (request: { id: number }) => ({
      jsonrpc: "2.0",
      id: request.id,
      result: arbitrumUrls.has(url) ? "0x1234" : "0x",
    });
    return new Response(JSON.stringify(Array.isArray(requests) ? requests.map(response) : response(requests)), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);

  let availability: ReturnType<typeof useWalletUnavailableChains>;
  let account: ReturnType<typeof useIsContractAccount>;
  function Probe() {
    availability = useWalletUnavailableChains([8453]);
    account = useIsContractAccount();
    return null;
  }
  const cache = new Map();
  const interruptedSnapshots: unknown[] = [];
  const onError = vi.fn((_error: Error, key: string) => {
    interruptedSnapshots.push(cache.get(key)?.data);
  });
  const view = () =>
    createElement(
      SWRConfig,
      { value: { provider: () => cache, dedupingInterval: 0, errorRetryInterval: 10, onError } },
      createElement(Probe)
    );
  let mounted!: ReturnType<typeof render>;
  await act(async () => {
    mounted = render(view());
  });
  expect(availability!.unavailableChains).toBeUndefined();
  expect(availability!.isLoading).toBe(false);
  expect(account!.isContractAccount).toBe(false);
  expect(fetchMock).not.toHaveBeenCalled();

  const interruptedCachedProbe = getAccountType(wallet.address, getPublicClientWithRpc(ARBITRUM));
  await Promise.all([
    expect(interruptedCachedProbe).rejects.toThrow(),
    expect(isAccountMissingOnChain(wallet.address, 8453)).resolves.toBe(true),
  ]);

  wallet.address = "0x865386FCB1bbD2A75364c40AdabD4B1062FfFFd2";
  pendingRequests = new Promise((resolve) => (releaseRequests = resolve));
  fetchMock.mockClear();
  setIsSolanaNetworkSelected(false);
  mounted.rerender(view());
  await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(0));
  await act(async () => {
    setIsSolanaNetworkSelected(true);
    document.dispatchEvent(new CustomEvent("networkChange", { detail: { chainId: SOLANA_NETWORK_ID } }));
    setIsSolanaNetworkSelected(false);
    document.dispatchEvent(new CustomEvent("networkChange", { detail: { chainId: ARBITRUM } }));
    releaseRequests!();
  });
  await waitFor(() => expect(onError.mock.calls.length).toBe(2));
  expect(onError.mock.calls.every(([error]) => error.name === "AbortError")).toBe(true);
  expect(interruptedSnapshots).toEqual([undefined, undefined]);
  await waitFor(() => {
    expect(availability!.unavailableChains).toEqual([8453]);
    expect(availability!.isLoading).toBe(false);
    expect(account!.isContractAccount).toBe(true);
  });
});
