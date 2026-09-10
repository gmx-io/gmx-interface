import escapeRegExp from "lodash/escapeRegExp";

export function filterLeaderboardByAccount<T extends { account: string }>(entries: readonly T[], term: string): T[] {
  const query = new RegExp(escapeRegExp(term.trim()), "i");
  return entries.filter((entry) => query.test(entry.account));
}
