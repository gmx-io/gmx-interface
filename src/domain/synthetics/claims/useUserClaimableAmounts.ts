import { gql } from "@apollo/client";
import { useMemo } from "react";
import useSWR from "swr";

import { getContract } from "config/contracts";
import { claimsDisabledKey, claimTermsKey } from "config/dataStore";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectGlvInfo, selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { getSubsquidGraphClient } from "lib/indexers";
import { MulticallRequestConfig, useMulticall } from "lib/multicall";
import { ContractsChainId } from "sdk/configs/chains";
import type { ClaimableAmount } from "sdk/types/subsquid";
import { queryPaginated } from "sdk/utils/indexers";
import { getMarketPoolName } from "sdk/utils/markets";
import { convertToUsd } from "sdk/utils/tokens";

export const GLP_DISTRIBUTION_TEST_ID = 4672592n;
export const GLP_DISTRIBUTION_ID = 11802763389053472339483616176459046875189472617101418668457790595837638713068n;
export const GLV_BONUS_INCENTIVE_DISTRIBUTION_TEST_ID =
  113005011054014960800824418529010340523901000236636486140352426860453188114236n;
export const GLV_BONUS_INCENTIVE_DISTRIBUTION_ID =
  64013039480962942581181820133015390730044968712377073754034637994666645393343n;

type ClaimsConfigurationRequestConfig = MulticallRequestConfig<{
  claimTermsGlpDistribution: {
    calls: {
      getClaimTerms: {
        methodName: string;
        params: [string];
      };
    };
  };
  claimsDisabledGlpDistribution: {
    calls: {
      getClaimsDisabled: {
        methodName: string;
        params: [string];
      };
    };
  };
  claimsDisabledGlvBonusIncentiveDistribution: {
    calls: {
      getClaimsDisabled: {
        methodName: string;
        params: [string];
      };
    };
  };
}>;

export interface ClaimableAmountsResult {
  claimsConfigData?: {
    claimTermsGlpDistribution: string;
    claimsDisabledGlpDistribution: boolean;
    claimsDisabledGlvBonusIncentiveDistribution: boolean;
  };
  totalFundsToClaimUsd: bigint;
  claimableTokensInfo: Record<string, { title: string; usd: bigint }>;
  isLoading: boolean;
}

export default function useUserClaimableAmounts(chainId: ContractsChainId, account?: string): ClaimableAmountsResult {
  const glvsInfo = useSelector(selectGlvInfo);
  const marketsInfo = useSelector(selectMarketsInfoData);

  const tokensData = useTokensData();

  const claimableAmountsRequests: ClaimsConfigurationRequestConfig = {
    claimTermsGlpDistribution: {
      contractAddress: getContract(chainId, "DataStore"),
      abiId: "DataStore",
      calls: {
        getClaimTerms: {
          methodName: "getString",
          params: [claimTermsKey(GLP_DISTRIBUTION_ID)],
        },
      },
    },
    claimsDisabledGlpDistribution: {
      contractAddress: getContract(chainId, "DataStore"),
      abiId: "DataStore",
      calls: {
        getClaimsDisabled: {
          methodName: "getBool",
          params: [claimsDisabledKey(GLP_DISTRIBUTION_ID)],
        },
      },
    },
    claimsDisabledGlvBonusIncentiveDistribution: {
      contractAddress: getContract(chainId, "DataStore"),
      abiId: "DataStore",
      calls: {
        getClaimsDisabled: {
          methodName: "getBool",
          params: [claimsDisabledKey(GLV_BONUS_INCENTIVE_DISTRIBUTION_ID)],
        },
      },
    },
  };

  const { data: claimableAmountsData, isLoading: isClaimableAmountsLoading } = useSWR([], async () => {
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

  const claimableTokensInfo = useMemo(() => {
    const result: Record<string, { title: string; usd: bigint }> = {};

    if (!claimableAmountsData || isClaimableAmountsLoading) {
      return result;
    }

    claimableAmountsData.forEach(({ token, amount }) => {
      const glv = glvsInfo?.[token];
      const market = marketsInfo?.[token];
      const tokenData = tokensData?.[token];

      if (glv) {
        result[token] = {
          title: `GLV [${getMarketPoolName({
            longToken: glv.longToken,
            shortToken: glv.shortToken,
          })}]`,
          usd: convertToUsd(BigInt(amount), 18, glv.glvToken.prices.minPrice) ?? 0n,
        };
      }

      if (market) {
        result[token] = {
          title: getMarketPoolName({
            longToken: market.longToken,
            shortToken: market.shortToken,
          }),
          usd: convertToUsd(BigInt(amount), 18, market.longToken.prices.minPrice) ?? 0n,
        };
      }

      if (tokenData) {
        result[token] = {
          title: tokenData.symbol,
          usd: convertToUsd(BigInt(amount), tokenData.decimals, tokenData.prices.minPrice) ?? 0n,
        };
      }
    });
    return result;
  }, [glvsInfo, tokensData, marketsInfo, claimableAmountsData, isClaimableAmountsLoading]);

  const { data: claimsConfigData, isLoading: isClaimsConfigLoading } = useMulticall<
    ClaimsConfigurationRequestConfig,
    ClaimableAmountsResult["claimsConfigData"] | undefined
  >(chainId, "glp-distribution", {
    key: account ? [account] : undefined,
    request: claimableAmountsRequests,
    parseResponse: (result) => {
      const claimTermsGlpDistribution = result.data.claimTermsGlpDistribution.getClaimTerms.returnValues[0];
      const claimsDisabledGlpDistribution = Boolean(
        result.data.claimsDisabledGlpDistribution.getClaimsDisabled.returnValues[0]
      );
      const claimsDisabledGlvBonusIncentiveDistribution = Boolean(
        result.data.claimsDisabledGlvBonusIncentiveDistribution.getClaimsDisabled.returnValues[0]
      );

      return {
        claimTermsGlpDistribution,
        claimsDisabledGlpDistribution,
        claimsDisabledGlvBonusIncentiveDistribution,
      };
    },
  });

  const totalFundsToClaimUsd = useMemo(() => {
    return Object.values(claimableTokensInfo).reduce((acc, curr) => {
      acc += curr.usd;
      return acc;
    }, 0n);
  }, [claimableTokensInfo]);

  const isLoading = useMemo(() => {
    return !isClaimableAmountsLoading && !isClaimsConfigLoading;
  }, [isClaimableAmountsLoading, isClaimsConfigLoading]);

  return {
    claimsConfigData,
    totalFundsToClaimUsd,
    claimableTokensInfo,
    isLoading,
  };
}
