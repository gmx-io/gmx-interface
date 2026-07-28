import { getIndexerUrl } from "config/indexers";
import type { IncentivesTestSquid } from "config/indexers";
import graphqlFetcher from "sdk/utils/graphqlFetcher";

export function getIncentivesIndexerUrl(chainId: number, incentivesTestSquid?: IncentivesTestSquid) {
  return getIndexerUrl(chainId, "incentives", { incentivesTestSquid });
}

export async function fetchIncentivesGraphql<T>(
  endpoint: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const data = await graphqlFetcher<T>(endpoint, query, variables, { strict: true });

  if (data === undefined) {
    throw new Error("GraphQL response is missing data");
  }

  return data;
}
