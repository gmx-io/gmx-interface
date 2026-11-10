import assert from "node:assert/strict";
import { test } from "node:test";
import { displayedNumber } from "./displayedNumber";

test("financial comparisons preserve signs around currency and abbreviated values", () => {
  for (const [text, value] of [
    ["-$1,234.56", -1234.56],
    ["−\u200a$12.34", -12.34],
    ["+$\u200a1.2k", 1200],
    ["$-2.5M", -2500000],
    ["-10.5%", -10.5],
    ["$0.00", 0],
  ] as const) {
    assert.equal(displayedNumber(text), value, text);
  }
  assert.ok(Number.isNaN(displayedNumber("...")));
  assert.ok(Number.isNaN(displayedNumber("—")));
});
