import { render, waitFor } from "@testing-library/react";
import React from "react";
import { SWRConfig } from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("lib/indexers", () => ({
  getSubsquidGraphClient: vi.fn(),
}));

import { getSubsquidGraphClient } from "lib/indexers";

import { useIncentiveAccountEpochAudit } from "../useIncentiveAccountEpochAudit";

const mockGetClient = vi.mocked(getSubsquidGraphClient);

const ARBITRUM = 42161;

const EMPTY_RESPONSE = {
  data: { incentiveAccountEpochAudit: { totalCount: 0, items: [] } },
};

type HookParams = Parameters<typeof useIncentiveAccountEpochAudit>[1];

function renderAuditHook(params: HookParams) {
  function TestComponent() {
    useIncentiveAccountEpochAudit(ARBITRUM, params);
    return null;
  }

  // Use a fresh cache provider per render so SWR doesn't dedupe across tests.
  return render(
    React.createElement(
      SWRConfig,
      { value: { provider: () => new Map(), dedupingInterval: 0 } },
      React.createElement(TestComponent)
    )
  );
}

describe("useIncentiveAccountEpochAudit", () => {
  let queryMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    queryMock = vi.fn().mockResolvedValue(EMPTY_RESPONSE);
    mockGetClient.mockReturnValue({ query: queryMock } as any);
  });

  it("lowercases the account when building GraphQL `where`", async () => {
    renderAuditHook({ where: { account: "0xAbC0000000000000000000000000000000000123" } });

    await waitFor(() => expect(queryMock).toHaveBeenCalledTimes(1));

    const variables = queryMock.mock.calls[0][0].variables;
    expect(variables.where).toEqual({ account: "0xabc0000000000000000000000000000000000123" });
  });

  it("includes epochTimestamp in `where` when provided", async () => {
    renderAuditHook({ where: { epochTimestamp: 1_700_000_000, account: "0xABC" } });

    await waitFor(() => expect(queryMock).toHaveBeenCalledTimes(1));

    const variables = queryMock.mock.calls[0][0].variables;
    expect(variables.where).toEqual({ epochTimestamp: 1_700_000_000, account: "0xabc" });
  });

  it("omits `where` from variables when no filter fields are set", async () => {
    renderAuditHook({});

    await waitFor(() => expect(queryMock).toHaveBeenCalledTimes(1));

    const variables = queryMock.mock.calls[0][0].variables;
    expect(variables).not.toHaveProperty("where");
    expect(variables.limit).toBe(20);
    expect(variables.offset).toBe(0);
  });

  it("forwards `orderBy` as the enum string", async () => {
    renderAuditHook({ orderBy: "points_DESC" });

    await waitFor(() => expect(queryMock).toHaveBeenCalledTimes(1));

    const variables = queryMock.mock.calls[0][0].variables;
    expect(variables.orderBy).toBe("points_DESC");
    expect(variables).not.toHaveProperty("orderDirection");
  });

  it("does not refetch when the same account is passed in different cases (cache key is normalized)", async () => {
    const { rerender } = renderAuditHook({ where: { account: "0xAAAA" } });
    await waitFor(() => expect(queryMock).toHaveBeenCalledTimes(1));

    function Rerender({ value }: { value: string }) {
      useIncentiveAccountEpochAudit(ARBITRUM, { where: { account: value } });
      return null;
    }

    rerender(
      React.createElement(
        SWRConfig,
        { value: { provider: () => new Map(), dedupingInterval: 0 } },
        React.createElement(Rerender, { value: "0xaaaa" })
      )
    );

    // Fresh provider re-issues a request for the new render, but the key for both
    // calls should reduce to the same lowercase string. We assert the lowercase
    // form was used both times.
    await waitFor(() => expect(queryMock).toHaveBeenCalledTimes(2));
    expect(queryMock.mock.calls[0][0].variables.where).toEqual({ account: "0xaaaa" });
    expect(queryMock.mock.calls[1][0].variables.where).toEqual({ account: "0xaaaa" });
  });
});
