import { gql } from "@apollo/client";
import { getAddress } from "ethers";
import { useMemo } from "react";
import useSWRInfinite, { SWRInfiniteResponse } from "swr/infinite";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";
import { useMarketsInfoData, useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectAccount } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { MarketsInfoData } from "domain/synthetics/markets";
import { BN_ZERO, bigNumberify } from "lib/numbers";
import { getByKey } from "lib/objects";
import { getSubsquidGraphClient } from "lib/subgraph";
import { getToken } from "sdk/configs/tokens";
import { buildFiltersBody } from "sdk/utils/subgraph";

import { useFixedAddreseses } from "../common/useFixedAddresses";
import { ClaimAction, ClaimCollateralAction, ClaimFundingFeeAction, ClaimMarketItem, ClaimType } from "./types";

export type ClaimCollateralHistoryResult = {
  claimActions?: ClaimAction[];
  isLoading: boolean;
  pageIndex: number;
  setPageIndex: (...args: Parameters<SWRInfiniteResponse["setSize"]>) => void;
};

type RawClaimAction = {
  id: string;
  eventName: ClaimType;
  account: string;
  marketAddresses: string[];
  tokenAddresses: string[];
  amounts: string[];
  tokenPrices: string[];
  isLongOrders?: boolean[];
  transaction: {
    hash: string;
  };
  timestamp: number;
};

