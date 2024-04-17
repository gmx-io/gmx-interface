import { gql } from "@apollo/client";
import { BigNumber } from "ethers";
import { getAddress } from "ethers/lib/utils.js";
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
  factor: BigNumber;
  value: BigNumber;
  marketAddress: string;
  timeKey: string;
  tokenAddress: string;
  valueByFactor: BigNumber;
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
      let factor = BigNumber.from(rawRebateInfo.factor);
      const factorByTime = BigNumber.from(rawRebateInfo.factorByTime);

      if (factorByTime.gt(factor)) {
        factor = factorByTime;
      }

      const value = BigNumber.from(rawRebateInfo.value);
      const valueByFactor = value.mul(factor).div(expandDecimals(1, 30));

      const rebateInfo: RebateInfoItem = {
        factor,
        value,
        valueByFactor,
        timeKey: rawRebateInfo.timeKey,
        marketAddress: getAddress(rawRebateInfo.marketAddress),
        tokenAddress: getAddress(rawRebateInfo.tokenAddress),
        id: rawRebateInfo.id,
      };

      if (factor.gt(0) && valueByFactor.eq(0)) {
        // this is claimable entity but factor is too small
        // skipping to avoid CollateralAlreadyClaimed error
        return;
      }

      if (rebateInfo.factor.eq(0)) {
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
