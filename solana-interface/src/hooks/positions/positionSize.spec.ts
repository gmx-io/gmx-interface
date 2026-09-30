import { describe, expect, it } from "vitest";

import { canToggleSolanaPositionSize, formatSolanaPositionSize } from "./positionSize";

const position = { sizeInUsd: 1_234n * 10n ** 30n, sizeInTokens: 5n * 10n ** 9n, indexTokenDecimals: 9, symbol: "SOL" };

describe("formatSolanaPositionSize", () => {
  it("shows the USD size by default", () => {
    expect(formatSolanaPositionSize(position, false)).toBe("$ 1,234.00");
  });

  it("shows the index token amount when toggled and the decimals are known", () => {
    expect(canToggleSolanaPositionSize(position)).toBe(true);
    expect(formatSolanaPositionSize(position, true)).toBe("5.0000\u00a0SOL");
  });

  it("never shows the raw integer when the decimals are unknown", () => {
    const unknown = { ...position, indexTokenDecimals: undefined };
    expect(canToggleSolanaPositionSize(unknown)).toBe(false);
    expect(formatSolanaPositionSize(unknown, true)).toBe("$ 1,234.00");
  });
});
