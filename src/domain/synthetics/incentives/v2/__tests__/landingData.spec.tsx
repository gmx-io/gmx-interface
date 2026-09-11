import { act, cleanup, render, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchIncentivesGraphql } from "../client";
import { useGtMintingStats } from "../useGtMintingStats";
import { useReturnBonus, useReturnBonusVolume } from "../useReturnBonus";

vi.mock("../client", () => ({ fetchIncentivesGraphql: vi.fn() }));

const fetcher = vi.mocked(fetchIncentivesGraphql);
const endpoint = "https://example.com/graphql";
const account = "0x1640e916e10610Ba39aAC5Cd8a08acF3cCae1A4c";
const otherAccount = "0x0000000000000000000000000000000000000001";
const status = {
  boostIds: ["ManualAllocation"],
  manualRewardCapUsd: "2000000000000000000000000000000000",
  manualRewardConsumedUsd: "0",
  manualRewardRemainingUsd: "2000000000000000000000000000000000",
};
const swrConfig = { provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false };

function mountHook<T>(hook: () => T) {
  let result: T;
  function Probe() {
    result = hook();
    return null;
  }
  const view = render(
    <SWRConfig value={swrConfig}>
      <Probe />
    </SWRConfig>
  );
  return {
    result: () => result!,
    rerender: () =>
      view.rerender(
        <SWRConfig value={swrConfig}>
          <Probe />
        </SWRConfig>
      ),
  };
}

beforeEach(() => fetcher.mockReset());
afterEach(cleanup);

describe("public comeback lookup", () => {
  it("does not request data without a submitted valid EVM address", () => {
    mountHook(() => useReturnBonus(endpoint, undefined));
    mountHook(() => useReturnBonus(endpoint, "wallet.eth"));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("preserves address casing and parses the remaining bonus without precision loss", async () => {
    fetcher.mockResolvedValue({ accountIncentiveStatus: status });
    const hook = mountHook(() => useReturnBonus(endpoint, account));
    await waitFor(() =>
      expect(hook.result().data?.manualRewardRemainingUsd).toBe(BigInt(status.manualRewardRemainingUsd))
    );
    expect(fetcher.mock.calls[0][2]).toEqual({ account });
  });

  it("keeps an unavailable service distinct from an ineligible account", async () => {
    fetcher.mockResolvedValueOnce({ accountIncentiveStatus: null });
    const hook = mountHook(() => useReturnBonus(endpoint, account));
    await waitFor(() => expect(hook.result().data).toBeNull());
    expect(hook.result().error).toBeUndefined();
    fetcher.mockRejectedValueOnce(new Error("Unavailable"));
    await act(async () => {
      await hook
        .result()
        .mutate()
        .catch(() => undefined);
    });
    expect(hook.result().error).toBeInstanceOf(Error);
  });

  it("does not show the previous wallet's bonus when the submitted address changes", async () => {
    fetcher.mockResolvedValueOnce({ accountIncentiveStatus: status });
    let submitted = account;
    const hook = mountHook(() => useReturnBonus(endpoint, submitted));
    await waitFor(() => expect(hook.result().data).toBeTruthy());
    fetcher.mockReturnValueOnce(new Promise(() => undefined));
    submitted = otherAccount;
    hook.rerender();
    expect(hook.result().data).toBeUndefined();
    expect(hook.result().isLoading).toBe(true);
  });

  it("looks up historical volume for the configured program and original address", async () => {
    fetcher.mockResolvedValue({
      incentiveManualAllocations: [{ lifetimeVolume: "21000000000000000000000000000000000000" }],
    });
    const hook = mountHook(() => useReturnBonusVolume(endpoint, account, 1781654400));
    await waitFor(() => expect(hook.result().data).toBe(21000000n * 10n ** 30n));
    expect(fetcher.mock.calls[0][2]).toEqual({ account, programStartTimestamp: 1781654400 });
  });
});

describe("GT minting statistics", () => {
  it("preserves seven-decimal quantities returned by the dedicated Squid", async () => {
    fetcher.mockResolvedValue({
      gtPriceSyncById: { totalMinted: "563285724764921", remainingToNextStep: "1614275235079" },
    });
    const hook = mountHook(useGtMintingStats);
    await waitFor(() =>
      expect(hook.result().data).toEqual({ totalMinted: 563285724764921n, remainingToNextStep: 1614275235079n })
    );
    expect(fetcher.mock.calls[0][0]).toBe("https://gmx-test.squids.live/gmx-gt-prices/graphql");
  });

  it("leaves unavailable statistics empty instead of reporting zero minted", async () => {
    fetcher.mockResolvedValue({ gtPriceSyncById: { totalMinted: null, remainingToNextStep: null } });
    const hook = mountHook(useGtMintingStats);
    await waitFor(() => expect(hook.result().data).toEqual({ totalMinted: undefined, remainingToNextStep: undefined }));
  });
});
