import { useEffect, useState } from "react";
import useSWR from "swr";
import { BigNumber, utils } from "ethers";
import { queryAccountOpenPositions } from "./queries"
import { arbitrumGoerliLeaderboardsClient as graph } from "lib/subgraph/clients";
import { RemoteData, PositionScores, AccountOpenPositionJson } from "./types";
import { useTokenRecentPrices } from "domain/synthetics/tokens";
import { formatAmount } from "lib/numbers";
import { USD_DECIMALS } from "lib/legacy";
import { useChainId } from "lib/chains";

export function useTopPositions() {
  const { chainId } = useChainId();
  const { pricesData } = useTokenRecentPrices(chainId);
  const [topPositions, setTopPositions] = useState<RemoteData<PositionScores>>({
    isLoading: false,
    data: [],
    error: null,
  });

  const openPositions = useSWR('/leaderboards/positions', async () => {
    const res = await graph.query<{ accountOpenPositions: Array<AccountOpenPositionJson> }>({
      query: queryAccountOpenPositions,
      variables: {
        pageSize: 1000,
        offset: 0,
        orderBy: "sizeInUsd",
        orderDirection: "desc",
      }
    });

    return res.data.accountOpenPositions.map((p) => ({
      ...p,
      sizeInTokens: BigNumber.from(p.sizeInTokens),
      sizeInUsd: BigNumber.from(p.sizeInUsd),
      realizedPnl: BigNumber.from(p.realizedPnl),
    }));
  });

  useEffect(() => {
    if (openPositions.error) {
      setTopPositions(s => ({...s, error: openPositions.error}));
    } else if (!pricesData || !openPositions.data) {
      setTopPositions(s => ({...s, isLoading: true}));
    } else {
      const data: Array<PositionScores & {unrealizedPnlBN: BigNumber}> = [];
      for (let i = 0; i < openPositions.data.length; i++) {
        const p = openPositions.data[i];
        const token = utils.getAddress(p.collateralToken); // TODO: or market?

        if (!(token in pricesData)) {
          setTopPositions(s => ({
            ...s,
            error: new Error(`Unable to find price for token ${token}`)
          }));

          return;
        }

        const value = p.sizeInTokens.mul(
          p.isLong ? pricesData[token].minPrice : pricesData[token].maxPrice
        );

        const unrealizedPnl = p.isLong ? value.sub(p.sizeInUsd) : p.sizeInTokens.sub(value);

        data.push({
          id: p.id,
          account: p.account,
          unrealizedPnlBN: unrealizedPnl,
          unrealizedPnl: formatAmount(unrealizedPnl, USD_DECIMALS + 18, 0, true),
          market: `${token} ${p.isLong ? "Long" : "Short"}`,
          entryPrice: "0",
          sizeLiqPrice: `${formatAmount(p.sizeInUsd, USD_DECIMALS, 0, true)} (${0})`,
        });
      }

      setTopPositions(s => ({
        ...s,
        data: data.sort((a, b) => a.unrealizedPnlBN.gt(b.unrealizedPnlBN) ? -1 : 1)
      }));
    }
  }, [
    openPositions.data,
    openPositions.error,
    pricesData
  ]);

  return topPositions;
}