export function useClaimCollateralHistory(
  chainId: number,
  p: {
    pageSize: number;
    fromTxTimestamp?: number;
    toTxTimestamp?: number;
    eventName?: string[];
    marketAddresses?: string[];
  }
): ClaimCollateralHistoryResult {
  const { pageSize, fromTxTimestamp, toTxTimestamp, eventName, marketAddresses } = p;
  const marketsInfoData = useMarketsInfoData();
  const tokensData = useTokensData();
  const { showDebugValues } = useSettings();

  const account = useSelector(selectAccount);
  const fixedAddresses = useFixedAddreseses(marketsInfoData, tokensData);
  const client = getSubsquidGraphClient(chainId);

  const queryDisabled = !chainId || !client || !account;

  const key = (pageIndex: number) => {
    if (queryDisabled) {
      return null;
    }

    return [
      chainId,
      "useClaimHistory",
      account,
      pageIndex,
      pageSize,
      fromTxTimestamp,
      toTxTimestamp,
      structuredClone(eventName)?.sort().join(","),
      structuredClone(marketAddresses)?.sort().join(","),
    ];
  };

  const {
    data,
    error,
    size: pageIndex,
    setSize: setPageIndex,
  } = useSWRInfinite<RawClaimAction[]>(key, {
    fetcher: async (key) => {
      const pageIndex = key[3];
      const offset = pageIndex * pageSize;
      const limit = pageSize;

      const filterStr = buildFiltersBody(
        {
          AND: [
            {
              account_eq: account,
              transaction_timestamp_gte: fromTxTimestamp,
              transaction_timestamp_lte: toTxTimestamp,
              eventName_in: eventName,
            },
            {
              OR: marketAddresses?.map((tokenAddress) => ({
                marketAddresses_contains: [tokenAddress.toLowerCase()],
              })),
            },
            ...(showDebugValues
              ? []
              : [
                  {
                    OR: [{ eventName_not_eq: ClaimType.SettleFundingFeeCreated }],
                  },
                ]),
          ],
        },
        {
          enums: ClaimType,
        }
      );

      const whereClause = `where: ${filterStr}`;

      const query = gql(`{
        claimActions(
            offset: ${offset},
            limit: ${limit},
            orderBy: transaction_timestamp_DESC,
            ${whereClause}
        ) {
            id
            account
            eventName
            marketAddresses
            tokenAddresses
            amounts
            tokenPrices
            isLongOrders
            timestamp
            transaction {
                hash
            }
        }
      }`);

      const { data } = await client!.query({ query, fetchPolicy: "no-cache" });

      return data.claimActions as RawClaimAction[];
    },
  });

  const isLoading = (!error && !data) || !marketsInfoData || !tokensData;

  const claimActions = useMemo(() => {
    if (!data || !tokensData || !marketsInfoData) {
      return undefined;
    }

    return data.flat().reduce((acc, rawAction) => {
      const eventName = rawAction.eventName;

      switch (eventName) {
        case ClaimType.ClaimFunding:
        case ClaimType.ClaimPriceImpact: {
          const claimCollateralAction = createClaimCollateralAction(
            chainId,
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
          const settleAction = createSettleFundingFeeAction(
            chainId,
            eventName,
            rawAction,
            fixedAddresses,
            marketsInfoData
          );
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
    pageIndex,
    setPageIndex,
  };
}

function createClaimCollateralAction(
  chainId: number,
  eventName: ClaimCollateralAction["eventName"],
  rawAction: RawClaimAction,
  fixedAddresses: Record<string, string>,
  marketsInfoData: MarketsInfoData | undefined
): ClaimCollateralAction | null {
  const tokens = rawAction.tokenAddresses.map((address) => getToken(chainId, getAddress(address))).filter(Boolean);

  const claimItemsMap: { [marketAddress: string]: ClaimMarketItem } = {};
  const claimAction: ClaimCollateralAction = {
    id: rawAction.id,
    type: "collateral",
    eventName,
    account: rawAction.account,
    claimItems: [],
    timestamp: rawAction.timestamp,
    transaction: rawAction.transaction,
    tokens,
    amounts: rawAction.amounts.map((amount) => bigNumberify(amount)!),
    tokenPrices: rawAction.tokenPrices.map((price) => bigNumberify(price)!),
  };

  for (let i = 0; i < rawAction.marketAddresses.length; i++) {
    const marketAddress = rawAction.marketAddresses[i];
    const tokenAddress = rawAction.tokenAddresses[i];
    const amount = bigNumberify(rawAction.amounts[i])!;
    const price = bigNumberify(rawAction.tokenPrices[i])!;
    const marketInfo = getByKey(marketsInfoData, marketAddress);

    if (amount === 0n) {
      continue;
    }

    if (!marketInfo) {
      return null;
    }

    if (!claimItemsMap[marketInfo.marketTokenAddress]) {
      claimItemsMap[marketInfo.marketTokenAddress] = {
        marketInfo: marketInfo,
        longTokenAmount: BN_ZERO,
        longTokenAmountUsd: BN_ZERO,
        shortTokenAmount: BN_ZERO,
        shortTokenAmountUsd: BN_ZERO,
      };
    }

    if (tokenAddress === marketInfo.longTokenAddress) {
      claimItemsMap[marketAddress].longTokenAmount = claimItemsMap[marketAddress].longTokenAmount + amount;
      claimItemsMap[marketAddress].longTokenAmountUsd =
        claimItemsMap[marketAddress].longTokenAmountUsd + amount * price;
    } else {
      claimItemsMap[marketAddress].shortTokenAmount = claimItemsMap[marketAddress].shortTokenAmount + amount;
      claimItemsMap[marketAddress].shortTokenAmountUsd =
        claimItemsMap[marketAddress].shortTokenAmountUsd + amount * price;
    }
  }

  claimAction.claimItems = Object.values(claimItemsMap);

  return claimAction;
}

function createSettleFundingFeeAction(
  chainId: number,
  eventName: ClaimFundingFeeAction["eventName"],
  rawAction: RawClaimAction,
  fixedAddresses: Record<string, string>,
  marketsInfoData: MarketsInfoData | null
): ClaimFundingFeeAction | null {
  if (!marketsInfoData) return null;

  const markets = rawAction.marketAddresses
    .map((address) => getByKey(marketsInfoData, getAddress(address))!)
    .filter(Boolean);

  if (!markets.length) return null;

  const tokens = rawAction.tokenAddresses.map((address) => getToken(chainId, getAddress(address))).filter(Boolean);

  const claimItemsMap: { [marketAddress: string]: ClaimMarketItem } = {};
  if (rawAction.eventName === ClaimType.SettleFundingFeeExecuted) {
    for (let i = 0; i < rawAction.marketAddresses.length; i++) {
      const marketAddress = fixedAddresses[rawAction.marketAddresses[i]];
      const tokenAddress = fixedAddresses[rawAction.tokenAddresses[i]];

      const amount = bigNumberify(rawAction.amounts[i])!;
      const price = bigNumberify(rawAction.tokenPrices[i])!;

      const marketInfo = getByKey(marketsInfoData, marketAddress);

      if (!marketInfo) {
        return null;
      }

      if (!claimItemsMap[marketInfo.marketTokenAddress]) {
        claimItemsMap[marketInfo.marketTokenAddress] = {
          marketInfo: marketInfo,
          longTokenAmount: BN_ZERO,
          shortTokenAmount: BN_ZERO,
          longTokenAmountUsd: BN_ZERO,
          shortTokenAmountUsd: BN_ZERO,
        };
      }

      if (tokenAddress === marketInfo.longTokenAddress) {
        claimItemsMap[marketAddress].longTokenAmount = claimItemsMap[marketAddress].longTokenAmount + amount;
        claimItemsMap[marketAddress].longTokenAmountUsd =
          claimItemsMap[marketAddress].longTokenAmountUsd + amount * price;
      } else {
        claimItemsMap[marketAddress].shortTokenAmount = claimItemsMap[marketAddress].shortTokenAmount + amount;
        claimItemsMap[marketAddress].shortTokenAmountUsd =
          claimItemsMap[marketAddress].shortTokenAmountUsd + amount * price;
      }
    }
  }

  return {
    id: rawAction.id,
    type: "fundingFee",
    account: rawAction.account,
    amounts: rawAction.amounts.map((amount) => bigNumberify(amount)!),
    tokenPrices: rawAction.tokenPrices.map((price) => bigNumberify(price)!),
    markets,
    tokens,
    isLongOrders: rawAction.isLongOrders ?? [],
    transaction: rawAction.transaction,
    eventName,
    timestamp: rawAction.timestamp,
    claimItems: Object.values(claimItemsMap),
  };
}
