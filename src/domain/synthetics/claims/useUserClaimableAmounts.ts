import { useMemo } from "react";

import { getContract } from "config/contracts";
import { claimsDisabledKey, claimTermsKey } from "config/dataStore";
import { useTokensData } from "context/SyntheticsStateContext/hooks/globalsHooks";
import { selectGlvInfo, selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { useSelector } from "context/SyntheticsStateContext/utils";
import { TokenData } from "domain/tokens";
import { MulticallRequestConfig, useMulticall } from "lib/multicall";
import { getTokenBySymbolSafe } from "sdk/configs/tokens";
import { convertToUsd } from "sdk/utils/tokens";

import { getMarketPoolName } from "../../../../sdk/src/utils/markets";
import { useMarketTokensData } from "../markets";

export const GLP_DISTRIBUTION_TEST_ID = 4672592n;
export const GLP_DISTRIBUTION_ID = 11802763389053472339483616176459046875189472617101418668457790595837638713068n;

type ClaimableAmountsRequestConfig = MulticallRequestConfig<{
  [token: `0x${string}`]: {
    calls: {
      getClaimableAmount: {
        methodName: string;
        params: [string, string, [number]];
      };
    };
  };
  claimTerms: {
    calls: {
      getClaimTerms: {
        methodName: string;
        params: [string];
      };
    };
  };
  claimsDisabled: {
    calls: {
      getClaimsDisabled: {
        methodName: string;
        params: [string];
      };
    };
  };
}>;

export interface ClaimableAmountsResult {
  claimTerms: string;
  claimsDisabled;
  totalFundsToClaimUsd: bigint;
  claimableTokenTitles: Record<string, string>;
  claimableAmounts: Record<
    string,
    | {
        amount: bigint;
        usd: bigint;
        decimals?: number;
      }
    | undefined
  >;
  claimableAmountsLoaded: boolean;
  mutateClaimableAmounts: (shouldRevalidate?: boolean) => void;
}

export default function useUserClaimableAmounts(chainId: number, account?: string): ClaimableAmountsResult {
  const glvsInfo = useSelector(selectGlvInfo);
  const marketsInfo = useSelector(selectMarketsInfoData);

  const { marketTokensData } = useMarketTokensData(chainId, { isDeposit: false });
  const tokensData = useTokensData();

  const tokens = useMemo(
    () =>
      [getTokenBySymbolSafe(chainId, "WETH"), getTokenBySymbolSafe(chainId, "USDC")].filter(
        Boolean as unknown as FilterOutFalsy
      ),
    [chainId]
  );
  const markets = useMemo(
    () => (marketsInfo ? [marketsInfo["0x70d95587d40A2caf56bd97485aB3Eec10Bee6336"]].filter(Boolean) : []),
    [marketsInfo]
  );

  const allTokens = useMemo(
    () => [
      ...Object.keys(glvsInfo ?? {}),
      ...tokens.map((token) => token.address),
      ...markets.map((market) => market.marketTokenAddress),
    ],
    [tokens, markets, glvsInfo]
  );

  const claimableAmountsRequests: ClaimableAmountsRequestConfig = {
    claimTerms: {
      contractAddress: getContract(chainId, "DataStore"),
      abiId: "DataStore",
      calls: {
        getClaimTerms: {
          methodName: "getString",
          params: [claimTermsKey(GLP_DISTRIBUTION_ID)],
        },
      },
    },
    claimsDisabled: {
      contractAddress: getContract(chainId, "DataStore"),
      abiId: "DataStore",
      calls: {
        getClaimsDisabled: {
          methodName: "getBool",
          params: [claimsDisabledKey(GLP_DISTRIBUTION_ID)],
        },
      },
    },
  };

  allTokens.forEach((token) => {
    claimableAmountsRequests[token] = {
      contractAddress: getContract(chainId, "ClaimHandler"),
      abiId: "ClaimHandler",
      calls: {
        getClaimableAmount: {
          methodName: "getClaimableAmount",
          params: [account, token, [GLP_DISTRIBUTION_ID]],
        },
      },
    };
  });

  const claimableTokenTitles = useMemo(() => {
    const result: Record<string, string> = {};

    allTokens.forEach((token) => {
      const glv = glvsInfo?.[token];
      const market = marketsInfo?.[token];
      const tokenData = tokensData?.[token];

      if (glv) {
        result[token] = `GLV [${getMarketPoolName({
          longToken: glv.longToken,
          shortToken: glv.shortToken,
        })}]`;
      }

      if (market) {
        result[token] = getMarketPoolName({
          longToken: market.longToken,
          shortToken: market.shortToken,
        });
      }

      if (tokenData) {
        result[token] = tokenData.symbol;
      }
    });
    return result;
  }, [glvsInfo, tokensData, marketsInfo, allTokens]);

  const { data: claimableAmountsData, mutate: mutateClaimableAmounts } = useMulticall<
    ClaimableAmountsRequestConfig,
    Pick<ClaimableAmountsResult, "claimTerms" | "claimsDisabled" | "claimableAmounts">
  >(chainId, "glp-distribution", {
    key: account ? [account] : undefined,
    request: claimableAmountsRequests,
    parseResponse: (result) => {
      const claimTerms = result.data.claimTerms.getClaimTerms.returnValues[0];
      const claimsDisabled = Boolean(result.data.claimsDisabled.getClaimsDisabled.returnValues[0]);

      const claimableAmounts: ClaimableAmountsResult["claimableAmounts"] = {};
      for (const token of allTokens) {
        const claimableAmount = result.data[token].getClaimableAmount.returnValues[0] ?? 0n;

        const glv = glvsInfo?.[token];
        const market = marketsInfo?.[token];
        let tokenData: TokenData | undefined;

        if (glv) {
          tokenData = marketTokensData?.[token];
        } else if (market) {
          tokenData = marketTokensData?.[token];
        } else {
          tokenData = tokensData?.[token];
        }

        if (!tokenData) {
          continue;
        }

        const usd = convertToUsd(claimableAmount, tokenData.decimals, tokenData.prices.minPrice ?? 0n) ?? 0n;

        claimableAmounts[token] = {
          amount: claimableAmount,
          usd,
          decimals: tokenData.decimals,
        };
      }

      return {
        claimableAmounts,
        claimTerms,
        claimsDisabled,
      };
    },
  });

  const totalFundsToClaimUsd = useMemo(() => {
    return Object.values(claimableAmountsData?.claimableAmounts ?? {}).reduce(
      (acc, curr) => acc + (curr?.usd ?? 0n),
      0n
    );
  }, [claimableAmountsData]);

  const claimableAmountsLoaded = useMemo(() => {
    return allTokens.every((token) => claimableAmountsData?.claimableAmounts?.[token]?.amount !== undefined);
  }, [claimableAmountsData?.claimableAmounts, allTokens]);

  return {
    mutateClaimableAmounts,
    claimTerms: claimableAmountsData?.claimTerms ?? "",
    claimsDisabled: claimableAmountsData?.claimsDisabled ?? false,
    claimableAmounts: claimableAmountsData?.claimableAmounts ?? {},
    claimableAmountsLoaded,
    totalFundsToClaimUsd,
    claimableTokenTitles,
  };
}
