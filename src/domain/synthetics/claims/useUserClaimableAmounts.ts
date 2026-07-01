import { gql } from "@apollo/client";
import { useMemo, useState } from "react";
import useSWR from "swr";

import { getContract } from "config/contracts";
import { claimsDisabledKey, claimTermsKey } from "config/dataStore";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectGlvInfo, selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getSubsquidGraphClient } from "lib/indexers";
import { ContractCallConfig, MulticallRequestConfig, useMulticall } from "lib/multicall";
import type { ClaimableAmount } from "sdk/codegen/subsquid";
import { ContractsChainId } from "sdk/configs/chains";
import { queryPaginated } from "sdk/utils/indexers";
import { getMarketPoolName } from "sdk/utils/markets";
import { convertToUsd } from "sdk/utils/tokens";

import { useMarketTokensData } from "../markets";
import { TokenData } from "../tokens";

export type ClaimableAmountsData = {
  amounts: { title: string; usd: bigint; amount: bigint; token: TokenData }[];
  totalUsd: bigint;
};

export type ClaimableAmountsDataByDistributionId = Record<string, ClaimableAmountsData>;

export type DistributionConfiguration = {
  claimTerms?: string;
  claimsDisabled: boolean;
};
export type ClaimsConfigurationData = Record<string, DistributionConfiguration>;

type ClaimsConfigurationRequestConfig = MulticallRequestConfig<
  Record<
    string,
    {
      calls: {
        claimTerms: ContractCallConfig;
        claimsDisabled: ContractCallConfig;
      };
    }
  >
>;

interface ClaimableAmountsResult {
  claimsConfigByDistributionId?: ClaimsConfigurationData;
  claimableAmountsDataByDistributionId?: ClaimableAmountsDataByDistributionId;
  isLoading: boolean;
  onClaimed: (distributionIds: string[]) => void;
}

export default function useUserClaimableAmounts(chainId: ContractsChainId, account?: string): ClaimableAmountsResult {
  const glvsInfo = useSelector(selectGlvInfo);
  const marketsInfo = useSelector(selectMarketsInfoData);
  const { marketTokensData } = useMarketTokensData(chainId, undefined, { withGlv: true, isDeposit: false });

  const tokensData = useTokensData();

  const [claimedDistributionIds, setClaimedDistributionIds] = useState<string[]>([]);

  const { data: claimableAmounts, isLoading: isClaimableAmountsLoading } = useSWR([account, chainId], async () => {
    const subsquidClient = getSubsquidGraphClient(chainId);

    const amounts = await queryPaginated<ClaimableAmount>(async (limit, offset) => {
      const response = await subsquidClient!.query({
        query: gql`
          query ClaimableTokens($account: String!, $limit: Int, $offset: Int) {
            claimableAmounts(limit: $limit, offset: $offset, where: { account_eq: $account }) {
              amount
              token
              distributionId
            }
          }
        `,
        variables: { account, limit, offset },
      });

      return response.data?.claimableAmounts ?? [];
    });

    return amounts;
  });

  const distributionIds = useMemo(() => {
    const ids = new Set(claimableAmounts?.map((claimableAmount) => claimableAmount.distributionId.toString()));
    return Array.from(ids).sort();
  }, [claimableAmounts]);

  const { data: claimsConfigByDistributionId, isLoading: isClaimsConfigLoading } = useMulticall<
    ClaimsConfigurationRequestConfig,
    ClaimsConfigurationData
  >(chainId, "claims-configuration", {
    key: distributionIds.length > 0 ? [distributionIds.join("-")] : undefined,
    request: () =>
      distributionIds.reduce((request, distributionId) => {
        request[distributionId] = {
          contractAddress: getContract(chainId, "DataStore"),
          abiId: "DataStore",
          calls: {
            claimTerms: {
              methodName: "getString",
              params: [claimTermsKey(BigInt(distributionId))],
            },
            claimsDisabled: {
              methodName: "getBool",
              params: [claimsDisabledKey(BigInt(distributionId))],
            },
          },
        };

        return request;
      }, {} as ClaimsConfigurationRequestConfig),
    parseResponse: (result) =>
      Object.entries(result.data).reduce((acc, [distributionId, calls]) => {
        acc[distributionId] = {
          claimTerms: calls.claimTerms.returnValues[0],
          claimsDisabled: Boolean(calls.claimsDisabled.returnValues[0]),
        };

        return acc;
      }, {} as ClaimsConfigurationData),
  });

  const claimableAmountsDataByDistributionId = useMemo(() => {
    const result: ClaimableAmountsDataByDistributionId = {};

    if (
      !claimableAmounts ||
      isClaimableAmountsLoading ||
      !glvsInfo ||
      !marketsInfo ||
      !tokensData ||
      !marketTokensData
    ) {
      return result;
    }

    claimableAmounts.forEach((claimableAmount) => {
      const { token, amount, distributionId } = claimableAmount;

      if (claimedDistributionIds.includes(distributionId)) {
        return;
      }

      const distributionConfiguration = claimsConfigByDistributionId?.[distributionId];
      if (!distributionConfiguration || distributionConfiguration.claimsDisabled) {
        return;
      }

      if (!result[distributionId]) {
        result[distributionId] = {
          amounts: [],
          totalUsd: 0n,
        };
      }

      const glv = glvsInfo?.[token];
      const market = marketsInfo?.[token];
      const tokenData = tokensData?.[token];

      let title, usd;

      if (glv) {
        title = `GLV [${getMarketPoolName({
          longToken: glv.longToken,
          shortToken: glv.shortToken,
        })}]`;
        usd = convertToUsd(BigInt(amount), 18, glv.glvToken.prices.minPrice) ?? 0n;
      }

      if (market) {
        title = getMarketPoolName({
          longToken: market.longToken,
          shortToken: market.shortToken,
        });
        usd = convertToUsd(BigInt(amount), 18, market.longToken.prices.minPrice) ?? 0n;
      }

      if (tokenData) {
        title = tokenData.symbol;
        usd = convertToUsd(BigInt(amount), tokenData.decimals, tokenData.prices.minPrice) ?? 0n;
      }

      result[distributionId].amounts.push({
        amount: BigInt(amount),
        token: tokensData[token] ?? marketTokensData[token],
        // @ts-expect-error potential bug: usd may be undefined if none of the glv/market/tokenData conditions match
        usd: usd,
        // @ts-expect-error potential bug: title may be undefined if none of the glv/market/tokenData conditions match
        title: title,
      });

      // @ts-expect-error potential bug: usd may be undefined if none of the glv/market/tokenData conditions match
      result[distributionId].totalUsd += usd;
    });
    return result;
  }, [
    glvsInfo,
    tokensData,
    marketsInfo,
    claimableAmounts,
    isClaimableAmountsLoading,
    marketTokensData,
    claimedDistributionIds,
    claimsConfigByDistributionId,
  ]);

  const isLoading =
    isClaimableAmountsLoading || isClaimsConfigLoading || !glvsInfo || !marketsInfo || !tokensData || !marketTokensData;

  return {
    claimsConfigByDistributionId,
    claimableAmountsDataByDistributionId,
    isLoading,
    onClaimed: setClaimedDistributionIds,
  };
}
