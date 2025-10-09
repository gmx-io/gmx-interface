import { Token as UniToken } from "@uniswap/sdk-core";
import { Pool, Position } from "@uniswap/v3-sdk";
import JSBI from "jsbi";
import { useMemo } from "react";

import type { TokenPricesData } from "domain/synthetics/tokens";
import { MulticallRequestConfig, useMulticall } from "lib/multicall";
import type { ContractCallResult } from "lib/multicall";
import type { ContractsChainId } from "sdk/configs/chains";
import { getUniswapV3Deployment } from "sdk/configs/uniswapV3";
import type { Token } from "sdk/types/tokens";
import { convertToUsd, getMidPrice } from "sdk/utils/tokens";

import { TREASURY_EMPTY_RESULT } from "./constants";
import type { TreasuryBalanceAsset, TreasuryData } from "./types";

const MAX_POSITIONS_PER_OWNER = 200;
const MAX_TOTAL_POSITIONS = 800;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

type TreasuryMulticallRequest = MulticallRequestConfig<Record<string, { calls: Record<string, unknown> }>>;

type MulticallContractResults = Record<string, ContractCallResult | undefined>;
type MulticallResponse = Record<string, MulticallContractResults | undefined>;

type OwnerPositionSlot = {
  address: string;
  count: number;
};

type PositionData = {
  tokenId: bigint;
  token0: string;
  token1: string;
  fee: number;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  tokensOwed0: bigint;
  tokensOwed1: bigint;
};

type PoolDescriptor = {
  key: string;
  token0: string;
  token1: string;
  fee: number;
};

type PoolSlot0State = {
  sqrtPriceX96: bigint;
  tick: number;
  liquidity: bigint;
};

