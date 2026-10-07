import { act, cleanup, render, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClaimType } from "../types";
import { RawClaimAction, useClaimCollateralHistory } from "../useClaimHistory";

const { state, query } = vi.hoisted(() => ({
  state: {
    account: "0x0000000000000000000000000000000000000001" as string | undefined,
    markets: {
      "0x0000000000000000000000000000000000000003": {
        marketTokenAddress: "0x0000000000000000000000000000000000000003",
        longTokenAddress: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      },
    },
    tokens: {},
  },
  query: vi.fn(),
}));

vi.mock("context/SettingsContext/SettingsContextProvider", () => ({
  useSettings: () => ({ showDebugValues: false }),
}));

vi.mock("context/SyntheticsStateContext/hooks/globalsHooks", () => ({
  useMarketsInfoData: () => state.markets,
  useTokensData: () => state.tokens,
}));

vi.mock("context/SyntheticsStateContext/selectors/globalSelectors", () => ({
  selectAccount: vi.fn(),
}));

vi.mock("context/SyntheticsStateContext/utils", () => ({
  useSelector: () => state.account,
}));

vi.mock("lib/indexers", () => ({
  getSubsquidGraphClient: () => ({ query }),
}));

type HookParams = Parameters<typeof useClaimCollateralHistory>[1];
type HookResult = ReturnType<typeof useClaimCollateralHistory>;
type PendingRequest = {
  query: string;
  resolve: (result: { data: { claimActions: RawClaimAction[] } }) => void;
  reject: (error: Error) => void;
};

let requests: PendingRequest[];
const DEFAULT_PARAMS: HookParams = { pageSize: 2 };

function claim(id: string): RawClaimAction {
  return {
    id,
    account: state.account!,
    eventName: ClaimType.ClaimFunding,
    marketAddresses: ["0x0000000000000000000000000000000000000003"],
    tokenAddresses: ["0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"],
    amounts: ["1"],
    tokenPrices: ["1"],
    transactionHash: id,
    timestamp: 1,
  };
}

function Harness({
  chainId,
  params,
  onResult,
}: {
  chainId: number;
  params: HookParams;
  onResult: (result: HookResult) => void;
}) {
  onResult(useClaimCollateralHistory(chainId, params));
  return null;
}

function setup(initialParams: HookParams = DEFAULT_PARAMS) {
  const results: HookResult[] = [];
  const onResult = (result: HookResult) => results.push(result);
  const config = {
    provider: () => new Map(),
    dedupingInterval: 0,
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  };
  const wrapper = ({ children }: { children?: ReactNode }) => <SWRConfig value={config}>{children}</SWRConfig>;
  const view = render(<Harness chainId={42161} params={initialParams} onResult={onResult} />, { wrapper });

  return {
    results,
    latest: () => results[results.length - 1],
    rerender: (params: HookParams = initialParams, chainId = 42161) =>
      view.rerender(<Harness chainId={chainId} params={params} onResult={onResult} />),
  };
}

async function completeRequest(index: number, actions: RawClaimAction[]) {
  await waitFor(() => expect(requests[index]).toBeDefined());
  await act(async () => requests[index].resolve({ data: { claimActions: actions } }));
}

