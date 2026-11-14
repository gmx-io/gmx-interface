import { ARBITRUM } from "config/chains";
import { getGmsolToken } from "config/gmsol/tokenLookup";
import { GMSOL_NATIVE_TOKEN, GMSOL_TOKENS } from "config/gmsol/tokens";
import { type PriceDelta, getPriceDelta } from "domain/synthetics/tokens/priceDelta";
import type { DayPriceCandle, TickersResponse } from "lib/oracleKeeperFetcher";
import { getNormalizedTokenSymbol, getToken } from "sdk/configs/tokens";
import { bigMath } from "sdk/utils/bigmath";
import { GMSOL_PRECISION_SCALE } from "sdk/utils/gmsol";
import { expandDecimals } from "sdk/utils/numbers";
import { parseContractPrice } from "sdk/utils/tokens";
import type { Token, TokenPrices } from "sdk/utils/tokens/types";

export type GmsolPriceDeltaMap = Partial<Record<string, PriceDelta>>;
// updatedAt is the keeper's time for the ticker, in ms.
export type GmsolTokenPricesData = { [address: string]: TokenPrices & { updatedAt: number } };

const ARBITRUM_TOKEN_ADDRESS_BY_GMSOL_ADDRESS = new Map<string, string>(
  [GMSOL_NATIVE_TOKEN, ...GMSOL_TOKENS].map((token) => [token.address, token.arbitrumTokenAddress])
);

function getArbitrumToken(gmsolTokenAddress: string): Token | undefined {
  const arbitrumTokenAddress = ARBITRUM_TOKEN_ADDRESS_BY_GMSOL_ADDRESS.get(gmsolTokenAddress);

  return arbitrumTokenAddress ? getToken(ARBITRUM, arbitrumTokenAddress) : undefined;
}

export function buildGmsolTokenPrices(
  tickers: TickersResponse,
  gmsolTokenAddresses: readonly string[]
): GmsolTokenPricesData {
  const tickersByAddress = new Map(tickers.map((ticker) => [ticker.tokenAddress.toLowerCase(), ticker]));
  const result: GmsolTokenPricesData = {};

  for (const address of gmsolTokenAddresses) {
    const gmsolToken = getGmsolToken(address);
    const arbitrumToken = getArbitrumToken(address);
    const ticker = arbitrumToken ? tickersByAddress.get(arbitrumToken.address.toLowerCase()) : undefined;

    if (gmsolToken && arbitrumToken && ticker) {
      const scale = expandDecimals(1, gmsolToken.decimals) * GMSOL_PRECISION_SCALE;
      result[address] = {
        minPrice:
          bigMath.mulDiv(parseContractPrice(BigInt(ticker.minPrice), arbitrumToken.decimals), 1n, scale) * scale,
        maxPrice:
          bigMath.mulDiv(parseContractPrice(BigInt(ticker.maxPrice), arbitrumToken.decimals), 1n, scale) * scale,
        updatedAt: ticker.updatedAt,
      };
    }
  }

  return result;
}

export function getGmsolOracleSymbol(gmsolTokenAddress: string): string {
  const arbitrumToken = getArbitrumToken(gmsolTokenAddress);

  if (!arbitrumToken) {
    throw new Error(`No Arbitrum token for Solana token ${gmsolTokenAddress}`);
  }

  return getNormalizedTokenSymbol(arbitrumToken.symbol);
}

export function buildGmsolPriceDeltas(
  candles: readonly DayPriceCandle[],
  gmsolTokenAddresses: readonly string[]
): GmsolPriceDeltaMap {
  const result: GmsolPriceDeltaMap = {};

  for (const address of gmsolTokenAddresses) {
    const arbitrumToken = getArbitrumToken(address);
    const delta = arbitrumToken ? getPriceDelta(candles, arbitrumToken.symbol) : undefined;

    if (delta) {
      result[address] = delta;
    }
  }

  return result;
}
