import { fetchIncentivesGraphql } from "./client";
import { parseIncentiveAccountEpochAuditPage, type RawIncentiveAccountEpochAuditEntry } from "./parsers";
import { INCENTIVE_ACCOUNT_EPOCH_AUDIT_QUERY, INCENTIVE_ACCOUNT_EPOCH_AUDIT_WITH_STAKING_QUERY } from "./queries";
import type { IncentiveAccountEpochAuditEntry } from "./types";

const PAGE_SIZE = 1000;

type AuditResponse = {
  incentiveAccountEpochAudit: { totalCount: number; items: RawIncentiveAccountEpochAuditEntry[] };
};

export async function fetchIncentiveEpochAudit(endpoint: string, epochTimestamp: number) {
  const entries: IncentiveAccountEpochAuditEntry[] = [];
  const accounts = new Set<string>();
  let totalCount: number | undefined;
  let query = INCENTIVE_ACCOUNT_EPOCH_AUDIT_WITH_STAKING_QUERY;

  do {
    const variables = {
      where: { epochTimestamp },
      orderBy: "epochTimestamp_ASC",
      limit: PAGE_SIZE,
      offset: entries.length,
    };
    let response: AuditResponse;
    try {
      response = await fetchIncentivesGraphql<AuditResponse>(endpoint, query, variables);
    } catch (error) {
      if (
        entries.length > 0 ||
        query !== INCENTIVE_ACCOUNT_EPOCH_AUDIT_WITH_STAKING_QUERY ||
        !(error instanceof Error) ||
        (!error.message.includes("HTTP error: 400") && !error.message.includes('Cannot query field "avgStakedGmx"'))
      ) {
        throw error;
      }

      // Older development Squids can reject the new field with HTTP 400.
      query = INCENTIVE_ACCOUNT_EPOCH_AUDIT_QUERY;
      response = await fetchIncentivesGraphql<AuditResponse>(endpoint, query, variables);
    }
    const page = parseIncentiveAccountEpochAuditPage(response.incentiveAccountEpochAudit, PAGE_SIZE, entries.length);

    if (
      !Number.isSafeInteger(page.totalCount) ||
      page.totalCount < 0 ||
      (totalCount !== undefined && page.totalCount !== totalCount) ||
      entries.length + page.entries.length > page.totalCount ||
      (page.hasNextPage && page.entries.length === 0)
    ) {
      throw new Error("The epoch changed or returned incomplete audit data. Reload the epoch and try again.");
    }

    totalCount = page.totalCount;
    for (const entry of page.entries) {
      if (entry.epochTimestamp !== epochTimestamp || accounts.has(entry.account)) {
        throw new Error("The epoch returned mismatched or duplicate audit data. Reload the epoch and try again.");
      }

      accounts.add(entry.account);
      entries.push(entry);
    }
  } while (entries.length < totalCount);

  return {
    entries,
    totalFees: entries.reduce((total, entry) => total + entry.fees, 0n),
  };
}
