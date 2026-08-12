import { describe, expect, it } from "vitest";

import { getBigIntContractErrorArg, getContractErrorArg, getStringContractErrorArg } from "lib/errors";

describe("contract error args", () => {
  it("reads array and object args by index or key", () => {
    expect(getContractErrorArg([123n, "0xabc"], 1)).toBe("0xabc");
    expect(getContractErrorArg({ amount: 123n, token: "0xabc" }, 0, "amount")).toBe(123n);
    expect(getContractErrorArg({ amount: 123n, token: "0xabc" }, 1)).toBe("0xabc");

    expect(getBigIntContractErrorArg({ amount: 123n }, 0, "amount")).toBe(123n);
    expect(getBigIntContractErrorArg({ amount: "123" }, 0, "amount")).toBeUndefined();
    expect(getStringContractErrorArg({ token: "0xabc" }, 0, "token")).toBe("0xabc");
    expect(getStringContractErrorArg({ token: 123n }, 0, "token")).toBeUndefined();
  });
});
