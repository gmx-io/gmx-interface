import useSWR from "swr";
import { expect, it, vi } from "vitest";

import { getIsSolanaNetworkEnabled } from "config/ab";

import { useSolanaTradingEnabled } from "./useSolanaTradingEnabled";

vi.mock("swr", () => ({ default: vi.fn() }));
vi.mock("config/ab", () => ({ getIsSolanaNetworkEnabled: vi.fn() }));

const cases = [false, true].flatMap((enabled) =>
  [false, true].flatMap((networkEnabled) =>
    [
      { data: undefined, error: undefined, isLoading: true },
      { data: false, error: undefined, isLoading: false },
      { data: true, error: undefined, isLoading: false },
      { data: true, error: new Error("Keeper unavailable"), isLoading: false },
    ].map((state) => ({ enabled, networkEnabled, state }))
  )
);

it.each(cases)("requires both gates and a successful loaded permission: %j", ({ enabled, networkEnabled, state }) => {
  vi.mocked(getIsSolanaNetworkEnabled).mockReturnValue(networkEnabled);
  vi.mocked(useSWR).mockReturnValue({ ...state, isValidating: false, mutate: vi.fn() });
  const result = useSolanaTradingEnabled({ enabled });
  const active = enabled && networkEnabled;
  expect(result.isSolanaTradingEnabled).toBe(active && state.data === true && !state.error);
  expect(result.isLoading).toBe(active && state.isLoading);
  expect(result.error).toBe(active ? state.error : undefined);
  expect(vi.mocked(useSWR).mock.lastCall?.[0] !== null).toBe(active);
});
