import { gql } from "@apollo/client";
import { useWeb3React } from "@web3-react/core";
import { useMarketsInfo } from "domain/synthetics/markets";
import { useAvailableTokensData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { bigNumberify } from "lib/numbers";
import { getByKey } from "lib/objects";
import { getSyntheticsGraphClient } from "lib/subgraph";
import { useMemo } from "react";
import useSWR from "swr";
import { ClaimCollateralAction, ClaimMarketItem, ClaimType } from "./types";
import { useFixedAddreseses } from "../common/useFixedAddresses";

export type ClaimCollateralHistoryResult = {
  claimActions?: ClaimCollateralAction[];
  error?: string;
};

type RawClaimCollateralAction = {
  id: string;
  eventName: ClaimType;
  account: string;
  marketAddresses: string[];
  tokenAddresses: string[];
  amounts: string[];

  transaction: {
    timestamp: number;
    hash: string;
  };
};

export function useClaimCollateralHistory(
  chainId: number,
  p: { pageIndex: number; pageSize: number }
): ClaimCollateralHistoryResult {
  const { pageIndex, pageSize } = p;

  const { account } = useWeb3React();
  const { marketsInfoData } = useMarketsInfo(chainId);
  const { tokensData } = useAvailableTokensData(chainId);
  const fixedAddresses = useFixedAddreseses(marketsInfoData, tokensData);
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

  const claimActions = useMemo(() => {
    if (!data || !tokensData || !marketsInfoData) {
      return undefined;
    }

    return data
      .map((rawAction) => {
        try {
          const claimItemsMap: { [marketAddress: string]: ClaimMarketItem } = {};

          const claimAction: ClaimCollateralAction = {
            id: rawAction.id,
            eventName: rawAction.eventName,
            account: rawAction.account,
            claimItems: [],
            timestamp: rawAction.transaction.timestamp,
            transactionHash: rawAction.transaction.hash,
          };

          for (let i = 0; i < rawAction.marketAddresses.length; i++) {
            const marketAddress = fixedAddresses[rawAction.marketAddresses[i]];
            const tokenAddress = fixedAddresses[rawAction.tokenAddresses[i]];
            const amount = bigNumberify(rawAction.amounts[i])!;
            const market = getByKey(marketsInfoData, marketAddress)!;

            if (!claimItemsMap[market.marketTokenAddress]) {
              claimItemsMap[market.marketTokenAddress] = {
                marketInfo: market,
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

          claimAction.claimItems = Object.values(claimItemsMap);

          return claimAction;
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
          return undefined;
        }
      })
      .filter(Boolean) as ClaimCollateralAction[];
  }, [data, fixedAddresses, marketsInfoData, tokensData]);

  return {
    claimActions,
    error,
  };
}
