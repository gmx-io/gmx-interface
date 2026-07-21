import { getIndexerUrl } from "config/indexers";
import graphqlFetcher from "sdk/utils/graphqlFetcher";

export function getIncentivesIndexerUrl(chainId: number) {
  return getIndexerUrl(chainId, "incentives");
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
