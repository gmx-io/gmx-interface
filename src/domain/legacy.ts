import { Token as UniToken } from "@uniswap/sdk-core";
import { Pool } from "@uniswap/v3-sdk";
import { useCallback, useMemo, useRef } from "react";
import useSWR from "swr";

import { getServerUrl } from "config/backend";
import { ARBITRUM, AVALANCHE, ContractsChainId } from "config/chains";
import { getContract } from "config/contracts";
import { contractFetcher } from "lib/contracts";
import { BN_ZERO, expandDecimals, parseValue, toBigInt } from "lib/numbers";
import type { WalletSigner } from "lib/wallets";
import { getTokenBySymbol } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";

export * from "./prices";

export function useGmxPrice(
  chainId: ContractsChainId,
  libraries: { arbitrum?: WalletSigner | undefined },
  active: boolean,
  options: { enabled?: boolean; fetchAllChains?: boolean } = {}
) {
  const { enabled = true, fetchAllChains = true } = options;
  const arbitrumLibrary = libraries && libraries.arbitrum ? libraries.arbitrum : undefined;
  const { data: gmxPriceFromArbitrum, mutate: mutateFromArbitrum } = useGmxPriceFromArbitrum(
    arbitrumLibrary,
    active,
    enabled && (fetchAllChains || chainId === ARBITRUM)
  );
  const { data: gmxPriceFromAvalanche, mutate: mutateFromAvalanche } = useGmxPriceFromAvalanche(
    enabled && (fetchAllChains || chainId === AVALANCHE)
  );

  const gmxPrice: bigint | undefined = chainId === ARBITRUM ? gmxPriceFromArbitrum : gmxPriceFromAvalanche;
  const mutate = useCallback(() => {
    mutateFromAvalanche();
    mutateFromArbitrum();
  }, [mutateFromAvalanche, mutateFromArbitrum]);

  return {
    gmxPrice,
    gmxPriceFromArbitrum,
    gmxPriceFromAvalanche,
    mutate,
  };
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

function useGmxPriceFromAvalanche(enabled: boolean) {
  const poolAddress = getContract(AVALANCHE, "TraderJoeGmxAvaxPool");

  const { data, mutate: updateReserves } = useSWR(
    enabled ? ["TraderJoeGmxAvaxReserves", AVALANCHE, poolAddress, "getReserves"] : null,
    {
      fetcher: contractFetcher(undefined, "UniswapV2"),
    }
  );
  const { _reserve0: gmxReserve, _reserve1: avaxReserve }: any = data || {};

  const vaultAddress = getContract(AVALANCHE, "Vault");
  const avaxAddress = getTokenBySymbol(AVALANCHE, "WAVAX").address;
  const { data: avaxPrice, mutate: updateAvaxPrice } = useSWR(
    enabled ? [`StakeV2:avaxPrice`, AVALANCHE, vaultAddress, "getMinPrice", avaxAddress] : null,
    {
      fetcher: contractFetcher(undefined, "Vault"),
    }
  );

  const PRECISION = 10n ** 18n;
  let gmxPrice: bigint | undefined;
  if (avaxReserve && gmxReserve && avaxPrice) {
    gmxPrice = bigMath.mulDiv(bigMath.mulDiv(avaxReserve, PRECISION, gmxReserve), avaxPrice, PRECISION);
  }

  const mutate = useCallback(() => {
    updateReserves();
    updateAvaxPrice();
  }, [updateReserves, updateAvaxPrice]);

  return { data: gmxPrice, mutate };
}

function useGmxPriceFromArbitrum(signer: WalletSigner | undefined, active: boolean, enabled: boolean) {
  const poolAddress = getContract(ARBITRUM, "UniswapGmxEthPool");
  const { data: uniPoolSlot0, mutate: updateUniPoolSlot0 } = useSWR<any>(
    enabled ? [`StakeV2:uniPoolSlot0:${active}`, ARBITRUM, poolAddress, "slot0"] : null,
    {
      fetcher: contractFetcher(signer, "UniPool"),
    }
  );

  const vaultAddress = getContract(ARBITRUM, "Vault");
  const ethAddress = getTokenBySymbol(ARBITRUM, "WETH").address;
  const { data: ethPrice, mutate: updateEthPrice } = useSWR<bigint>(
    enabled ? [`StakeV2:ethPrice:${active}`, ARBITRUM, vaultAddress, "getMinPrice", ethAddress] : null,
    {
      fetcher: contractFetcher(signer, "Vault") as any,
    }
  );

  const gmxPrice = useMemo(() => {
    if (uniPoolSlot0 != undefined && ethPrice != undefined) {
      const tokenA = new UniToken(ARBITRUM, ethAddress, 18, "SYMBOL", "NAME");

      const gmxAddress = getContract(ARBITRUM, "GMX");
      const tokenB = new UniToken(ARBITRUM, gmxAddress, 18, "SYMBOL", "NAME");

      const pool = new Pool(
        tokenA, // tokenA
        tokenB, // tokenB
        10000, // fee
        uniPoolSlot0.sqrtPriceX96.toString(), // sqrtRatioX96
        1, // liquidity
        Number(uniPoolSlot0.tick), // tickCurrent
        []
      );

      const poolTokenPrice = pool.priceOf(tokenB).toSignificant(6);
      const poolTokenPriceAmount = parseValue(poolTokenPrice, 18);
      return poolTokenPriceAmount === undefined
        ? undefined
        : bigMath.mulDiv(poolTokenPriceAmount, ethPrice, expandDecimals(1, 18));
    }
  }, [ethPrice, uniPoolSlot0, ethAddress]);

  const mutate = useCallback(() => {
    updateUniPoolSlot0();
    updateEthPrice();
  }, [updateEthPrice, updateUniPoolSlot0]);

  return { data: gmxPrice, mutate };
}
