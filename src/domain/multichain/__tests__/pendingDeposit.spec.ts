import { describe, expect, it } from "vitest";

import { getPendingDepositAction, type PendingDepositAction } from "domain/multichain/pendingDeposit";

const clicked = "1:0x0000000000000000000000000000000000000000:1000000000000000";

describe("getPendingDepositAction", () => {
  it("sends a waiting deposit only for the amount and route it was clicked for TRD-168", () => {
    const cases: [string, Partial<Parameters<typeof getPendingDepositAction>[0]>, PendingDepositAction][] = [
      [
        "amount edited before the quote loaded",
        { currentKey: "1:0x0000000000000000000000000000000000000000:2000000000000000" },
        "drop",
      ],
      ["estimate for this amount failed or is loading", { canSend: false }, "wait"],
      ["route went unavailable", { isRouteUnavailable: true, canSend: true }, "drop"],
      ["estimate for this amount succeeded", { canSend: true }, "send"],
    ];

    for (const [name, overrides, expected] of cases) {
      const params = {
        submittedKey: clicked,
        currentKey: clicked,
        isRouteUnavailable: false,
        canSend: true,
        ...overrides,
      };
      expect(getPendingDepositAction(params), name).toBe(expected);
    }
  });
});
