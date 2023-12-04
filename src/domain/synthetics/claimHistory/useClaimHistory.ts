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
import { ClaimAction, ClaimCollateralAction, ClaimFundingFeeAction, ClaimMarketItem, ClaimType } from "./types";
import useWallet from "lib/wallets/useWallet";
import { getAddress } from "ethers/lib/utils.js";
import { getToken } from "config/tokens";

export type ClaimCollateralHistoryResult = {
  claimActions?: ClaimAction[];
  isLoading: boolean;
};

type RawClaimAction = {
  id: string;
  eventName: ClaimType;
  account: string;
  marketAddresses: string[];
  tokenAddresses: string[];
  amounts: string[];
  isLongOrders?: boolean[];
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

  const { data, error } = useSWR<RawClaimAction[]>(key, {
    fetcher: async () => {
      const skip = pageIndex * pageSize;
      const first = pageSize;

      const query = gql(`{
        claimActions(
            skip: ${skip},
            first: ${first},
            orderBy: transaction__timestamp,
            orderDirection: desc,
            where: { account: "${account!.toLowerCase()}" }
        ) {
            id
            account
            eventName
            marketAddresses
            tokenAddresses
            amounts
            isLongOrders
            transaction {
                timestamp
                hash
            }
        }
      }`);

      const { data } = await client!.query({ query, fetchPolicy: "no-cache" });

      return data?.claimActions as RawClaimAction[];
    },
  });

  const isLoading = (!error && !data) || !marketsInfoData || !tokensData;

  const claimActions = useMemo(() => {
    if (!data || !tokensData || !marketsInfoData) {
      return undefined;
    }

    return data.reduce((acc, rawAction) => {
      const eventName = rawAction.eventName;

      switch (eventName) {
        case ClaimType.ClaimFunding:
        case ClaimType.ClaimPriceImpact: {
          const claimCollateralAction = createClaimCollateralAction(
            eventName,
            rawAction,
            fixedAddresses,
            marketsInfoData
          );

          return claimCollateralAction ? [...acc, claimCollateralAction] : acc;
        }

        case ClaimType.SettleFundingFeeCreated:
        case ClaimType.SettleFundingFeeExecuted:
        case ClaimType.SettleFundingFeeCancelled: {
          const settleAction = createSettleFundingFeeAction(chainId, eventName, rawAction, marketsInfoData);
          return settleAction ? [...acc, settleAction] : acc;
        }
        default:
          return acc;
      }
    }, [] as ClaimAction[]);
  }, [chainId, data, fixedAddresses, marketsInfoData, tokensData]);

  return {
    claimActions,
    isLoading,
  };
}

function createClaimCollateralAction(
  eventName: ClaimCollateralAction["eventName"],
  rawAction: RawClaimAction,
  fixedAddresses: Record<string, string>,
  marketsInfoData: MarketsInfoData | undefined
): ClaimCollateralAction | null {
  const claimItemsMap: { [marketAddress: string]: ClaimMarketItem } = {};
  const claimAction: ClaimCollateralAction = {
    id: rawAction.id,
    type: "collateral",
    eventName,
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
      return null;
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
}

function createSettleFundingFeeAction(
  chainId: number,
  eventName: ClaimFundingFeeAction["eventName"],
  rawAction: RawClaimAction,
  marketsInfoData: MarketsInfoData | null
): ClaimFundingFeeAction | null {
  if (!marketsInfoData) return null;

  const markets = rawAction.marketAddresses
    .map((address) => getByKey(marketsInfoData, getAddress(address))!)
    .filter(Boolean);

  if (!markets.length) return null;

  const tokens = rawAction.tokenAddresses.map((address) => getToken(chainId, getAddress(address))).filter(Boolean);

  return {
    id: rawAction.id,
    type: "fundingFee",
    account: rawAction.account,
    amounts: rawAction.amounts.map((amount) => bigNumberify(amount)!),
    markets,
    tokens,
    isLongOrders: rawAction.isLongOrders ?? [],
    transactionHash: rawAction.transaction.hash,
    eventName,
    timestamp: rawAction.transaction.timestamp,
  };
}
