import { act, cleanup, render } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, expect, it, vi } from "vitest";

import { SOLANA_API_URL_KEY } from "config/localStorage";
import { HttpClient } from "sdk/utils/http/http";
import type { FetchJsonOptions } from "sdk/utils/http/types";

import positions from "./api/__fixtures__/positions.json";
import { refetchGmsolAccountDataAtSlot, useGmsolPositions } from "./useGmsolAccountData";

const SWR_CONFIG = { provider: () => new Map(), dedupingInterval: 0 };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  localStorage.clear();
});

it("keeps account snapshots isolated and transaction slots pending across API host changes FESOL-113", async () => {
  vi.useFakeTimers();
  const previousHost = "https://previous-solana.example";
  const currentHost = "https://current-solana.example";
  const owner = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";
  const requests: { host: string; floor: number | undefined; respond: (amount: bigint, slot: number) => void }[] = [];
  vi.spyOn(HttpClient.prototype, "fetchJson").mockImplementation(function <TResult>(
    this: HttpClient,
    path: string,
    options?: FetchJsonOptions<TResult>
  ): Promise<TResult> {
    if (path === "/v1/orders") return Promise.resolve([] as TResult);
    return new Promise((resolve) => {
      requests.push({
        host: this.url,
        floor: options?.query?.minContextSlot,
        respond: (amount, slot) => {
          options?.onResponse?.({ headers: { get: () => String(slot) } });
          resolve([{ ...positions[0], positionValueInUsd: String(amount) }] as TResult);
        },
      });
    });
  });
  let state: ReturnType<typeof useGmsolPositions>;
  function Harness() {
    state = useGmsolPositions(owner);
    return null;
  }
  const element = (
    <SWRConfig value={SWR_CONFIG}>
      <Harness />
    </SWRConfig>
  );
  localStorage.setItem(SOLANA_API_URL_KEY, previousHost);
  const view = render(element);
  await act(async () => requests[0].respond(100n, 100));
  let transaction!: Promise<void>;
  act(() => {
    transaction = refetchGmsolAccountDataAtSlot(owner, 200);
  });
  localStorage.setItem(SOLANA_API_URL_KEY, currentHost);
  view.rerender(
    <SWRConfig value={SWR_CONFIG}>
      <Harness />
    </SWRConfig>
  );
  await act(async () => requests[2].respond(222n, 150));
  await act(async () => {
    requests[1].respond(111n, 200);
    await transaction;
  });
  expect(state!.data?.[0].positionValueInUsd).toBe(222n);
  await act(async () => vi.advanceTimersByTimeAsync(15_000));
  expect(requests[3]).toMatchObject({ host: currentHost, floor: 200 });
  await act(async () => requests[3].respond(333n, 199));
  expect(state!.data?.[0].positionValueInUsd).toBe(333n);
  expect(state!.error).toBeUndefined();
  expect(state!.isLoading).toBe(false);
});
