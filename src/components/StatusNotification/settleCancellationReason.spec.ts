import { describe, expect, it } from "vitest";

import { tryDecodeCustomError } from "sdk/utils/errors";

import { getErrorTooltipTitle } from "components/TradeHistory/TradeHistoryRow/utils/shared";

// captured on an Arbitrum fork: the revert of a settle order (zero-size MarketDecrease) on a
// position below its market's min collateral — the bytes the keeper stores as OrderCancelled.reasonBytes
const REASON_BYTES =
  "0xbc121108000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000004c5b58096563d9b3bafb166f000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004ee2d6d415b85acef8100000000000000000000000000000000000000000000000000000000000000000000001b6d696e20636f6c6c61746572616c20666f72206c657665726167650000000000";

describe("settle cancellation reason from a real contract revert", () => {
  it("decodes to the min-collateral copy the toast shows", () => {
    const error = tryDecodeCustomError(REASON_BYTES);

    expect(error?.name).toBe("LiquidatablePosition");
    expect((error?.args as any).reason).toBe("min collateral for leverage");
    expect(getErrorTooltipTitle(error!.name, true, error!.args)).toBe(
      "Margin is below the minimum required for the position size"
    );
  });
});
