import { gql } from "@apollo/client";
import useSWR from "swr";
import type { Address } from "viem";

import { getSubsquidGraphClient } from "lib/subgraph/clients";
import { getByKey } from "sdk/utils/objects";

import { convertToUsd, useTokensDataRequest } from "../tokens";

const POSITIONS_COLLATERAL_QUERY = gql`
  query MyQuery {
    positionTotalCollateralAmount {
      amount
      token
    }
  }
`;

export function usePositionsTotalCollateral(chainId: number) {
  const { tokensData } = useTokensDataRequest(chainId);

  const { data } = useSWR<bigint | undefined>(
    [chainId, tokensData, "positionsCollateral"],
    async () => {
      const client = getSubsquidGraphClient(chainId);

      if (!client || !tokensData) {
        return;
      }

      const response = await client.query<{ positionTotalCollateralAmount: { amount: string; token: Address }[] }>({
        query: POSITIONS_COLLATERAL_QUERY,
      });

      return response.data?.positionTotalCollateralAmount.reduce((acc, cur) => {
        const token = getByKey(tokensData, cur.token);

        if (!token || token.prices?.minPrice === undefined) {
          return acc;
        }

        const positionsCollateralUsd = convertToUsd(BigInt(cur.amount), token.decimals, token.prices.minPrice);
        return acc + (positionsCollateralUsd !== undefined ? positionsCollateralUsd : 0n);
      }, 0n);
    },
    {
      errorRetryCount: 2,
      refreshInterval: 60_000,
    }
  );

  return data;
}
