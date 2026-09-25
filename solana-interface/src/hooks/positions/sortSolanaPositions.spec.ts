import { describe, expect, it } from "vitest";

import { sortSolanaPositions } from "./sortSolanaPositions";
import type { SolanaPositionViewModel } from "./types";

function vm(key: string, overrides: Partial<SolanaPositionViewModel> = {}): SolanaPositionViewModel {
  return {
    key,
    positionAddress: key,
    ownerAddress: "o",
    marketTokenAddress: "m",
    collateralTokenAddress: "c",
    symbol: key,
    displayMarketName: `${key}/USD`,
    isLong: true,
    sizeInUsd: 0n,
    sizeInTokens: 0n,
    collateralAmount: 0n,
    collateralSymbol: "USDC",
    increasedAt: 0n,
    updatedAtSlot: 0n,
    priceUnavailable: false,
    ...overrides,
  };
}

describe("sortSolanaPositions", () => {
  const positions = [
    vm("B", { sizeInUsd: 2n, increasedAt: 1n, netValue: undefined }),
    vm("A", { sizeInUsd: 3n, increasedAt: 3n, netValue: 5n }),
    vm("C", { sizeInUsd: 1n, increasedAt: 2n, netValue: 1n }),
  ];

  it("defaults to newest first", () => {
    expect(sortSolanaPositions(positions, "unspecified", "unspecified").map((p) => p.key)).toEqual(["A", "C", "B"]);
  });

  it("sorts by size in both directions", () => {
    expect(sortSolanaPositions(positions, "size", "asc").map((p) => p.key)).toEqual(["C", "B", "A"]);
    expect(sortSolanaPositions(positions, "size", "desc").map((p) => p.key)).toEqual(["A", "B", "C"]);
  });

  it("sorts by symbol", () => {
    expect(sortSolanaPositions(positions, "symbol", "asc").map((p) => p.key)).toEqual(["A", "B", "C"]);
  });

  it("keeps unavailable values last", () => {
    expect(sortSolanaPositions(positions, "netValue", "asc").map((p) => p.key)).toEqual(["C", "A", "B"]);
    expect(sortSolanaPositions(positions, "netValue", "desc").map((p) => p.key)).toEqual(["A", "C", "B"]);
  });
});
