import { gql } from "@apollo/client";
import { getAddress } from "ethers";
import { useMemo } from "react";
import useSWR from "swr";

import { getSubsquidGraphClient } from "lib/indexers";
import { expandDecimals, PRECISION } from "lib/numbers";
import useWallet from "lib/wallets/useWallet";
import { ClaimableCollateral } from "sdk/types/subsquid";
import { queryPaginated } from "sdk/utils/indexers";
import { nowInSeconds } from "sdk/utils/time";

import { PositionsConstants } from "../positions/usePositionsConstants";

export type RebateInfoItem = {
  factor: bigint;
  value: bigint;
  marketAddress: string;
  timeKey: string;
  tokenAddress: string;
  valueByFactor: bigint;
  reductionFactor: bigint;
  id: string;
};

export type RebatesInfoResult = {
  accruedPositionPriceImpactFees: RebateInfoItem[];
  claimablePositionPriceImpactFees: RebateInfoItem[];
};

const CLAIMABLE_COLLATERALS_QUERY = gql`
  query ClaimableCollaterals($account: String!, $limit: Int, $offset: Int) {
    claimableCollaterals(where: { account_eq: $account, claimed_eq: false }, limit: $limit, offset: $offset) {
      id
      marketAddress
      tokenAddress
      timeKey
      value
      factor
      reductionFactor
      factorByTime
    }
  }
`;

export function useRebatesInfoRequest(
  chainId: number,
  {
    enabled,
    positionsConstants,
  }: {
    enabled: boolean;
    positionsConstants: PositionsConstants | undefined;
  }
): RebatesInfoResult {
  const { account } = useWallet();
  const client = getSubsquidGraphClient(chainId);

  const key = enabled && chainId && client && account ? [chainId, "useRebatesInfo", account] : null;

  const { data } = useSWR<ClaimableCollateral[]>(key, {
    fetcher: async () => {
      const claimableCollaterals = await queryPaginated(
        async (limit, offset) =>
          client!
            .query<{
              claimableCollaterals: ClaimableCollateral[];
            }>({ query: CLAIMABLE_COLLATERALS_QUERY, variables: { account, limit, offset }, fetchPolicy: "no-cache" })
            .then((response) => response?.data?.claimableCollaterals ?? []) ?? []
      );

      return claimableCollaterals;
    },
  });

  const { accruedPositionPriceImpactFees, claimablePositionPriceImpactFees } = useMemo(() => {
    if (!positionsConstants) {
      return {
        accruedPositionPriceImpactFees: [],
        claimablePositionPriceImpactFees: [],
      };
    }

    const res: {
      accruedPositionPriceImpactFees: RebateInfoItem[];
      claimablePositionPriceImpactFees: RebateInfoItem[];
    } = { accruedPositionPriceImpactFees: [], claimablePositionPriceImpactFees: [] };

    data?.forEach((rawRebateInfo) => {
      const factorByTime = BigInt(rawRebateInfo.factorByTime);
      const reductionFactor = BigInt(rawRebateInfo.reductionFactor);
      const timeKey = BigInt(rawRebateInfo.timeKey);
      const value = BigInt(rawRebateInfo.value);

      let factor = BigInt(rawRebateInfo.factor);

      if (factorByTime > factor) {
        factor = factorByTime;
      }

      const timeDiff = BigInt(nowInSeconds()) - timeKey * positionsConstants.claimableCollateralTimeDivisor;

      if (factor === 0n && reductionFactor === 0n && timeDiff > positionsConstants.claimableCollateralDelay) {
        factor = PRECISION;
      }

      if (factor > reductionFactor) {
        factor -= reductionFactor;
      } else {
        factor = 0n;
      }

      let valueByFactor = (value * factor) / expandDecimals(1, 30);

      const rebateInfo: RebateInfoItem = {
        factor,
        value,
        valueByFactor,
        timeKey: rawRebateInfo.timeKey,
        marketAddress: getAddress(rawRebateInfo.marketAddress),
        tokenAddress: getAddress(rawRebateInfo.tokenAddress),
        reductionFactor,
        id: rawRebateInfo.id,
      };

      if (factor > 0 && valueByFactor == 0n) {
        // this is claimable entity but factor is too small
        // skipping to avoid CollateralAlreadyClaimed error
        return;
      }

      if (rebateInfo.factor == 0n) {
        res.accruedPositionPriceImpactFees.push(rebateInfo);
      } else {
        res.claimablePositionPriceImpactFees.push(rebateInfo);
      }
    });

    return res;
  }, [data, positionsConstants]);

  return {
    accruedPositionPriceImpactFees,
    claimablePositionPriceImpactFees,
  };
}
