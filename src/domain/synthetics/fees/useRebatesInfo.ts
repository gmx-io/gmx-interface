import { gql } from "@apollo/client";
import { getAddress } from "ethers";
import { expandDecimals } from "lib/numbers";
import { getSyntheticsGraphClient } from "lib/subgraph";
import useWallet from "lib/wallets/useWallet";
import { useMemo } from "react";
import useSWR from "swr";

type RawClaimableCollateral = {
  marketAddress: string;
  tokenAddress: string;
  timeKey: string;
  value: string;
  factor: string;
  factorByTime: string;
  id: string;
};

export type RebateInfoItem = {
  factor: bigint;
  value: bigint;
  marketAddress: string;
  timeKey: string;
  tokenAddress: string;
  valueByFactor: bigint;
  id: string;
};

export type RebatesInfoResult = {
  accruedPositionPriceImpactFees: RebateInfoItem[];
  claimablePositionPriceImpactFees: RebateInfoItem[];
};

export function useRebatesInfoRequest(chainId: number, enabled: boolean): RebatesInfoResult {
  const { account } = useWallet();
  const client = getSyntheticsGraphClient(chainId);

  const key = enabled && chainId && client && account ? [chainId, "useRebatesInfo", account] : null;

  const { data } = useSWR<RawClaimableCollateral[]>(key, {
    fetcher: async () => {
      const query = gql(`{
        claimableCollaterals(
          where: { account: "${account!.toLowerCase()}", claimed: false }
        ) {
          id
          marketAddress
          tokenAddress
          timeKey
          value
          factor
          factorByTime
        }
      }`);

      const { data } = await client!.query({ query, fetchPolicy: "no-cache" });

      return data.claimableCollaterals as RawClaimableCollateral[];
    },
  });

  const { accruedPositionPriceImpactFees, claimablePositionPriceImpactFees } = useMemo(() => {
    const res: {
      accruedPositionPriceImpactFees: RebateInfoItem[];
      claimablePositionPriceImpactFees: RebateInfoItem[];
    } = { accruedPositionPriceImpactFees: [], claimablePositionPriceImpactFees: [] };

    data?.forEach((rawRebateInfo) => {
      let factor = BigInt(rawRebateInfo.factor);
      const factorByTime = BigInt(rawRebateInfo.factorByTime);

      if (factorByTime > factor) {
        factor = factorByTime;
      }

      const value = BigInt(rawRebateInfo.value);
      const valueByFactor = (value * factor) / expandDecimals(1, 30);

      const rebateInfo: RebateInfoItem = {
        factor,
        value,
        valueByFactor,
        timeKey: rawRebateInfo.timeKey,
        marketAddress: getAddress(rawRebateInfo.marketAddress),
        tokenAddress: getAddress(rawRebateInfo.tokenAddress),
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
  }, [data]);

  return {
    accruedPositionPriceImpactFees,
    claimablePositionPriceImpactFees,
  };
}
