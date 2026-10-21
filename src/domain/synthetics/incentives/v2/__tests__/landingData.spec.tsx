import { cleanup, render, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchIncentivesGraphql } from "../client";
import { useReturnBonusHistory } from "../useReturnBonus";

vi.mock("../client", () => ({ fetchIncentivesGraphql: vi.fn() }));

const fetcher = vi.mocked(fetchIncentivesGraphql);
const endpoint = "https://example.com/graphql";
const account = "0x1640e916e10610Ba39aAC5Cd8a08acF3cCae1A4c";
const programStartTimestamp = 1781654400;
const swrConfig = { provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false };

function mountHook<T>(hook: () => T) {
  let result: T;
  function Probe() {
    result = hook();
    return null;
  }
  render(
    <SWRConfig value={swrConfig}>
      <Probe />
    </SWRConfig>
  );
  return { result: () => result! };
}

beforeEach(() => fetcher.mockReset());
afterEach(cleanup);

describe("public comeback lookup", () => {
  it.each([
    [
      "volume and trades",
      account,
      [{ lifetimeVolume: "21000000000000000000000000000000000000" }],
      [{ timestamp: 1700000000 }],
      { lifetimeVolume: 21000000n * 10n ** 30n, hasHistory: true },
    ],
    [
      "trades without an allocation",
      account,
      [],
      [{ timestamp: 1700000000 }],
      { lifetimeVolume: null, hasHistory: true },
    ],
    ["a fresh wallet", account, [], [], { lifetimeVolume: null, hasHistory: false }],
    [
      "a non-checksummed address",
      "0x1640e916e10610ba39aac5cd8a08acf3ccae1a4c",
      [],
      [],
      { lifetimeVolume: null, hasHistory: false },
    ],
  ])("looks up history for %s", async (_, input, incentiveManualAllocations, tradeActions, expected) => {
    fetcher.mockResolvedValue({ incentiveManualAllocations, tradeActions });
    const hook = mountHook(() => useReturnBonusHistory(endpoint, input, programStartTimestamp));
    await waitFor(() => expect(hook.result().data).toEqual(expected));
    expect(fetcher.mock.calls[0][2]).toEqual({ account, programStartTimestamp });
  });
});
