import { cleanup, render, waitFor } from "@testing-library/react";
import { SWRConfig, unstable_serialize } from "swr";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { MultichainFundingHistoryItem } from "domain/multichain/types";

import { useGmxAccountFundingHistoryItem } from "../useGmxAccountFundingHistory";

const CHAIN_ID = 42161;
const ACCOUNT = "0x426eC19dd3FE5623dAfc32d6636F34711CA99213";
const GUID = "0xguid";

const mocks = vi.hoisted(() => ({
  graphqlFetcher: vi.fn(),
  pendingMultichainFunding: [] as unknown[],
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: ACCOUNT }),
}));

vi.mock("lib/chains", () => ({
  useChainId: () => ({ chainId: CHAIN_ID }),
}));

vi.mock("context/SyntheticsEvents", () => ({
  useSyntheticsEvents: () => ({
    pendingMultichainFunding: mocks.pendingMultichainFunding,
    updatePendingMultichainFunding: vi.fn(),
  }),
}));

vi.mock("config/indexers", () => ({
  getIndexerUrl: () => "https://squid.test/graphql",
}));

vi.mock("sdk/configs/tokens", () => ({
  isValidTokenSafe: () => true,
}));

vi.mock("sdk/utils/graphqlFetcher", () => ({
  default: mocks.graphqlFetcher,
}));

function makeItem(overrides: Partial<MultichainFundingHistoryItem> = {}): MultichainFundingHistoryItem {
  return {
    id: GUID,
    operation: "deposit",
    step: "executed",
    settlementChainId: CHAIN_ID,
    sourceChainId: 0,
    account: ACCOUNT,
    token: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    sentAmount: 1000000n,
    receivedAmount: 1000000n,
    sentTxn: "0xtxn",
    sentTimestamp: 1760000000,
    receivedTxn: undefined,
    receivedTimestamp: undefined,
    isExecutionError: false,
    executedTxn: undefined,
    executedTimestamp: undefined,
    ...overrides,
  };
}

let swrCache = new Map();
const SWR_TEST_CONFIG = { provider: () => swrCache, dedupingInterval: 0, shouldRetryOnError: false };

function renderItemHook({ cachedHistory }: { cachedHistory?: MultichainFundingHistoryItem[] } = {}) {
  swrCache = new Map();

  if (cachedHistory) {
    swrCache.set(unstable_serialize([CHAIN_ID, "gmx-account-funding-history", ACCOUNT]), { data: cachedHistory });
  }

  const result = { current: undefined as unknown as ReturnType<typeof useGmxAccountFundingHistoryItem> };

  function Probe() {
    result.current = useGmxAccountFundingHistoryItem(GUID);
    return null;
  }

  render(
    <SWRConfig value={SWR_TEST_CONFIG}>
      <Probe />
    </SWRConfig>
  );

  return { result };
}

describe("useGmxAccountFundingHistoryItem", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.pendingMultichainFunding = [];
  });

  it("is loading without a transfer until the item request resolves", async () => {
    let resolveFetch!: (value: unknown) => void;
    mocks.graphqlFetcher.mockImplementation(() => new Promise((resolve) => (resolveFetch = resolve)));

    const { result } = renderItemHook();

    expect(result.current).toEqual({ transfer: undefined, isLoading: true, error: undefined });

    resolveFetch({ multichainFunding: [{ ...makeItem(), sentAmount: "1000000", receivedAmount: "1000000" }] });

    await waitFor(() => expect(result.current.transfer?.id).toBe(GUID));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.transfer?.sentAmount).toBe(1000000n);
  });

  it("renders the already loaded history item right away while the item request is pending", () => {
    mocks.graphqlFetcher.mockImplementation(() => new Promise(() => undefined));
    const historyItem = makeItem({ step: "sent", receivedAmount: undefined });

    const { result } = renderItemHook({ cachedHistory: [makeItem({ id: "0xother" }), historyItem] });

    expect(result.current).toEqual({ transfer: historyItem, isLoading: false, error: undefined });
    expect(mocks.graphqlFetcher).toHaveBeenCalledWith(expect.any(String), expect.any(String), {
      account: ACCOUNT,
      guid: GUID,
    });
  });

  it("skips the item request when the history list already has the finished transfer", async () => {
    const historyItem = makeItem({ step: "executed" });

    const { result } = renderItemHook({ cachedHistory: [historyItem] });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mocks.graphqlFetcher).not.toHaveBeenCalled();
    expect(result.current).toEqual({ transfer: historyItem, isLoading: false, error: undefined });
  });

  it("exposes the request error when there is nothing to show", async () => {
    mocks.graphqlFetcher.mockRejectedValue(new Error("squid down"));

    const { result } = renderItemHook();

    await waitFor(() => expect(result.current.error?.message).toBe("squid down"));
    expect(result.current.transfer).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it("hides the request error when the history list already has the item", async () => {
    mocks.graphqlFetcher.mockRejectedValue(new Error("squid down"));
    const historyItem = makeItem({ step: "sent", receivedAmount: undefined });

    const { result } = renderItemHook({ cachedHistory: [historyItem] });

    await waitFor(() => expect(mocks.graphqlFetcher).toHaveBeenCalled());
    expect(result.current).toEqual({ transfer: historyItem, isLoading: false, error: undefined });
  });

  it("is neither loading nor failed when the transfer is not found", async () => {
    mocks.graphqlFetcher.mockResolvedValue({ multichainFunding: [] });

    const { result } = renderItemHook();

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toEqual({ transfer: undefined, isLoading: false, error: undefined });
  });

  it("prefers the history item when the item request returns an older step", async () => {
    const historyItem = makeItem({ step: "received" });
    mocks.graphqlFetcher.mockResolvedValue({
      multichainFunding: [{ ...makeItem({ step: "sent" }), sentAmount: "1000000", receivedAmount: null }],
    });

    const { result } = renderItemHook({ cachedHistory: [historyItem] });

    await waitFor(() => expect(mocks.graphqlFetcher).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(result.current.transfer).toBe(historyItem);
  });

  it("prefers a pending item that is further along than the fetched one", async () => {
    const pendingItem = makeItem({ step: "executed", source: "ws" });
    mocks.pendingMultichainFunding = [pendingItem];
    mocks.graphqlFetcher.mockResolvedValue({
      multichainFunding: [{ ...makeItem({ step: "sent" }), sentAmount: "1000000", receivedAmount: null }],
    });

    const { result } = renderItemHook();

    await waitFor(() => expect(mocks.graphqlFetcher).toHaveBeenCalled());
    expect(result.current.transfer).toBe(pendingItem);
  });
});
