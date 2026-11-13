import type { NetworkId } from "config/chains";
import { getSyntheticsTradeOptionsKey } from "config/localStorage";
import { TradeMode, TradeType } from "sdk/utils/trade/types";

import type { UserSelectedMarkets } from "../markets/chooseSuitableMarket";

export type TradeboxAdvancedOptions = {
  advancedDisplay: boolean;
  limitOrTPSL: boolean;
};

export type StoredTradeOptions = {
  tradeType: TradeType;
  tradeMode: TradeMode;
  tokens: {
    fromTokenAddress?: string;
    swapToTokenAddress?: string;
    indexTokenAddress?: string;
  };
  markets: {
    [indexTokenAddress: string]: {
      long: string;
      short: string;
    };
  };
  userSelectedMarkets?: {
    [indexTokenAddress: string]: UserSelectedMarkets;
  };
  collaterals?: {
    [marketAddress: string]: {
      long?: string;
      short?: string;
    };
  };
  advanced?: TradeboxAdvancedOptions;
  isFromTokenGmxAccount: boolean;
};

export const INITIAL_SYNTHETICS_TRADE_OPTIONS_STATE: StoredTradeOptions = {
  tradeType: TradeType.Long,
  tradeMode: TradeMode.Market,
  tokens: {},
  markets: {},
  collaterals: {},
  advanced: {
    advancedDisplay: false,
    limitOrTPSL: false,
  },
  isFromTokenGmxAccount: false,
};

export type TradeboxSyncMarket = {
  indexTokenAddress: string;
  marketTokenAddress: string;
  shortTokenAddress: string;
};

export type StoredTradeOptionsSyncResult =
  | { action: "noop" }
  | { action: "wait" }
  | { action: "markSynced" }
  | { action: "restore"; options: StoredTradeOptions }
  | { action: "reset"; market: TradeboxSyncMarket };

function getSerializedTradeOptionsKey(networkId: NetworkId) {
  return JSON.stringify(getSyntheticsTradeOptionsKey(networkId));
}

export function readStoredTradeOptions(networkId: NetworkId): StoredTradeOptions | undefined {
  const raw = localStorage.getItem(getSerializedTradeOptionsKey(networkId));

  if (!raw) {
    return undefined;
  }

  return JSON.parse(raw) as StoredTradeOptions;
}

export function writeStoredTradeOptions(networkId: NetworkId, options: StoredTradeOptions) {
  localStorage.setItem(getSerializedTradeOptionsKey(networkId), JSON.stringify(options));
}

export function buildResetTradeOptions(
  currentTradeType: TradeType | undefined,
  market: TradeboxSyncMarket
): StoredTradeOptions {
  return {
    ...INITIAL_SYNTHETICS_TRADE_OPTIONS_STATE,
    tradeType: currentTradeType ?? INITIAL_SYNTHETICS_TRADE_OPTIONS_STATE.tradeType,
    markets: {
      [market.indexTokenAddress]: {
        long: market.marketTokenAddress,
        short: market.marketTokenAddress,
      },
    },
    tokens: {
      indexTokenAddress: market.indexTokenAddress,
      fromTokenAddress: market.shortTokenAddress,
    },
  };
}

export function resolveStoredTradeOptionsSync(p: {
  networkId: NetworkId;
  syncedNetworkId: NetworkId | undefined;
  enabled: boolean;
  availableIndexTokenAddresses: string[];
  firstMarket: TradeboxSyncMarket | undefined;
}): StoredTradeOptionsSyncResult {
  const { networkId, syncedNetworkId, enabled, availableIndexTokenAddresses, firstMarket } = p;

  if (syncedNetworkId === networkId) {
    return { action: "noop" };
  }

  if (!enabled) {
    return { action: "noop" };
  }

  const saved = readStoredTradeOptions(networkId);

  if (saved) {
    if (availableIndexTokenAddresses.length === 0) {
      return { action: "wait" };
    }

    if (saved.tokens.indexTokenAddress && availableIndexTokenAddresses.includes(saved.tokens.indexTokenAddress)) {
      if (syncedNetworkId !== undefined) {
        return { action: "restore", options: saved };
      }

      return { action: "markSynced" };
    }
  }

  if (!firstMarket) {
    return { action: "wait" };
  }

  return { action: "reset", market: firstMarket };
}
