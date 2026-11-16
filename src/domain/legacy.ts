import { useCallback, useMemo, useRef } from "react";
import useSWR from "swr";

import { getServerUrl } from "config/backend";
import { ARBITRUM, AVALANCHE } from "config/chains";
import { getContract } from "config/contracts";
import { useTokenRecentPricesRequest } from "domain/synthetics/tokens/useTokenRecentPricesData";
import { contractFetcher } from "lib/contracts";
import { BN_ZERO, toBigInt } from "lib/numbers";
import { getMidPrice } from "sdk/utils/tokens";

export * from "./prices";

// always the Arbitrum keeper, so every chain shows the price of the GMX/USD trade page
export function useGmxPrice() {
  const { pricesData } = useTokenRecentPricesRequest(ARBITRUM);
  const gmxPrices = pricesData?.[getContract(ARBITRUM, "GMX")];

  return { gmxPrice: gmxPrices ? getMidPrice(gmxPrices) : undefined };
}

// use only the supply endpoint on arbitrum, it includes the supply on avalanche
export function useTotalGmxSupply() {
  const gmxSupplyUrlArbitrum = getServerUrl(ARBITRUM, "/gmx_supply");

  const { data: gmxSupply, mutate: updateGmxSupply } = useSWR(gmxSupplyUrlArbitrum, {
    // @ts-ignore
    fetcher: (url) => fetch(url).then((res) => res.text()),
  });

  return {
    total: gmxSupply ? toBigInt(gmxSupply) : undefined,
    mutate: updateGmxSupply,
  };
}

export function useTotalGmxStaked() {
  const stakedGmxTrackerAddressArbitrum = getContract(ARBITRUM, "StakedGmxTracker");
  const stakedGmxTrackerAddressAvax = getContract(AVALANCHE, "StakedGmxTracker");
  let totalStakedGmx = useRef(BN_ZERO);
  const { data: stakedGmxSupplyArbitrum, mutate: updateStakedGmxSupplyArbitrum } = useSWR<bigint>(
    [
      `StakeV2:stakedGmxSupply:${ARBITRUM}`,
      ARBITRUM,
      getContract(ARBITRUM, "GMX"),
      "balanceOf",
      stakedGmxTrackerAddressArbitrum,
    ],
    {
      fetcher: contractFetcher(undefined, "Token") as any,
    }
  );
  const { data: stakedGmxSupplyAvax, mutate: updateStakedGmxSupplyAvax } = useSWR<bigint>(
    [
      `StakeV2:stakedGmxSupply:${AVALANCHE}`,
      AVALANCHE,
      getContract(AVALANCHE, "GMX"),
      "balanceOf",
      stakedGmxTrackerAddressAvax,
    ],
    {
      fetcher: contractFetcher(undefined, "Token") as any,
    }
  );

  const mutate = useCallback(() => {
    updateStakedGmxSupplyArbitrum();
    updateStakedGmxSupplyAvax();
  }, [updateStakedGmxSupplyArbitrum, updateStakedGmxSupplyAvax]);

  if (stakedGmxSupplyArbitrum != undefined && stakedGmxSupplyAvax != undefined) {
    let total = BigInt(stakedGmxSupplyArbitrum) + BigInt(stakedGmxSupplyAvax);
    totalStakedGmx.current = total;
  }

  return {
    [AVALANCHE]: stakedGmxSupplyAvax,
    [ARBITRUM]: stakedGmxSupplyArbitrum,
    total: totalStakedGmx.current,
    mutate,
  };
}

