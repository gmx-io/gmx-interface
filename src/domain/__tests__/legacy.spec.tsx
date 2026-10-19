import { fireEvent, render, screen } from "@testing-library/react";
import useSWR from "swr";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, type ContractsChainId } from "config/chains";

import { useGmxPrice } from "../legacy";

vi.mock("swr", () => ({
  default: vi.fn(),
}));

vi.mock("lib/contracts", () => ({
  contractFetcher: vi.fn(() => vi.fn()),
}));

const mockUseSWR = vi.mocked(useSWR);

function GmxPriceProbe({
  chainId,
  enabled,
  fetchAllChains,
}: {
  chainId: ContractsChainId;
  enabled?: boolean;
  fetchAllChains?: boolean;
}) {
  useGmxPrice(chainId, {}, false, { enabled, fetchAllChains });

  return null;
}

function GmxPriceMutateProbe() {
  const { mutate } = useGmxPrice(ARBITRUM, {}, false, { fetchAllChains: false });

  return <button onClick={mutate}>Refresh price</button>;
}

describe("useGmxPrice", () => {
  beforeEach(() => {
    mockUseSWR.mockReset();
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useSWR>);
  });

  it("disables every price read when disabled", () => {
    render(<GmxPriceProbe chainId={ARBITRUM} enabled={false} fetchAllChains={false} />);

    expect(mockUseSWR).toHaveBeenCalledTimes(4);
    expect(mockUseSWR.mock.calls.every(([key]) => key === null)).toBe(true);
  });

  it("only reads the requested chain when cross-chain sources are disabled", () => {
    render(<GmxPriceProbe chainId={ARBITRUM} fetchAllChains={false} />);

    expect(mockUseSWR).toHaveBeenCalledTimes(4);
    expect(mockUseSWR.mock.calls.slice(0, 2).every(([key]) => Array.isArray(key))).toBe(true);
    expect(mockUseSWR.mock.calls.slice(2).every(([key]) => key === null)).toBe(true);
  });

  it("keeps the previous price while revalidating", () => {
    const mutators = Array.from({ length: 4 }, () => vi.fn());
    mockUseSWR.mockImplementation((_, __) => {
      const mutate = mutators.shift()!;

      return {
        data: undefined,
        error: undefined,
        isLoading: false,
        isValidating: false,
        mutate,
      } as unknown as ReturnType<typeof useSWR>;
    });
    render(<GmxPriceMutateProbe />);

    fireEvent.click(screen.getByRole("button", { name: "Refresh price" }));

    expect(mutators).toHaveLength(0);
    for (const call of mockUseSWR.mock.results) {
      expect(call.value.mutate).toHaveBeenCalledWith();
    }
  });
});
