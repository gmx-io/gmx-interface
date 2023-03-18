import { gql } from "@apollo/client";
import { useWeb3React } from "@web3-react/core";
import { getMarket, useMarketsData } from "domain/synthetics/markets";
import { useAvailableTokensData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { bigNumberify } from "lib/numbers";
import { getSyntheticsGraphClient } from "lib/subgraph";
import { useMemo } from "react";
import useSWR from "swr";
import { ClaimCollateralAction, ClaimItem, RawClaimCollateralAction } from "./types";

export function useClaimCollateralHistory(chainId: number, p: { pageIndex: number; pageSize: number }) {
  const { pageIndex, pageSize } = p;

  const { account } = useWeb3React();
  const { marketsData, isLoading: isMarketsLoading } = useMarketsData(chainId);
  const { tokensData, isLoading: isTokensLoading } = useAvailableTokensData(chainId);

  const client = getSyntheticsGraphClient(chainId);

  const key = chainId && client && account ? [chainId, "useClaimHistory", account, pageIndex, pageSize] : null;

  const { data, error } = useSWR<RawClaimCollateralAction[]>(key, {
    fetcher: async () => {
      const skip = pageIndex * pageSize;
      const first = pageSize;

      const query = gql(`{
        claimCollateralActions(
            skip: ${skip},
            first: ${first},
            orderBy: transaction__timestamp,
            orderDirection: desc,
            where: { account: "${account!.toLowerCase()}" }
        ) {
            account
            eventName
            marketAddresses
            tokenAddresses
            amounts
            transaction {
                timestamp
                hash
            }
        }
      }`);

      const { data } = await client!.query({ query });

      return data?.claimCollateralActions;
    },
  });

  const isClaimsLoading = key && !error && !data;
  const isLoading = isClaimsLoading || isMarketsLoading || isTokensLoading;

  const claimActions = useMemo(() => {
    if (isLoading || !data) return undefined;

    const fixedAddresses = Object.keys(marketsData)
      .concat(Object.keys(tokensData))
      .reduce((acc, address) => {
        acc[address.toLowerCase()] = address;

        return acc;
      }, {});

    return data
      .map((rawAction) => {
        const claimItemsMap: { [marketAddress: string]: ClaimItem } = {};

        for (let i = 0; i < rawAction.marketAddresses.length; i++) {
          const marketAddress = fixedAddresses[rawAction.marketAddresses[i]];
          const tokenAddress = fixedAddresses[rawAction.tokenAddresses[i]];
          const amount = bigNumberify(rawAction.amounts[i])!;

          const market = getMarket(marketsData, marketAddress);

          if (!market) {
            return undefined;
          }

          if (!claimItemsMap[market.marketTokenAddress]) {
            claimItemsMap[market.marketTokenAddress] = {
              market,
              longTokenAmount: BigNumber.from(0),
              shortTokenAmount: BigNumber.from(0),
            };
          }

          if (tokenAddress === market.longTokenAddress) {
            claimItemsMap[marketAddress].longTokenAmount = claimItemsMap[marketAddress].longTokenAmount.add(amount);
          } else {
            claimItemsMap[marketAddress].shortTokenAmount = claimItemsMap[marketAddress].shortTokenAmount.add(amount);
          }
        }

        const claimAction: ClaimCollateralAction = {
          id: rawAction.id,
          eventName: rawAction.eventName,
          account: rawAction.account,
          claimItems: Object.values(claimItemsMap),
          timestamp: rawAction.transaction.timestamp,
          transactionHash: rawAction.transaction.hash,
        };

        return claimAction;
      })
      .filter(Boolean) as ClaimCollateralAction[];
  }, [data, isLoading, marketsData, tokensData]);

  return {
    claimActions,
    isLoading,
  };
}
