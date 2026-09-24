export const SWAP_GRAPH_MAX_MARKETS_PER_TOKEN = 5;
export const ENOUGH_DAYS_SINCE_LISTING_FOR_APY = 8;

export const GLV_MARKETS: Record<
  string,
  {
    name: string | undefined;
    subtitle: string;
    shortening: string;
  }
> = {
  '7r3XADNMW12k8QiLPaFjW1giYMJNZzUjmDA5HiK7hAPu': {
    name: undefined,
    subtitle: 'Global Liquidity Vault',
    shortening: 'GLV',
  },
};

// Mocked data for markets

import { parse } from 'date-fns';

type MarketUiConfig = {
  enabled: boolean;
  listingDate: Date;
};

const p = (date: string) => parse(date, 'dd MMM yyyy', new Date());

export const DEFAULT_LISTING = p('01 Jan 1970');

const MARKETS_UI_CONFIGS: Record<string, MarketUiConfig> = {
  // BTC/USD [WBTC.e-USDC]
  '0x47c031236e19d024b42f8AE6780E44A573170703': {
    enabled: true,
    listingDate: DEFAULT_LISTING,
  },
};

export const MARKETS = Object.keys(MARKETS_UI_CONFIGS).reduce(
  (acc, address) => {
    return {
      ...acc,
      [address]: {
        ...MARKETS_UI_CONFIGS[address],
      },
    };
  },
  {} as Record<string, MarketUiConfig>
);
