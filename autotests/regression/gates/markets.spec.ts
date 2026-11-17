import { expect, test } from "@playwright/test";
import { erc20Abi, getAddress, type Address } from "viem";

import { getApiUrl } from "../../../sdk/src/configs/api";
import { MARKETS } from "../../../sdk/src/configs/markets";
import { getOracleKeeperUrl } from "../../../sdk/src/configs/oracleKeeper";
import { getTokensMap } from "../../../sdk/src/configs/tokens";
import { productionChains, publicClient } from "../fixtures/productionChains";

type ApiMarket = Record<string, string> & {
  marketTokenAddress: string;
  indexTokenAddress: string;
  longTokenAddress: string;
  shortTokenAddress: string;
  isDisabled: boolean;
  isSpotOnly: boolean;
};

const FACTOR = 10 ** 30;
const SECONDS_PER_YEAR = 365 * 24 * 60 * 60;
const factor = (market: ApiMarket, key: string) => Number(market[key]) / FACTOR;

async function json<T>(url: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  expect(response.status, url).toBe(200);
  return response.json() as Promise<T>;
}

async function enabledConfiguredMarkets(chainId: (typeof productionChains)[number]["id"]) {
  const apiMarkets = await json<ApiMarket[]>(`${getApiUrl(chainId)}/v1/markets/info`);
  const configured = new Set(Object.keys(MARKETS[chainId]));
  return apiMarkets.filter((market) => configured.has(market.marketTokenAddress) && !market.isDisabled);
}

