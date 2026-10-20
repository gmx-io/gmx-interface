import useSWR from "swr";
import { expect, it, vi } from "vitest";

import { getIsSolanaNetworkEnabled } from "config/ab";

import { useSolanaTradingEnabled } from "./useSolanaTradingEnabled";

vi.mock("swr", () => ({ default: vi.fn() }));
vi.mock("config/ab", () => ({ getIsSolanaNetworkEnabled: vi.fn() }));

it.each`
  scenario                   | enabled  | networkEnabled | data         | error                       | isLoading | active   | allowed
  ${"inactive consumer"}     | ${false} | ${true}        | ${true}      | ${undefined}                | ${false}  | ${false} | ${false}
  ${"disabled network"}      | ${true}  | ${false}       | ${true}      | ${undefined}                | ${false}  | ${false} | ${false}
  ${"initial load"}          | ${true}  | ${true}        | ${undefined} | ${undefined}                | ${true}   | ${true}  | ${false}
  ${"loading with old data"} | ${true}  | ${true}        | ${true}      | ${undefined}                | ${true}   | ${true}  | ${false}
  ${"keeper denial"}         | ${true}  | ${true}        | ${false}     | ${undefined}                | ${false}  | ${true}  | ${false}
  ${"failed refresh"}        | ${true}  | ${true}        | ${true}      | ${new Error("Unavailable")} | ${false}  | ${true}  | ${false}
  ${"explicit permission"}   | ${true}  | ${true}        | ${true}      | ${undefined}                | ${false}  | ${true}  | ${true}
`("keeps trading fail-closed: $scenario", ({ enabled, networkEnabled, data, error, isLoading, active, allowed }) => {
  vi.mocked(getIsSolanaNetworkEnabled).mockReturnValue(networkEnabled);
  vi.mocked(useSWR).mockReturnValue({ data, error, isLoading, isValidating: false, mutate: vi.fn() });
  const result = useSolanaTradingEnabled({ enabled });
  expect(result.isSolanaTradingEnabled).toBe(allowed);
  expect(result.isLoading).toBe(active && isLoading);
  expect(result.error).toBe(active ? error : undefined);
  expect(vi.mocked(useSWR).mock.lastCall?.[0] !== null).toBe(active);
});
