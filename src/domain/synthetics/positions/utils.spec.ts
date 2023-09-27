import { i18n } from "@lingui/core";
import { bigNumberify } from "lib/numbers";
import { en as plurals } from "make-plural/plurals";
import { getTriggerNameByPrice } from "./utils";

i18n.loadLocaleData({ en: { plurals } });
i18n.load({ en: {} });
i18n.activate("en");

describe("positions/utils", () => {
  it("getTriggerNameByPrice", () => {
    expect(
      getTriggerNameByPrice({
        markPrice: bigNumberify(100),
        triggerPrice: bigNumberify(200),
        isLong: true,
      })
    ).toBe("Take-Profit");
    expect(
      getTriggerNameByPrice({
        markPrice: bigNumberify(100),
        triggerPrice: bigNumberify(200),
        isLong: false,
      })
    ).toBe("Stop-Loss");
    expect(
      getTriggerNameByPrice({
        markPrice: bigNumberify(200),
        triggerPrice: bigNumberify(100),
        isLong: false,
      })
    ).toBe("Take-Profit");
    expect(
      getTriggerNameByPrice({
        markPrice: bigNumberify(200),
        triggerPrice: bigNumberify(100),
        isLong: true,
      })
    ).toBe("Stop-Loss");
    expect(
      getTriggerNameByPrice({
        markPrice: undefined,
        triggerPrice: bigNumberify(100),
        isLong: true,
      })
    ).toBe("Trigger");
    expect(
      getTriggerNameByPrice({
        markPrice: bigNumberify(100),
        triggerPrice: undefined,
        isLong: true,
      })
    ).toBe("Trigger");
    expect(
      getTriggerNameByPrice({
        markPrice: undefined,
        triggerPrice: undefined,
        isLong: true,
      })
    ).toBe("Trigger");
  });
});
