import { BN } from '@coral-xyz/anchor';
import {
  Market as SdkMarket,
  type PnlFactorKind as SdkPnlFactorKind,
} from '@gmsol-labs/gmsol-sdk';

import { MarketStatus } from '@/selectors/market/types';
import { getGmw379Enabled } from '@/config/featureFlagEnable';

export interface MarinMarketPrices {
  indexTokenPrice: {
    min: BN;
    max: BN;
    decimals?: number;
  };
  longTokenPrice: {
    min: BN;
    max: BN;
    decimals?: number;
  };
  shortTokenPrice: {
    min: BN;
    max: BN;
    decimals?: number;
  };
}

export interface MarinMarketStatusParams {
  marketBase64: string;
  marketPrices: MarinMarketPrices;
  supply: BN | bigint | number | string;
  fundingFactorPerSecond?: BN | bigint | number | string | null;
}

export interface MarinMarketTokenPriceParams extends MarinMarketStatusParams {
  pnlFactor?: string;
  maximize: boolean;
}

const toBigInt = (value: BN | bigint | number | string) =>
  BigInt(value instanceof BN ? value.toString() : String(value));

const toBN = (value: bigint) => new BN(value.toString());

const toSdkPrice = (
  value: BN | bigint | number | string,
  decimals: number | undefined
) => {
  const price = toBigInt(value);
  if (!decimals) {
    return price;
  }
  return price / 10n ** BigInt(decimals);
};

const toSdkPrices = (prices: MarinMarketPrices) => ({
  index_token: {
    min: toSdkPrice(
      prices.indexTokenPrice.min,
      prices.indexTokenPrice.decimals
    ),
    max: toSdkPrice(
      prices.indexTokenPrice.max,
      prices.indexTokenPrice.decimals
    ),
  },
  long_token: {
    min: toSdkPrice(
      prices.longTokenPrice.min,
      prices.longTokenPrice.decimals
    ),
    max: toSdkPrice(
      prices.longTokenPrice.max,
      prices.longTokenPrice.decimals
    ),
  },
  short_token: {
    min: toSdkPrice(
      prices.shortTokenPrice.min,
      prices.shortTokenPrice.decimals
    ),
    max: toSdkPrice(
      prices.shortTokenPrice.max,
      prices.shortTokenPrice.decimals
    ),
  },
});

export function getMarinMarketStatus(
  params: MarinMarketStatusParams
): MarketStatus | null {
  const { marketBase64, marketPrices, supply, fundingFactorPerSecond } = params;

  if (!marketBase64) return null;
  if (getGmw379Enabled()) {
    if (
      supply == null ||
      String(supply) === '' ||
      fundingFactorPerSecond == null ||
      marketPrices.indexTokenPrice.decimals == null ||
      marketPrices.longTokenPrice.decimals == null ||
      marketPrices.shortTokenPrice.decimals == null
    ) {
      return null;
    }
  }

  try {
    const market = SdkMarket.decode_from_base64(marketBase64).to_model(
      toBigInt(supply)
    );
    const status = market.status({ prices: toSdkPrices(marketPrices) });

    return {
      fundingFactorPerSecond:
        fundingFactorPerSecond == null
          ? new BN(0)
          : new BN(toBigInt(fundingFactorPerSecond).toString()),
      borrowingFactorPerSecondForLong: toBN(
        status.borrowing_rate_per_second_for_long
      ),
      borrowingFactorPerSecondForShort: toBN(
        status.borrowing_rate_per_second_for_short
      ),
      pendingPnlForLong: toBN(status.pending_pnl_for_long.max),
      pendingPnlForShort: toBN(status.pending_pnl_for_short.max),
      reserveValueForLong: toBN(status.reserved_value_for_long),
      reserveValueForShort: toBN(status.reserved_value_for_short),
      poolValueWithoutPnlForLong: toBN(
        status.pool_value_without_pnl_for_long.max
      ),
      poolValueWithoutPnlForShort: toBN(
        status.pool_value_without_pnl_for_short.max
      ),
    };
  } catch (error) {
    console.warn('[market] local market status compute failed', error);
    return null;
  }
}

export function getMarinMarketTokenPrice(
  params: MarinMarketTokenPriceParams
): BN | null {
  const { marketBase64, marketPrices, supply, pnlFactor, maximize } = params;

  if (!marketBase64) return null;

  try {
    const market = SdkMarket.decode_from_base64(marketBase64).to_model(
      toBigInt(supply)
    );
    const price = market.market_token_price({
      prices: toSdkPrices(marketPrices),
      pnl_factor: pnlFactor as SdkPnlFactorKind | undefined,
      maximize,
    });
    return new BN(price.toString());
  } catch (error) {
    console.warn('[market] local market token price compute failed', error);
    return null;
  }
}
