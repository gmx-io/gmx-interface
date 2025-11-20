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

import { useMarketTokensData } from "../markets";
import { TokenData } from "../tokens";

export const GLP_DISTRIBUTION_TEST_ID = 4672592n;
export const GLP_DISTRIBUTION_ID = 11802763389053472339483616176459046875189472617101418668457790595837638713068n;
export const GLV_BONUS_INCENTIVE_DISTRIBUTION_TEST_ID =
  113005011054014960800824418529010340523901000236636486140352426860453188114236n;
export const GLV_BONUS_INCENTIVE_DISTRIBUTION_ID =
  64013039480962942581181820133015390730044968712377073754034637994666645393343n;

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
  claimTermsGlpDistributionTest: {
    calls: {
      getClaimTerms: {
        methodName: string;
        params: [string];
      };
    };
  };
  claimTermsGlvBonusIncentiveDistributionTest: {
    calls: {
      getClaimTerms: {
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
  claimsConfigByDistributionId?: ClaimsConfigurationData;
  claimableAmountsDataByDistributionId?: ClaimableAmountsDataByDistributionId;
  isLoading: boolean;
  mutateClaimableAmounts: () => void;
}

export default function useUserClaimableAmounts(chainId: ContractsChainId, account?: string): ClaimableAmountsResult {
  const glvsInfo = useSelector(selectGlvInfo);
  const marketsInfo = useSelector(selectMarketsInfoData);
  const { marketTokensData } = useMarketTokensData(chainId, undefined, { withGlv: true, isDeposit: false });

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
    claimTermsGlpDistributionTest: {
      contractAddress: getContract(chainId, "DataStore"),
      abiId: "DataStore",
      calls: {
        getClaimTerms: {
          methodName: "getString",
          params: [claimTermsKey(GLP_DISTRIBUTION_TEST_ID)],
        },
      },
    },
    claimTermsGlvBonusIncentiveDistributionTest: {
      contractAddress: getContract(chainId, "DataStore"),
      abiId: "DataStore",
      calls: {
        getClaimTerms: {
          methodName: "getString",
          params: [claimTermsKey(GLV_BONUS_INCENTIVE_DISTRIBUTION_TEST_ID)],
        },
      },
    },
  };

  const {
    data: claimableAmounts,
    isLoading: isClaimableAmountsLoading,
    mutate: mutateClaimableAmounts,
  } = useSWR([account, chainId], async () => {
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
        usd,
        title,
      });

      result[distributionId].totalUsd += usd;
    });
    return result;
  }, [glvsInfo, tokensData, marketsInfo, claimableAmounts, isClaimableAmountsLoading, marketTokensData]);

  const { data: claimsConfigByDistributionId, isLoading: isClaimsConfigLoading } = useMulticall<
    ClaimsConfigurationRequestConfig,
    ClaimsConfigurationData
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

      const claimTermsGlpDistributionTest = result.data.claimTermsGlpDistributionTest.getClaimTerms.returnValues[0];
      const claimTermsGlvBonusIncentiveDistributionTest =
        result.data.claimTermsGlvBonusIncentiveDistributionTest.getClaimTerms.returnValues[0];

      return {
        [GLP_DISTRIBUTION_ID.toString()]: {
          claimTerms: claimTermsGlpDistribution,
          claimsDisabled: claimsDisabledGlpDistribution,
        },
        [GLV_BONUS_INCENTIVE_DISTRIBUTION_ID.toString()]: {
          claimTerms: undefined,
          claimsDisabled: claimsDisabledGlvBonusIncentiveDistribution,
        },
        [GLP_DISTRIBUTION_TEST_ID.toString()]: {
          claimTerms: claimTermsGlpDistributionTest,
          claimsDisabled: false,
        },
        [GLV_BONUS_INCENTIVE_DISTRIBUTION_TEST_ID.toString()]: {
          claimTerms: claimTermsGlvBonusIncentiveDistributionTest,
          claimsDisabled: false,
        },
      };
    },
  });

  const isLoading = isClaimableAmountsLoading || isClaimsConfigLoading;

  return {
    claimsConfigByDistributionId,
    claimableAmountsDataByDistributionId,
    isLoading,
    mutateClaimableAmounts,
  };
}
