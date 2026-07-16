import { describe, expect, it } from "vitest";

import { sortByBigint } from "./useWhaleSort";

describe("sortByBigint", () => {
  const rows = [{ v: 1n }, { v: 9n }, { v: 4n }];

  it("sorts descending", () => {
    expect(sortByBigint(rows, "desc", (r) => r.v).map((r) => r.v)).toEqual([9n, 4n, 1n]);
  });

  it("sorts ascending", () => {
    expect(sortByBigint(rows, "asc", (r) => r.v).map((r) => r.v)).toEqual([1n, 4n, 9n]);
  });

  it("leaves input order untouched for unspecified, without mutating the input", () => {
    expect(sortByBigint(rows, "unspecified", (r) => r.v).map((r) => r.v)).toEqual([1n, 9n, 4n]);
    expect(rows.map((r) => r.v)).toEqual([1n, 9n, 4n]);
  });
});
