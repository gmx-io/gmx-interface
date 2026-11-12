import { act, cleanup, render, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { SWRConfig, useSWRConfig } from "swr";
import { afterEach, expect, it, vi } from "vitest";

import { SWRConfigProp } from "App/swrConfig";
import { setAbFlagEnabled } from "config/ab";
import { ARBITRUM, SOLANA_NETWORK_ID } from "config/chains";
import type { SolanaBalances } from "lib/solana/balances";

import { getSolanaBalancesKey, useSolanaBalances } from "./useSolanaBalances";

const source = vi.hoisted(() => ({ read: vi.fn(), networkId: -501 }));
vi.mock("lib/chains", () => ({ useChainId: () => ({ networkId: source.networkId }) }));
vi.mock("lib/solana/balances", () => ({ fetchSolanaBalances: source.read }));
let latest: ReturnType<typeof useSolanaBalances>;
let invalidate: ReturnType<typeof useSWRConfig>["mutate"];
function Consumer({ owner }: { owner: string | undefined }) {
  latest = { ...useSolanaBalances(owner) };
  invalidate = useSWRConfig().mutate;
  return null;
}
function mount(owner: string | undefined) {
  const config = { ...SWRConfigProp, provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false };
  return render(<Consumer owner={owner} />, {
    wrapper: ({ children }: { children?: ReactNode }) => <SWRConfig value={config}>{children}</SWRConfig>,
  });
}
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  source.read.mockReset();
  source.networkId = SOLANA_NETWORK_ID;
  setAbFlagEnabled("solanaNetwork", false);
});

it.each([
  [ARBITRUM, true, "wallet-a"],
  [SOLANA_NETWORK_ID, false, "wallet-a"],
  [SOLANA_NETWORK_ID, true, undefined],
] as const)("does not read for inactive network/flag/owner: %s %s %s", async (networkId, enabled, owner) => {
  source.networkId = networkId;
  setAbFlagEnabled("solanaNetwork", enabled);
  mount(owner);
  await act(async () => {
    await Promise.resolve();
  });
  expect(source.read).not.toHaveBeenCalled();
  expect(latest.data).toBeUndefined();
});

it("isolates pending responses across owners and network changes", async () => {
  setAbFlagEnabled("solanaNetwork", true);
  let resolveOld!: (value: SolanaBalances) => void;
  source.read.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveOld = resolve;
      })
  );
  const view = mount("wallet-a");
  await waitFor(() => expect(source.read).toHaveBeenCalledTimes(1));
  expect(latest.isLoading).toBe(true);
  source.read.mockResolvedValue({ SOL: 0n });
  view.rerender(<Consumer owner="wallet-b" />);
  await waitFor(() => expect(latest.data).toEqual({ SOL: 0n }));
  await act(async () => {
    resolveOld({ SOL: 99n });
  });
  expect(latest.data).toEqual({ SOL: 0n });
  source.read.mockResolvedValue({ SOL: 2n });
  await act(async () => {
    await invalidate(getSolanaBalancesKey(SOLANA_NETWORK_ID, "wallet-b"));
  });
  expect(latest.data).toEqual({ SOL: 2n });
  source.networkId = ARBITRUM;
  view.rerender(<Consumer owner="wallet-b" />);
  expect(latest.data).toBeUndefined();
  expect(latest.error).toBeUndefined();
});

it("surfaces reader errors without turning them into zero", async () => {
  setAbFlagEnabled("solanaNetwork", true);
  source.read.mockRejectedValue(new Error("RPC unavailable"));
  mount("wallet-a");
  await waitFor(() => expect(latest.error?.message).toBe("RPC unavailable"));
  expect(latest.data).toBeUndefined();
  expect(latest.isLoading).toBe(false);
});

it("inherits five-second polling, pauses while hidden and stops after unmount", async () => {
  setAbFlagEnabled("solanaNetwork", true);
  source.read.mockResolvedValue({ SOL: 0n });
  vi.useFakeTimers();
  const view = mount("wallet-a");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  expect(latest.data).toEqual({ SOL: 0n });
  const initial = source.read.mock.calls.length;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  expect(source.read.mock.calls.length).toBe(initial + 1);
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  expect(source.read.mock.calls.length).toBe(initial + 1);
  view.unmount();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  expect(source.read.mock.calls.length).toBe(initial + 1);
});
