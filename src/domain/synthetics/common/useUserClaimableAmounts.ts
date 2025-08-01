import { useMemo } from "react";

import { getContract } from "config/contracts";
import { claimsDisabledKey, claimTermsKey } from "config/dataStore";
import { selectGlvInfo } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { MulticallRequestConfig, useMulticall } from "lib/multicall";
import { formatAmount } from "lib/numbers";
import { convertToUsd } from "sdk/utils/tokens";

import { getMarketPoolName } from "../../../../sdk/src/utils/markets";
import { useMarketTokensData } from "../markets";

export const GLP_DISTRIBUTION_ID = 4672592n;

type ClaimableAmountsRequestConfig = MulticallRequestConfig<{
  [token: `0x${string}`]: {
    calls: {
      getClaimableAmount: {
        methodName: string;
        params: [string, string, number];
      };
    };
  };
  claimTerms: {
    calls: {
      getClaimTerms: {
        methodName: string;
        params: [string, number, number];
      };
    };
  };
  claimsDisabled: {
    calls: {
      getClaimsDisabled: {
        methodName: string;
        params: [string, number, number];
      };
    };
  };
}>;

export interface ClaimableAmountsResult {
  claimTerms: string;
  claimsDisabled;
  totalFundsToClaimUsd: bigint;
  fundsToClaimTitles: Record<string, string>;
  claimableAmounts: Record<
    string,
    | {
        title: string;
        amount?: bigint;
        usd?: bigint;
      }
    | undefined
  >;
}

export default function useUserClaimableAmounts(chainId: number, account?: string): ClaimableAmountsResult {
  const glvs = useSelector(selectGlvInfo);
  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit: false });

  const claimableAmountsRequests: ClaimableAmountsRequestConfig = {
    claimTerms: {
      contractAddress: getContract(chainId, "DataStore"),
      abiId: "DataStore",
      calls: {
        getClaimTerms: {
          methodName: "getString",
          params: [claimTermsKey(Number(GLP_DISTRIBUTION_ID))],
        },
      },
    },
    claimsDisabled: {
      contractAddress: getContract(chainId, "DataStore"),
      abiId: "DataStore",
      calls: {
        getClaimsDisabled: {
          methodName: "getBool",
          params: [claimsDisabledKey(Number(GLP_DISTRIBUTION_ID))],
        },
      },
    },
  };

  Object.keys(glvs ?? {}).forEach((glv) => {
    claimableAmountsRequests[glv] = {
      contractAddress: getContract(chainId, "ClaimHandler"),
      abiId: "ClaimHandler",
      calls: {
        getClaimableAmount: {
          methodName: "getClaimableAmount",
          params: [account, glv, [GLP_DISTRIBUTION_ID]],
        },
      },
    };
  });

  const tokensWithTitles = useMemo(() => {
    const result: Record<string, string> = {};

    Object.keys(glvs ?? {}).forEach((glv) => {
      result[glv] = `GLV [${getMarketPoolName({
        longToken: glvs![glv].longToken,
        shortToken: glvs![glv].shortToken,
      })}]`;
    });

    return result;
  }, [glvs]);

  const { data: claimableAmountsData } = useMulticall<ClaimableAmountsRequestConfig, ClaimableAmountsResult>(
    chainId,
    "glp-distribution",
    {
      key: account ? [account] : undefined,
      request: claimableAmountsRequests,
      parseResponse: (result) => {
        const claimTerms = result.data.claimTerms.getClaimTerms.returnValues.claimTerms;
        const claimsDisabled = Boolean(result.data.claimsDisabled.getClaimsDisabled.returnValues.claimsDisabled);
        const glvClaimableAmounts = Object.fromEntries(
          Object.keys(glvs ?? {}).map((glv) => {
            const glvClaimableAmount = result.data[glv].getClaimableAmount.returnValues[0] ?? 0n;
            return [
              glv,
              {
                title: tokensWithTitles[glv],
                amount: glvClaimableAmount,
                usd: convertToUsd(glvClaimableAmount, 18, marketTokensData?.[glv]?.prices.maxPrice ?? 0n) ?? 0n,
              },
            ];
          })
        );

        const claimableAmounts = glvClaimableAmounts;

        return {
          claimTerms,
          claimsDisabled,
          totalFundsToClaimUsd: Object.values(claimableAmounts).reduce((acc, curr) => acc + curr.usd, 0n),
          fundsToClaimTitles: Object.values(claimableAmounts).reduce(
            (acc, { amount, title }) => {
              acc[title] = formatAmount(amount, 18);

              return acc;
            },
            {} as Record<string, string>
          ),
          claimableAmounts,
        };
      },
    }
  );

  return {
    claimTerms: claimableAmountsData?.claimTerms ?? "",
    claimsDisabled: claimableAmountsData?.claimsDisabled ?? false,
    totalFundsToClaimUsd: claimableAmountsData?.totalFundsToClaimUsd ?? 0n,
    fundsToClaimTitles: claimableAmountsData?.fundsToClaimTitles ?? {},
    claimableAmounts: Object.fromEntries(
      Object.entries(tokensWithTitles ?? {}).map(([token, title]) => [
        token,
        claimableAmountsData?.claimableAmounts?.[token] ?? { title },
      ])
    ),
  };
}