describe("useClaimCollateralHistory filter transitions", () => {
  beforeEach(() => {
    state.account = "0x0000000000000000000000000000000000000001";
    requests = [];
    query.mockReset();
    query.mockImplementation(
      ({ query: document }) =>
        new Promise((resolve, reject) => {
          requests.push({ query: document.loc.source.body, resolve, reject });
        })
    );
  });

  afterEach(cleanup);

  it("shows the initial loader, then retains empty and populated results during timeframe changes", async () => {
    const { latest, rerender, results } = setup();
    expect(latest().isLoading).toBe(true);
    expect(latest().claimActions).toBeUndefined();

    await completeRequest(0, []);
    expect(latest().claimActions).toEqual([]);
    expect(latest().isLoading).toBe(false);
    const loadedResultIndex = results.length;

    rerender({ pageSize: 2, fromTxTimestamp: 100 });
    expect(latest().claimActions).toEqual([]);
    expect(latest().isLoading).toBe(false);
    await completeRequest(1, [claim("filtered")]);
    expect(latest().claimActions?.map((action) => action.id)).toEqual(["filtered"]);

    rerender({ pageSize: 2, fromTxTimestamp: 200 });
    expect(latest().claimActions?.map((action) => action.id)).toEqual(["filtered"]);
    await completeRequest(2, []);
    expect(latest().claimActions).toEqual([]);
    expect(results.slice(loadedResultIndex).every((result) => !result.isLoading)).toBe(true);
  });

  it("ignores an earlier timeframe response after a rapid second switch", async () => {
    const { latest, rerender } = setup();
    await completeRequest(0, [claim("initial")]);

    rerender({ pageSize: 2, fromTxTimestamp: 100 });
    await waitFor(() => expect(requests).toHaveLength(2));
    rerender({ pageSize: 2, fromTxTimestamp: 200 });
    await completeRequest(2, [claim("latest")]);
    await completeRequest(1, [claim("outdated")]);

    expect(latest().claimActions?.map((action) => action.id)).toEqual(["latest"]);
    expect(latest().isLoading).toBe(false);
  });

  it.each(["account", "chain"])("does not retain claims after switching %s", async (scope) => {
    const { latest, rerender, results } = setup();
    await completeRequest(0, [claim("previous-scope")]);
    const previousResultIndex = results.length;

    if (scope === "account") {
      state.account = "0x0000000000000000000000000000000000000002";
    }
    rerender({ pageSize: 2 }, scope === "chain" ? 43114 : 42161);
    expect(latest().claimActions).toBeUndefined();
    expect(latest().isLoading).toBe(true);
    expect(latest().hasMorePages).toBe(false);
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(results.slice(previousResultIndex).every((result) => result.claimActions === undefined)).toBe(true);

    await completeRequest(1, []);
    expect(latest().claimActions).toEqual([]);
  });

  it("clears retained results when disconnected", async () => {
    const { latest, rerender } = setup();
    await completeRequest(0, [claim("connected")]);

    state.account = undefined;
    rerender();

    expect(latest().claimActions).toBeUndefined();
    expect(latest().isLoading).toBe(false);
    expect(latest().hasMorePages).toBe(false);
    expect(requests).toHaveLength(1);
  });

  it("clears previous filter results when the new request fails", async () => {
    const { latest, rerender } = setup();
    await completeRequest(0, [claim("previous-filter")]);

    rerender({ pageSize: 2, fromTxTimestamp: 100 });
    await waitFor(() => expect(requests).toHaveLength(2));
    await act(async () => requests[1].reject(new Error("Request failed")));

    expect(latest().claimActions).toBeUndefined();
    expect(latest().isLoading).toBe(false);
    expect(latest().hasMorePages).toBe(false);
  });

  it("preserves current-filter results when revalidation fails", async () => {
    const { latest } = setup();
    await completeRequest(0, [claim("first"), claim("second")]);
    const loadedClaims = latest().claimActions;

    act(() => {
      latest().setPageIndex(1);
    });
    await waitFor(() => expect(requests).toHaveLength(2));
    await act(async () => requests[1].reject(new Error("Refresh failed")));

    expect(latest().claimActions).toEqual(loadedClaims);
    expect(latest().isLoading).toBe(false);
    expect(latest().pageIndex).toBe(1);
    expect(latest().hasMorePages).toBe(false);
  });

  it("preserves loaded pages when fetching another page fails", async () => {
    const { latest } = setup();
    await completeRequest(0, [claim("first"), claim("second")]);
    act(() => {
      latest().setPageIndex(2);
    });
    await completeRequest(1, [claim("first"), claim("second")]);
    await completeRequest(2, [claim("third"), claim("fourth")]);
    const loadedClaims = latest().claimActions;

    act(() => {
      latest().setPageIndex(3);
    });
    await completeRequest(3, [claim("first"), claim("second")]);
    await waitFor(() => expect(requests).toHaveLength(5));
    expect(requests[4].query).toContain("offset: 4");
    await act(async () => requests[4].reject(new Error("Next page failed")));

    expect(latest().claimActions).toEqual(loadedClaims);
    expect(latest().claimActions).toHaveLength(4);
    expect(latest().isLoading).toBe(false);
    expect(latest().pageIndex).toBe(3);
    expect(latest().hasMorePages).toBe(false);
  });

  it("does not prefetch from retained results and resets the requested page for new filters", async () => {
    const { latest, rerender } = setup();
    await completeRequest(0, [claim("first"), claim("second")]);
    expect(latest().hasMorePages).toBe(true);

    act(() => {
      latest().setPageIndex(2);
    });
    await completeRequest(1, [claim("first"), claim("second")]);
    await completeRequest(2, [claim("third"), claim("fourth")]);
    expect(requests[2].query).toContain("offset: 2");
    expect(latest().pageIndex).toBe(2);
    expect(latest().claimActions).toHaveLength(4);

    rerender({ pageSize: 2, fromTxTimestamp: 100 });
    expect(latest().hasMorePages).toBe(false);
    expect(latest().pageIndex).toBe(1);
    expect(latest().claimActions).toHaveLength(4);
    await completeRequest(3, [claim("new-filter")]);
    expect(requests[3].query).toContain("offset: 0");
    expect(latest().claimActions?.map((action) => action.id)).toEqual(["new-filter"]);
    expect(latest().hasMorePages).toBe(false);
  });
});
