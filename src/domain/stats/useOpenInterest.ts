import { SUPPORTED_CHAIN_IDS } from "config/chains";
import { getSubgraphUrl } from "config/subgraph";
import { BigNumber } from "ethers";
import graphqlFetcher from "lib/graphqlFetcher";
import useSWR from "swr";

const OPEN_INTEREST_QUERY = `
  query OpenInterest {
    tradingStats(orderBy: timestamp, orderDirection: desc, where: { period: total }) {
      longOpenInterest
      shortOpenInterest
    }
  }
`;

type OpenInterestData = {
  tradingStats: {
    longOpenInterest: number;
    shortOpenInterest: number;
  }[];
};

export default function useOpenInterest() {
  const { data } = useSWR(
    "openInterest",
    async () => {
      const results = await Promise.all(
        SUPPORTED_CHAIN_IDS.map(async (chainId) => {
          const endpoint = getSubgraphUrl(chainId, "stats");
          if (!endpoint) return undefined;
          return graphqlFetcher<OpenInterestData>(endpoint, OPEN_INTEREST_QUERY);
        })
      );
      return results;
    },
    {
      refreshInterval: 1000 * 60,
    }
  );

  return data?.reduce(
    (acc, cv, index) => {
      if (!cv?.tradingStats?.[0]) return acc;
      const { longOpenInterest = 0, shortOpenInterest = 0 } = cv?.tradingStats?.[0];
      const cumulativeOI = BigNumber.from(longOpenInterest || 0).add(BigNumber.from(shortOpenInterest || 0));
      acc[SUPPORTED_CHAIN_IDS[index]] = cumulativeOI;
      acc.total = acc.total.add(cumulativeOI || 0);
      return acc;
    },
    {
      total: BigNumber.from(0),
    }
  );
}
