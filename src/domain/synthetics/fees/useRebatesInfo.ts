import { gql } from "@apollo/client";
import { getAddress } from "ethers";
import { useMemo } from "react";
import useSWR from "swr";

import { expandDecimals, PRECISION } from "lib/numbers";
import { getSubsquidGraphClient } from "lib/subgraph";
import useWallet from "lib/wallets/useWallet";
import { nowInSeconds } from "sdk/utils/time";

import { PositionsConstants } from "../positions/usePositionsConstants";

type RawClaimableCollateral = {
  marketAddress: string;
  tokenAddress: string;
  timeKey: string;
  value: string;
  factor: string;
  factorByTime: string;
  reductionFactor: string;
  id: string;
};

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

  const { data } = useSWR<RawClaimableCollateral[]>(key, {
    fetcher: async () => {
      const query = gql(`{
        claimableCollaterals(
          where: { account_eq: "${account}", claimed_eq: false }
        ) {
          id
          marketAddress
          tokenAddress
          timeKey
          value
          factor
          reductionFactor
          factorByTime
        }
      }`);

      const { data } = await client!.query({ query, fetchPolicy: "no-cache" });

      return data.claimableCollaterals as RawClaimableCollateral[];
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

      // factorByTime > factorByAccount
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
