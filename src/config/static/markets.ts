/*
  This files is used to pre-build data during the build process.
  Avoid adding client-side code here, as it can break the build process.

  However, this files can be a dependency for the client code.
*/

import { parse } from "date-fns";

import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI } from "./chains";

import arbitrum from "config/source/marketsUi/arbitrum.json";
import avalanche from "config/source/marketsUi/avalanche.json";
import avalancheFuji from "config/source/marketsUi/avalanche_fuji.json";

const p = (date: string) => parse(date, "dd MMM yyyy", new Date());

export const DEFAULT_LISTING = p("01 Jan 1970");

import { MARKETS as SDK_MARKETS } from "sdk/configs/markets";

type MarketUiConfig = {
  enabled: boolean;
  listingDate: string;
};

/*
  ATTENTION
  When adding new markets, please add them also to the end of the list in ./sortedMarkets.ts
*/
const MARKETS_UI_CONFIGS: Record<number, Record<string, MarketUiConfig>> = {
  [ARBITRUM]: arbitrum,
  [AVALANCHE]: avalanche,
  [AVALANCHE_FUJI]: avalancheFuji,
};

export const MARKETS = Object.keys(MARKETS_UI_CONFIGS).reduce(
  (acc, network) => {
    return {
      ...acc,
      [network]: Object.keys(MARKETS_UI_CONFIGS[network]).reduce((acc, address) => {
        return {
          ...acc,
          [address]: {
            ...SDK_MARKETS[network][address],
            ...MARKETS_UI_CONFIGS[network][address],
            listingDate: p(MARKETS_UI_CONFIGS[network][address].listingDate),
          },
        };
      }, {}),
    };
  },
  {} as Record<
    number,
    Record<
      string,
      {
        longTokenAddress: string;
        shortTokenAddress: string;
        indexTokenAddress: string;
        marketTokenAddress: string;
        enabled: boolean;
        listingDate: Date;
      }
    >
  >
);