for (const { name, id: chainId } of productionChains) {
  test(`23.19 ${name} every configured market is still served by the keeper and API`, async () => {
    const [api, keeper] = await Promise.all([
      json<ApiMarket[]>(`${getApiUrl(chainId)}/v1/markets/info`),
      json<{ markets: { marketToken: string }[] }>(`${getOracleKeeperUrl(chainId)}/markets`),
    ]);
    const served = new Set([
      ...api.map(({ marketTokenAddress }) => `api ${marketTokenAddress}`),
      ...keeper.markets.map(({ marketToken }) => `keeper ${marketToken}`),
    ]);
    const missing = Object.keys(MARKETS[chainId]).flatMap((address) =>
      ["api", "keeper"].map((source) => `${source} ${address}`).filter((key) => !served.has(key))
    );
    expect(missing).toEqual([]);
  });

  test(`23.01 ${name} configured market tokens are contracts with the configured decimals`, async ({}, testInfo) => {
    const tokens = getTokensMap(chainId);
    const addresses = new Set(
      (await enabledConfiguredMarkets(chainId)).flatMap((market) =>
        [market.indexTokenAddress, market.longTokenAddress, market.shortTokenAddress].filter(
          (address) => !market.isSpotOnly || address !== market.indexTokenAddress
        )
      )
    );
    const missing = [...addresses].filter((address) => !tokens[address]);
    expect(missing, "Market tokens missing from the token config").toEqual([]);
    const contracts = [...addresses].filter((address) => !tokens[address].isSynthetic) as Address[];
    const client = publicClient(chainId);
    const [codes, decimals] = await Promise.all([
      Promise.all(contracts.map((address) => client.getCode({ address }))),
      client.multicall({
        contracts: contracts.map((address) => ({ address, abi: erc20Abi, functionName: "decimals" }) as const),
      }),
    ]);
    const mismatches = contracts.flatMap((address, index) => {
      const onChain = decimals[index].status === "success" ? decimals[index].result : "unreadable";
      const hasCode = Boolean(codes[index] && codes[index] !== "0x");
      return hasCode && onChain === tokens[address].decimals
        ? []
        : [{ symbol: tokens[address].symbol, address, hasCode, onChain, configured: tokens[address].decimals }];
    });
    await testInfo.attach("checked-token-contracts", {
      body: JSON.stringify(contracts.map((address) => [tokens[address].symbol, address])),
      contentType: "application/json",
    });
    expect(contracts.length).toBeGreaterThan(0);
    expect(mismatches).toEqual([]);
  });

  test(`23.02 ${name} enabled markets have positive keeper prices with a sane spread`, async () => {
    const [markets, tickers] = await Promise.all([
      enabledConfiguredMarkets(chainId),
      json<{ tokenAddress: string; minPrice: string; maxPrice: string }[]>(
        `${getOracleKeeperUrl(chainId)}/prices/tickers`
      ),
    ]);
    const prices = new Map(tickers.map((ticker) => [getAddress(ticker.tokenAddress), ticker]));
    const problems = markets.flatMap((market) =>
      (["indexTokenAddress", "longTokenAddress", "shortTokenAddress"] as const)
        .filter((key) => !market.isSpotOnly || key !== "indexTokenAddress")
        .flatMap((key) => {
          const ticker = prices.get(getAddress(market[key]));
          const min = Number(ticker?.minPrice ?? 0);
          const max = Number(ticker?.maxPrice ?? 0);
          return min > 0 && max >= min && (max - min) / min <= 0.05
            ? []
            : [`${market.marketTokenAddress} ${key} ${market[key]} min=${ticker?.minPrice} max=${ticker?.maxPrice}`];
        })
    );
    expect(markets.length).toBeGreaterThan(0);
    expect(problems).toEqual([]);
  });

  test(`23.03 ${name} price impact factors are bounded and positive impact never exceeds negative`, async () => {
    const problems = (await enabledConfiguredMarkets(chainId)).flatMap((market) => {
      const checks: Record<string, boolean> = {
        "position impact positive <= negative":
          factor(market, "positionImpactFactorPositive") <= factor(market, "positionImpactFactorNegative"),
        "swap impact positive <= negative":
          factor(market, "swapImpactFactorPositive") <= factor(market, "swapImpactFactorNegative"),
        "max positive position impact <= 5%": factor(market, "maxPositionImpactFactorPositive") <= 0.05,
        "max negative position impact <= 50%": factor(market, "maxPositionImpactFactorNegative") <= 0.5,
      };
      return Object.entries(checks)
        .filter(([, passed]) => !passed)
        .map(([check]) => `${market.marketTokenAddress}: ${check}`);
    });
    expect(problems).toEqual([]);
  });

  test(`23.04 ${name} open interest and pool caps are set for every enabled market`, async () => {
    const problems = (await enabledConfiguredMarkets(chainId)).flatMap((market) =>
      [
        "maxLongPoolAmount",
        "maxShortPoolAmount",
        ...(market.isSpotOnly ? [] : ["maxOpenInterestLong", "maxOpenInterestShort"]),
      ]
        .filter((key) => !(BigInt(market[key]) > 0n))
        .map((key) => `${market.marketTokenAddress}: ${key}=${market[key]}`)
    );
    expect(problems).toEqual([]);
  });

  test(`23.05 ${name} borrowing, funding and fee factors are within bounds`, async () => {
    const problems = (await enabledConfiguredMarkets(chainId)).flatMap((market) => {
      const maxFunding = Math.max(
        factor(market, "maxFundingFactorPerSecondLong"),
        factor(market, "maxFundingFactorPerSecondShort")
      );
      const checks: Record<string, boolean> = {
        "borrowing APR for longs <= 1000%": factor(market, "borrowingFactorPerSecondForLongs") * SECONDS_PER_YEAR <= 10,
        "borrowing APR for shorts <= 1000%":
          factor(market, "borrowingFactorPerSecondForShorts") * SECONDS_PER_YEAR <= 10,
        "funding <= configured maximum": factor(market, "fundingFactorPerSecond") <= maxFunding * (1 + 1e-9),
        "swap fee <= 1%": factor(market, "swapFeeFactorForBalanceWasNotImproved") <= 0.01,
      };
      if (!market.isSpotOnly) {
        const improved = factor(market, "positionFeeFactorForBalanceWasImproved");
        const notImproved = factor(market, "positionFeeFactorForBalanceWasNotImproved");
        checks["position fee within 0.01%..0.2%"] = improved >= 0.0001 && notImproved <= 0.002;
        checks["improving balance never costs more"] = improved <= notImproved;
        checks["max leverage between 5x and 1000x"] =
          factor(market, "minCollateralFactor") >= 0.001 && factor(market, "minCollateralFactor") <= 0.2;
      }
      return Object.entries(checks)
        .filter(([, passed]) => !passed)
        .map(([check]) => `${market.marketTokenAddress}: ${check}`);
    });
    expect(problems).toEqual([]);
  });
}
