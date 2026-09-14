import { describe, expect, it } from "vitest";

import { filterLeaderboardByAccount } from "./utils";

const account = "0x52908400098527886E0F7030069857D2E4169EE7";
const entry = { account, rank: 47 };
const otherEntry = { account: "0xde709f2102306220921060314715629080e2fb77", rank: 1 };
const entries = [otherEntry, entry];

describe("filterLeaderboardByAccount", () => {
  it.each(["0x52908400098527886e0f7030069857d2e4169ee7", " e0F703 ", "D2e4169Ee7"])(
    "finds an account by full or partial address without changing its casing (%s)",
    (term) => {
      const result = filterLeaderboardByAccount(entries, term);

      expect(result).toEqual([entry]);
      expect(result[0]).toBe(entry);
      expect(result[0].account).toBe(account);
    }
  );

  it.each([".", "[", "0x.*", "E0F|de709"])("treats search characters literally (%s)", (term) => {
    expect(filterLeaderboardByAccount(entries, term)).toEqual([]);
  });

  it("preserves the ranked order when the search is cleared", () => {
    expect(filterLeaderboardByAccount(entries, "  ")).toEqual(entries);
  });
});
