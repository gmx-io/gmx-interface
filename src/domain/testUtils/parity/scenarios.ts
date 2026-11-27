import {
  MAX_PNL_FACTOR_FOR_DEPOSITS_KEY,
  MAX_PNL_FACTOR_FOR_TRADERS_KEY,
  MAX_PNL_FACTOR_FOR_WITHDRAWALS_KEY,
  maxPnlFactorKey,
  uiFeeFactorKey,
} from "sdk/configs/dataStore";
import { MARKETS } from "sdk/configs/markets";
import { hashString } from "sdk/utils/hash";
import { PRECISION } from "sdk/utils/numbers";

import { chainId, ParityContext, readDataStoreUint, Scenario } from "./context";

const MAX_UI_FEE_FACTOR_KEY = hashString("MAX_UI_FEE_FACTOR");

const UI_FEE_FACTOR = PRECISION / 1000n;

export const UI_FEE_RECEIVER = "0x1111111111111111111111111111111111111111";

const UI_FEE_FACTOR_KEY = uiFeeFactorKey(UI_FEE_RECEIVER);

export const marketConfigs = Object.values(MARKETS[chainId]);

export const UI_FEE_SCENARIO: Scenario = {
  name: "0.1% ui fee",
  overrides: {
    uint: [
      [MAX_UI_FEE_FACTOR_KEY, UI_FEE_FACTOR],
      [UI_FEE_FACTOR_KEY, UI_FEE_FACTOR],
    ],
  },
};

// The deposit and withdrawal caps go down too: the contract keeps them at or below the traders cap
const PNL_CAP_KEYS = [
  MAX_PNL_FACTOR_FOR_TRADERS_KEY,
  MAX_PNL_FACTOR_FOR_DEPOSITS_KEY,
  MAX_PNL_FACTOR_FOR_WITHDRAWALS_KEY,
];

// every token at its mid price, so a known issue about the min or max price can't apply
export const MID_PRICES_SCENARIO: Scenario = {
  name: "mid prices",
  tickers: (tickers) =>
    tickers.map((ticker) => {
      const midPrice = String((BigInt(ticker.minPrice) + BigInt(ticker.maxPrice)) / 2n);

      return { ...ticker, minPrice: midPrice, maxPrice: midPrice };
    }),
};

export const TRADER_PNL_CAP_SCENARIO: Scenario = {
  name: "trader pnl capped at 1% of the pool",
  overrides: {
    uint: marketConfigs.flatMap(({ marketTokenAddress }) =>
      PNL_CAP_KEYS.flatMap((pnlFactorType) =>
        [true, false].map((isLong): [string, bigint] => [
          maxPnlFactorKey(pnlFactorType, marketTokenAddress, isLong),
          PRECISION / 100n,
        ])
      )
    ),
  },
};

const uiFeeFactorByContext = new WeakMap<ParityContext, Promise<bigint>>();

/** What useUiFeeFactorRequest reads for UI_FEE_RECEIVER */
export function loadUiFeeFactor(ctx: ParityContext): Promise<bigint> {
  if (!uiFeeFactorByContext.has(ctx)) {
    uiFeeFactorByContext.set(ctx, readDataStoreUint(ctx, UI_FEE_FACTOR_KEY));
  }

  return uiFeeFactorByContext.get(ctx)!;
}
