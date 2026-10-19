import { describe, expect, it } from "vitest";

import { getReferralCodeButtonState } from "./getReferralCodeButtonState";

const HASH_CODE = "0x3542f3fa9016e9921dfc406f05601f17faecc338c73eb738ebf21a825eb96747";

function getEditState(referralCode: string, userReferralCodeString: string) {
  return getReferralCodeButtonState({
    type: "edit",
    referralCode,
    userReferralCodeString,
    isSubmitting: false,
    isValidating: false,
    referralCodeExists: true,
    onSubmit: () => undefined,
  });
}

describe("getReferralCodeButtonState", () => {
  it("treats the active hex code pasted in another letter case as the same code PRO-4493", () => {
    expect(getEditState(`0x${HASH_CODE.slice(2).toUpperCase()}`, HASH_CODE)).toMatchObject({
      text: "Same as active code",
      disabled: true,
    });
  });

  it("allows switching to a text code that only differs in letter case", () => {
    expect(getEditState("thegmxbalancer", "TheGMXBalancer")).toMatchObject({ text: "Update", disabled: false });
  });
});
