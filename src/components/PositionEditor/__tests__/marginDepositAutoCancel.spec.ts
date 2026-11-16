import { describe, expect, it } from "vitest";

import { getIsAutoCancelLimitReached } from "../marginDepositAutoCancel";

const autoCancelOrder = (key: string) => ({ key, autoCancel: true });
const plainOrder = (key: string) => ({ key, autoCancel: false });

describe("getIsAutoCancelLimitReached", () => {
  it("is not reached while the position has free auto-cancel slots", () => {
    expect(
      getIsAutoCancelLimitReached({
        positionOrders: [autoCancelOrder("1"), plainOrder("2")],
        replacingOrderKey: undefined,
        maxAutoCancelOrders: 5n,
      })
    ).toBe(false);
  });

  it("is reached once the auto-cancel orders match the limit", () => {
    expect(
      getIsAutoCancelLimitReached({
        positionOrders: [autoCancelOrder("1"), autoCancelOrder("2")],
        replacingOrderKey: undefined,
        maxAutoCancelOrders: 2n,
      })
    ).toBe(true);
  });

  it("ignores orders without auto-cancel", () => {
    expect(
      getIsAutoCancelLimitReached({
        positionOrders: [plainOrder("1"), plainOrder("2"), plainOrder("3")],
        replacingOrderKey: undefined,
        maxAutoCancelOrders: 2n,
      })
    ).toBe(false);
  });

  it("frees the slot of the order being replaced", () => {
    const positionOrders = [autoCancelOrder("1"), autoCancelOrder("2")];

    expect(getIsAutoCancelLimitReached({ positionOrders, replacingOrderKey: "2", maxAutoCancelOrders: 2n })).toBe(
      false
    );
    expect(getIsAutoCancelLimitReached({ positionOrders, replacingOrderKey: "unknown", maxAutoCancelOrders: 2n })).toBe(
      true
    );
  });

  it("does not block while the limit is unknown", () => {
    expect(
      getIsAutoCancelLimitReached({
        positionOrders: [autoCancelOrder("1"), autoCancelOrder("2")],
        replacingOrderKey: undefined,
        maxAutoCancelOrders: undefined,
      })
    ).toBe(false);
  });
});