export function useTreasuryUniswapV3({
  chainId,
  addresses,
  tokenMap,
  pricesData,
}: {
  chainId: ContractsChainId;
  addresses: string[];
  tokenMap: Record<string, Token>;
  pricesData?: TokenPricesData;
}): TreasuryData | undefined {
  const deployment = getUniswapV3Deployment(chainId);

  const balancesRequest = useMemo(() => {
    if (!deployment || !addresses.length) {
      return undefined;
    }

    return buildBalancesRequest(deployment.positionManager, addresses);
  }, [addresses, deployment]);

  const { data: balancesResponse } = useMulticall<TreasuryMulticallRequest, MulticallResponse>(
    chainId,
    "useTreasuryUniswapV3Balances",
    {
      key: balancesRequest ? [chainId, "uniswapV3", "balances", addresses.length] : null,
      request: balancesRequest ?? {},
      parseResponse: (res) => res.data,
    }
  );

  const ownerSlots = useMemo(() => {
    if (!deployment || !balancesRequest || !balancesResponse?.positionManager) {
      return undefined;
    }

    const slots: OwnerPositionSlot[] = [];
    let remaining = MAX_TOTAL_POSITIONS;

    for (let index = 0; index < addresses.length; index++) {
      if (remaining <= 0) {
        slots.push({ address: addresses[index], count: 0 });
        continue;
      }

      const rawValue = balancesResponse.positionManager[`balance_${index}`]?.returnValues?.[0];

      const balance = rawValue === undefined || rawValue === null ? 0n : BigInt(rawValue);
      const asNumber = balance > BigInt(MAX_POSITIONS_PER_OWNER) ? MAX_POSITIONS_PER_OWNER : Number(balance);
      const allowed = Math.min(asNumber, remaining);

      slots.push({ address: addresses[index], count: allowed });
      remaining -= allowed;
    }

    return slots;
  }, [addresses, balancesRequest, balancesResponse, deployment]);

  const tokenIdsRequest = useMemo(() => {
    if (!deployment || !ownerSlots) {
      return undefined;
    }

    const calls: Record<string, { methodName: string; params: [string, number] }> = {};

    ownerSlots.forEach((slot, ownerIndex) => {
      for (let positionIndex = 0; positionIndex < slot.count; positionIndex++) {
        calls[`token_${ownerIndex}_${positionIndex}`] = {
          methodName: "tokenOfOwnerByIndex",
          params: [slot.address, positionIndex],
        };
      }
    });

    if (!Object.keys(calls).length) {
      return undefined;
    }

    return {
      positionManager: {
        contractAddress: deployment.positionManager,
        abiId: "UniswapV3PositionManager",
        calls,
      },
    } satisfies TreasuryMulticallRequest;
  }, [deployment, ownerSlots]);

  const { data: tokenIdsResponse } = useMulticall<TreasuryMulticallRequest, MulticallResponse>(
    chainId,
    "useTreasuryUniswapV3TokenIds",
    {
      key: tokenIdsRequest ? [chainId, "uniswapV3", "tokenIds", addresses.length] : null,
      request: tokenIdsRequest ?? {},
      parseResponse: (res) => res.data,
    }
  );

  const tokenIds = useMemo(() => {
    const ids: bigint[] = [];

    if (!ownerSlots || !tokenIdsRequest || !tokenIdsResponse?.positionManager) {
      return ids;
    }

    const positionManagerResponse = tokenIdsResponse.positionManager!;

    ownerSlots.forEach((slot, ownerIndex) => {
      for (let positionIndex = 0; positionIndex < slot.count; positionIndex++) {
        const rawValue = positionManagerResponse[`token_${ownerIndex}_${positionIndex}`]?.returnValues?.[0];

        if (rawValue === undefined || rawValue === null) {
          continue;
        }

        ids.push(BigInt(rawValue));
      }
    });

    return ids;
  }, [ownerSlots, tokenIdsRequest, tokenIdsResponse]);

  const positionsRequest = useMemo(() => {
    if (!deployment || !tokenIds.length) {
      return undefined;
    }

    const calls = tokenIds.reduce<Record<string, { methodName: string; params: [bigint] }>>((acc, tokenId) => {
      acc[`position_${tokenId.toString()}`] = {
        methodName: "positions",
        params: [tokenId],
      };

      return acc;
    }, {});

    if (!Object.keys(calls).length) {
      return undefined;
    }

    return {
      positionManager: {
        contractAddress: deployment.positionManager,
        abiId: "UniswapV3PositionManager",
        calls,
      },
    } satisfies TreasuryMulticallRequest;
  }, [deployment, tokenIds]);

  const { data: positionsResponse } = useMulticall<TreasuryMulticallRequest, MulticallResponse>(
    chainId,
    "useTreasuryUniswapV3Positions",
    {
      key: positionsRequest ? [chainId, "uniswapV3", "positions", tokenIds.length] : null,
      request: positionsRequest ?? {},
      parseResponse: (res) => res.data,
    }
  );

  const positions = useMemo(() => {
    const parsed: PositionData[] = [];

    if (!positionsRequest || !positionsResponse?.positionManager) {
      return parsed;
    }

    const positionManagerResponse = positionsResponse.positionManager!;

    tokenIds.forEach((tokenId) => {
      const callResult = positionManagerResponse[`position_${tokenId.toString()}`];
      const values = callResult?.returnValues as (string | number | bigint | undefined)[] | undefined;

      if (!values || values.length < 11) {
        return;
      }

      const token0 = values[2] as string | undefined;
      const token1 = values[3] as string | undefined;

      if (!token0 || !token1 || token0 === ZERO_ADDRESS || token1 === ZERO_ADDRESS) {
        return;
      }

      const feeRaw = values[4];
      const tickLowerRaw = values[5];
      const tickUpperRaw = values[6];
      const liquidityRaw = values[7];
      const tokensOwed0Raw = values[10];
      const tokensOwed1Raw = values[11];

      if (liquidityRaw === undefined || liquidityRaw === null) {
        return;
      }

      const fee = Number(feeRaw);
      const tickLower = Number(tickLowerRaw);
      const tickUpper = Number(tickUpperRaw);
      const liquidity = BigInt(liquidityRaw);
      const tokensOwed0 = tokensOwed0Raw === undefined ? 0n : BigInt(tokensOwed0Raw);
      const tokensOwed1 = tokensOwed1Raw === undefined ? 0n : BigInt(tokensOwed1Raw);

      if (Number.isNaN(fee) || Number.isNaN(tickLower) || Number.isNaN(tickUpper)) {
        return;
      }

      parsed.push({
        tokenId,
        token0: token0,
        token1: token1,
        fee,
        tickLower,
        tickUpper,
        liquidity,
        tokensOwed0,
        tokensOwed1,
      });
    });

    return parsed;
  }, [positionsRequest, positionsResponse, tokenIds]);

  const uniquePools = useMemo(() => {
    const map = new Map<string, PoolDescriptor>();

    positions.forEach((position) => {
      const key = buildPoolKey(position.token0, position.token1, position.fee);

      if (!map.has(key)) {
        map.set(key, {
          key,
          token0: position.token0,
          token1: position.token1,
          fee: position.fee,
        });
      }
    });

    return Array.from(map.values());
  }, [positions]);

  const poolsRequest = useMemo(() => {
    if (!deployment || !uniquePools.length) {
      return undefined;
    }

    const calls = uniquePools.reduce<Record<string, { methodName: string; params: [string, string, number] }>>(
      (acc, pool) => {
        acc[`pool_${pool.key}`] = {
          methodName: "getPool",
          params: [pool.token0, pool.token1, pool.fee],
        };

        return acc;
      },
      {}
    );

    return {
      factory: {
        contractAddress: deployment.factory,
        abiId: "UniswapV3Factory",
        calls,
      },
    } satisfies TreasuryMulticallRequest;
  }, [deployment, uniquePools]);

  const { data: poolsResponse } = useMulticall<TreasuryMulticallRequest, MulticallResponse>(
    chainId,
    "useTreasuryUniswapV3Pools",
    {
      key: poolsRequest ? [chainId, "uniswapV3", "pools", uniquePools.length] : null,
      request: poolsRequest ?? {},
      parseResponse: (res) => res.data,
    }
  );

  const poolAddressMap = useMemo(() => {
    if (!poolsRequest || !poolsResponse?.factory) {
      return new Map<string, string>();
    }

    const map = new Map<string, string>();
    const factoryResponse = poolsResponse.factory!;

    uniquePools.forEach((pool) => {
      const call = factoryResponse[`pool_${pool.key}`];
      const address = call?.returnValues?.[0];

      if (typeof address === "string" && address !== ZERO_ADDRESS) {
        map.set(pool.key, address);
      }
    });

    return map;
  }, [poolsRequest, poolsResponse, uniquePools]);

  const poolSlot0Request = useMemo(() => {
    if (!poolAddressMap.size) {
      return undefined;
    }

    const request: TreasuryMulticallRequest = {};

    for (const [key, address] of poolAddressMap.entries()) {
      request[key] = {
        contractAddress: address,
        abiId: "UniswapV3Pool",
        calls: {
          slot0: {
            methodName: "slot0",
            params: [],
          },
          liquidity: {
            methodName: "liquidity",
            params: [],
          },
        },
      };
    }

    return request;
  }, [poolAddressMap]);

  const { data: poolSlot0Response } = useMulticall<TreasuryMulticallRequest, MulticallResponse>(
    chainId,
    "useTreasuryUniswapV3Slot0",
    {
      key: poolSlot0Request ? [chainId, "uniswapV3", "slot0", poolAddressMap.size] : null,
      request: poolSlot0Request ?? {},
      parseResponse: (res) => res.data,
    }
  );

  const poolStates = useMemo(() => {
    if (!poolSlot0Request || !poolSlot0Response) {
      return new Map<string, PoolSlot0State>();
    }

    const map = new Map<string, PoolSlot0State>();

    Object.keys(poolSlot0Request).forEach((key) => {
      const slot0Call = poolSlot0Response[key]?.slot0;
      const slot0Values = (slot0Call?.returnValues as (bigint | number | string | undefined)[] | undefined) ?? [];
      const sqrtPriceRaw = slot0Values[0];
      const tickRaw = slot0Values[1];
      const liquidityCall = poolSlot0Response[key]?.liquidity;
      const liquidityRaw = liquidityCall?.returnValues?.[0];

      if (sqrtPriceRaw === undefined || sqrtPriceRaw === null || tickRaw === undefined || liquidityRaw === undefined) {
        return;
      }

      const tick = Number(tickRaw);

      if (Number.isNaN(tick)) {
        return;
      }

      map.set(key, {
        sqrtPriceX96: BigInt(sqrtPriceRaw),
        tick,
        liquidity: BigInt(liquidityRaw),
      });
    });

    return map;
  }, [poolSlot0Request, poolSlot0Response]);

  return useMemo(() => {
    if (
      (balancesRequest && balancesResponse === undefined) ||
      (tokenIdsRequest && tokenIdsResponse === undefined) ||
      (positionsRequest && positionsResponse === undefined) ||
      (poolsRequest && poolsResponse === undefined) ||
      (poolSlot0Request && poolSlot0Response === undefined)
    ) {
      return undefined;
    }

    if (!deployment || !positions.length || !poolStates.size) {
      return TREASURY_EMPTY_RESULT;
    }

    const tokenBalances = new Map<string, bigint>();

    positions.forEach((position) => {
      const poolKey = buildPoolKey(position.token0, position.token1, position.fee);
      const state = poolStates.get(poolKey);

      if (!state) {
        return;
      }

      const token0Config = tokenMap[position.token0];
      const token1Config = tokenMap[position.token1];

      if (!token0Config || !token1Config) {
        return;
      }

      try {
        const token0 = new UniToken(
          chainId,
          token0Config.address,
          token0Config.decimals,
          token0Config.symbol,
          token0Config.name
        );
        const token1 = new UniToken(
          chainId,
          token1Config.address,
          token1Config.decimals,
          token1Config.symbol,
          token1Config.name
        );

        const pool = new Pool(
          token0,
          token1,
          position.fee,
          JSBI.BigInt(state.sqrtPriceX96.toString()),
          JSBI.BigInt(state.liquidity.toString()),
          state.tick
        );

        const sdkPosition = new Position({
          pool,
          liquidity: JSBI.BigInt(position.liquidity.toString()),
          tickLower: position.tickLower,
          tickUpper: position.tickUpper,
        });

        const amount0 = BigInt(sdkPosition.amount0.quotient.toString());
        const amount1 = BigInt(sdkPosition.amount1.quotient.toString());

        const totalAmount0 = amount0 + position.tokensOwed0;
        const totalAmount1 = amount1 + position.tokensOwed1;

        if (totalAmount0 > 0n) {
          const previous = tokenBalances.get(position.token0) ?? 0n;
          tokenBalances.set(position.token0, previous + totalAmount0);
        }

        if (totalAmount1 > 0n) {
          const previous = tokenBalances.get(position.token1) ?? 0n;
          tokenBalances.set(position.token1, previous + totalAmount1);
        }
      } catch (e) {
        // Ignore SDK errors for malformed pools or unsupported tokens
      }
    });

    if (!tokenBalances.size) {
      return TREASURY_EMPTY_RESULT;
    }

    const assets: TreasuryBalanceAsset[] = [];
    let totalUsd = 0n;

    for (const [tokenAddress, balance] of tokenBalances.entries()) {
      const tokenConfig = tokenMap[tokenAddress];
      const decimals = tokenConfig?.decimals;
      const priceKey = tokenConfig?.address ?? tokenAddress;

      let usdValue = 0n;

      if (decimals !== undefined && pricesData?.[priceKey]) {
        const price = getMidPrice(pricesData[priceKey]);
        const usd = convertToUsd(balance, decimals, price);

        if (typeof usd === "bigint") {
          usdValue = usd;
          totalUsd += usd;
        }
      }

      assets.push({
        address: tokenConfig?.address ?? tokenAddress,
        type: "uniswapV3",
        balance,
        usdValue,
        chainId,
        token: tokenConfig,
        decimals,
      });
    }

    return { assets, totalUsd };
  }, [
    balancesRequest,
    balancesResponse,
    chainId,
    deployment,
    tokenMap,
    poolSlot0Request,
    poolSlot0Response,
    poolStates,
    poolsRequest,
    poolsResponse,
    positions,
    positionsRequest,
    positionsResponse,
    pricesData,
    tokenIdsRequest,
    tokenIdsResponse,
  ]);
}

function buildBalancesRequest(positionManager: string, owners: string[]): TreasuryMulticallRequest {
  return {
    positionManager: {
      contractAddress: positionManager,
      abiId: "UniswapV3PositionManager",
      calls: owners.reduce<Record<string, { methodName: string; params: [string] }>>((acc, owner, index) => {
        acc[`balance_${index}`] = {
          methodName: "balanceOf",
          params: [owner],
        };

        return acc;
      }, {}),
    },
  } satisfies TreasuryMulticallRequest;
}

function buildPoolKey(token0: string, token1: string, fee: number) {
  return `${token0}-${token1}-${fee}`;
}