export function useTotalStakedGmxAndEsGmx() {
  const stakedGmxTrackerAddressArbitrum = getContract(ARBITRUM, "StakedGmxTracker");
  const stakedGmxTrackerAddressAvax = getContract(AVALANCHE, "StakedGmxTracker");

  const { data: stakedGmxSupplyArbitrum, mutate: updateStakedGmxSupplyArbitrum } = useSWR<bigint>(
    [
      `StakeV2:stakedGmxSupply:${ARBITRUM}`,
      ARBITRUM,
      getContract(ARBITRUM, "GMX"),
      "balanceOf",
      stakedGmxTrackerAddressArbitrum,
    ],
    {
      fetcher: contractFetcher(undefined, "Token") as any,
    }
  );
  const { data: stakedGmxSupplyAvax, mutate: updateStakedGmxSupplyAvax } = useSWR<bigint>(
    [
      `StakeV2:stakedGmxSupply:${AVALANCHE}`,
      AVALANCHE,
      getContract(AVALANCHE, "GMX"),
      "balanceOf",
      stakedGmxTrackerAddressAvax,
    ],
    {
      fetcher: contractFetcher(undefined, "Token") as any,
    }
  );
  const { data: stakedEsGmxSupplyArbitrum, mutate: updateStakedEsGmxSupplyArbitrum } = useSWR<bigint>(
    [
      `StakeV2:stakedEsGmxSupply:${ARBITRUM}`,
      ARBITRUM,
      getContract(ARBITRUM, "ES_GMX"),
      "balanceOf",
      stakedGmxTrackerAddressArbitrum,
    ],
    {
      fetcher: contractFetcher(undefined, "Token") as any,
    }
  );
  const { data: stakedEsGmxSupplyAvax, mutate: updateStakedEsGmxSupplyAvax } = useSWR<bigint>(
    [
      `StakeV2:stakedEsGmxSupply:${AVALANCHE}`,
      AVALANCHE,
      getContract(AVALANCHE, "ES_GMX"),
      "balanceOf",
      stakedGmxTrackerAddressAvax,
    ],
    {
      fetcher: contractFetcher(undefined, "Token") as any,
    }
  );

  const mutate = useCallback(() => {
    updateStakedGmxSupplyArbitrum();
    updateStakedGmxSupplyAvax();
    updateStakedEsGmxSupplyArbitrum();
    updateStakedEsGmxSupplyAvax();
  }, [
    updateStakedGmxSupplyArbitrum,
    updateStakedGmxSupplyAvax,
    updateStakedEsGmxSupplyArbitrum,
    updateStakedEsGmxSupplyAvax,
  ]);

  const total = useMemo(() => {
    if (
      stakedGmxSupplyArbitrum === undefined ||
      stakedGmxSupplyAvax === undefined ||
      stakedEsGmxSupplyArbitrum === undefined ||
      stakedEsGmxSupplyAvax === undefined
    ) {
      return undefined;
    }

    return (
      BigInt(stakedGmxSupplyArbitrum) +
      BigInt(stakedGmxSupplyAvax) +
      BigInt(stakedEsGmxSupplyArbitrum) +
      BigInt(stakedEsGmxSupplyAvax)
    );
  }, [stakedGmxSupplyArbitrum, stakedGmxSupplyAvax, stakedEsGmxSupplyArbitrum, stakedEsGmxSupplyAvax]);

  return {
    total,
    mutate,
  };
}

export function useTotalGmxInLiquidity() {
  let poolAddressArbitrum = getContract(ARBITRUM, "UniswapGmxEthPool");
  let poolAddressAvax = getContract(AVALANCHE, "TraderJoeGmxAvaxPool");
  let totalGMX = useRef(BN_ZERO);

  const { data: gmxInLiquidityOnArbitrum, mutate: mutateGMXInLiquidityOnArbitrum } = useSWR<any>(
    [`StakeV2:gmxInLiquidity:${ARBITRUM}`, ARBITRUM, getContract(ARBITRUM, "GMX"), "balanceOf", poolAddressArbitrum],
    {
      fetcher: contractFetcher(undefined, "Token"),
    }
  );
  const { data: gmxInLiquidityOnAvax, mutate: mutateGMXInLiquidityOnAvax } = useSWR<any>(
    [`StakeV2:gmxInLiquidity:${AVALANCHE}`, AVALANCHE, getContract(AVALANCHE, "GMX"), "balanceOf", poolAddressAvax],
    {
      fetcher: contractFetcher(undefined, "Token"),
    }
  );
  const mutate = useCallback(() => {
    mutateGMXInLiquidityOnArbitrum();
    mutateGMXInLiquidityOnAvax();
  }, [mutateGMXInLiquidityOnArbitrum, mutateGMXInLiquidityOnAvax]);

  if (gmxInLiquidityOnAvax && gmxInLiquidityOnArbitrum) {
    let total = toBigInt(gmxInLiquidityOnArbitrum)! + toBigInt(gmxInLiquidityOnAvax)!;
    totalGMX.current = total;
  }
  return {
    [AVALANCHE]: gmxInLiquidityOnAvax,
    [ARBITRUM]: gmxInLiquidityOnArbitrum,
    total: totalGMX.current,
    mutate,
  };
}
