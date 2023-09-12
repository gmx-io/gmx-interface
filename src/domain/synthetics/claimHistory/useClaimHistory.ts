import { gql } from "@apollo/client";
import { MarketsInfoData } from "domain/synthetics/markets";
import { TokensData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";
import { bigNumberify } from "lib/numbers";
import { getByKey } from "lib/objects";
import { getSyntheticsGraphClient } from "lib/subgraph";
import { useMemo } from "react";
import useSWR from "swr";
import { useFixedAddreseses } from "../common/useFixedAddresses";
import { ClaimCollateralAction, ClaimMarketItem, ClaimType } from "./types";
import useWallet from "lib/wallets/useWallet";

export type ClaimCollateralHistoryResult = {
  claimActions?: ClaimCollateralAction[];
  isLoading: boolean;
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
  p: { marketsInfoData?: MarketsInfoData; tokensData?: TokensData; pageIndex: number; pageSize: number }
): ClaimCollateralHistoryResult {
  const { pageIndex, pageSize, marketsInfoData, tokensData } = p;

  const { account } = useWallet();
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

      const { data } = await client!.query({ query, fetchPolicy: "no-cache" });

      return data?.claimCollateralActions;
    },
  });

  const isLoading = (!error && !data) || !marketsInfoData || !tokensData;

  const claimActions = useMemo(() => {
    if (!data || !tokensData || !marketsInfoData) {
      return undefined;
    }

    return data
      .map((rawAction) => {
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
          const marketInfo = getByKey(marketsInfoData, marketAddress);

          if (!marketInfo) {
            return undefined;
          }

          if (!claimItemsMap[marketInfo.marketTokenAddress]) {
            claimItemsMap[marketInfo.marketTokenAddress] = {
              marketInfo: marketInfo,
              longTokenAmount: BigNumber.from(0),
              shortTokenAmount: BigNumber.from(0),
            };
          }

          if (tokenAddress === marketInfo.longTokenAddress) {
            claimItemsMap[marketAddress].longTokenAmount = claimItemsMap[marketAddress].longTokenAmount.add(amount);
          } else {
            claimItemsMap[marketAddress].shortTokenAmount = claimItemsMap[marketAddress].shortTokenAmount.add(amount);
          }
        }

        claimAction.claimItems = Object.values(claimItemsMap);

        return claimAction;
      })
      .filter(Boolean) as ClaimCollateralAction[];
  }, [data, fixedAddresses, marketsInfoData, tokensData]);

  return {
    claimActions,
    isLoading,
  };
}
