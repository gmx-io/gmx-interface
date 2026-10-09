import { cleanup, render, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getHasNoTradesRefreshInterval } from "lib/metrics/useConfigureMetrics";
import { CONFIG_UPDATE_INTERVAL } from "lib/timeConstants";

import useIsFirstOrder from "./useIsFirstOrder";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("lib/indexers/clients", () => ({ getSubsquidGraphClient: () => ({ query: mocks.query }) }));

const SWR_TEST_CONFIG = { provider: () => new Map(), dedupingInterval: 0 };

let latest: boolean | undefined;

function TestComponent({ account }: { account: string }) {
  latest = useIsFirstOrder(42161, { account }).isFirstOrder;
  return null;
}

function renderHook(account: string) {
  return render(
    <SWRConfig value={SWR_TEST_CONFIG}>
      <TestComponent account={account} />
    </SWRConfig>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  latest = undefined;
});

describe("useIsFirstOrder", () => {
  it("stays unknown until the indexer answers", async () => {
    let resolveQuery: (value: unknown) => void = () => undefined;
    mocks.query.mockReturnValue(new Promise((resolve) => (resolveQuery = resolve)));

    renderHook("0x0000000000000000000000000000000000000001");
    expect(latest).toBeUndefined();

    resolveQuery({ data: { tradeActions: [] } });
    await waitFor(() => expect(latest).toBe(true));
  });

  it("is false once the account has a trade action", async () => {
    mocks.query.mockResolvedValue({ data: { tradeActions: [{ id: "1" }] } });

    renderHook("0x0000000000000000000000000000000000000002");

    await waitFor(() => expect(latest).toBe(false));
  });
});

describe("getHasNoTradesRefreshInterval", () => {
  it("stops polling once the account has traded", () => {
    expect(getHasNoTradesRefreshInterval(undefined)).toBe(CONFIG_UPDATE_INTERVAL);
    expect(getHasNoTradesRefreshInterval(true)).toBe(CONFIG_UPDATE_INTERVAL);
    expect(getHasNoTradesRefreshInterval(false)).toBe(0);
  });
});
