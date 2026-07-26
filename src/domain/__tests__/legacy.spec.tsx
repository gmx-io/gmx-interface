import { render } from "@testing-library/react";
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
});
