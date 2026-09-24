import { DEFAULT_LEVERAGE } from '@/config/factors';
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { LRUCache } from '@/utils/lib/LruCache';
import {
  createGlvSlice,
  createGmboxSlice,
  createGtSlice,
  createMarketSlice,
  createCollateralSlice,
  createSwapSlice,
  createIndexTokenSlice,
  createTpSlSlice,
  createNetworkSlice,
  createPayerSwapSlice,
  createOrderEditorSlice,
  createOrderSlice,
  createPositionEditorSlice,
  createPositionSellerSlice,
  createPositionSlice,
  createReferralSlice,
  createSettingsSlice,
  createSidecarOrderSlice,
  createStatsSlice,
  createTokenSlice,
  createTradeboxSlice,
  createTradeboxSliceNew,
  createMarketSocketSlice,
  createTickersSlice,
  creatPoolsSlice,
  GlvSlice,
  PoolsSlice,
  GmboxSlice,
  GtSlice,
  MarketSlice,
  CollateralSlice,
  SwapSlice,
  IndexTokenSlice,
  NetworkSlice,
  OrderEditorSlice,
  OrderSlice,
  PayerSwapSlice,
  PositionEditorSlice,
  PositionSellerSlice,
  PositionSlice,
  ReferralSlice,
  SettingsSlice,
  SidecarOrderSlice,
  StatsSlice,
  TpSlSlice,
  TokenSlice,
  TradeboxSlice,
  TradeboxSliceNew,
  MarketSocketSlice,
  TickersSlice,
} from '@/zustand/slices';
import {
  createPriorityFeeSlice,
  PriorityFeeSlice,
} from '@/zustand/slices/priorityFeeSlice';
import { CachedSelector, SupportedArg } from '@/zustand/types';
import { createStorage, getKeyForArgs } from '@/zustand/utils';
import { PublicKey } from '@solana/web3.js';
import { createSelector } from 'reselect';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

type PersistedAppState = {
  tradebox?: {
    options?: RootState['tradebox']['options'];
  };
  network?: {
    cluster?: RootState['network']['cluster'];
  };
  tradeOptions?: RootState['tradebox']['options'];
  cluster?: RootState['network']['cluster'];
};

export interface RootState
  extends NetworkSlice,
  TokenSlice,
  MarketSlice,
  CollateralSlice,
  IndexTokenSlice,
  TradeboxSlice,
  SwapSlice,
  GmboxSlice,
  PayerSwapSlice,
  PositionSlice,
  PositionSellerSlice,
  PositionEditorSlice,
  SettingsSlice,
  OrderSlice,
  OrderEditorSlice,
  SidecarOrderSlice,
  GtSlice,
  TpSlSlice,
  ReferralSlice,
  StatsSlice,
  PriorityFeeSlice,
  TradeboxSliceNew,
  MarketSocketSlice,
  TickersSlice,
  PoolsSlice,
  GlvSlice {
  store?: PublicKey;
  stats?: {
    volume24H: number;
  };
}

export const useAppStore = create<RootState>()(
  devtools(
    persist(
      (...a) => ({
        ...createNetworkSlice(...a),
        ...createTokenSlice(...a),
        ...createIndexTokenSlice(...a),
        ...createMarketSlice(...a),
        ...createCollateralSlice(...a),
        ...createSwapSlice(...a),
        ...createTradeboxSlice(...a),
        ...createGmboxSlice(...a),
        ...createTpSlSlice(...a),
        ...createPositionSlice(...a),
        ...createPositionSellerSlice(...a),
        ...createPositionEditorSlice(...a),
        ...createSettingsSlice(...a),
        ...createOrderSlice(...a),
        ...createOrderEditorSlice(...a),
        ...createSidecarOrderSlice(...a),
        ...createGtSlice(...a),
        ...createReferralSlice(...a),
        ...createStatsSlice(...a),
        ...createGlvSlice(...a),
        ...createPriorityFeeSlice(...a),
        ...createMarketSocketSlice(...a),
        ...createPayerSwapSlice(...a),
        ...createTradeboxSliceNew(...a),
        ...createTickersSlice(...a),
        ...creatPoolsSlice(...a),
        store: GMX_SOLANA_STORE_ADDRESS,
      }),
      {
        name: 'app-store-storage',
        partialize: (state) => ({
          tradebox: {
            options: state.tradebox.options,
          },
          network: {
            cluster: state.network.cluster,
          },
        }),
        version: 1,
        migrate: (persistedState, version) => {
          const state = persistedState as PersistedAppState;
          const storedTradeOptions =
            state.tradebox?.options ?? state.tradeOptions;
          const cluster = state.network?.cluster ?? state.cluster;
          const tradeOptions =
            version === 0 && storedTradeOptions
              ? { ...storedTradeOptions, leverage: DEFAULT_LEVERAGE }
              : storedTradeOptions;

          return {
            tradebox: tradeOptions ? { options: tradeOptions } : undefined,
            network: cluster ? { cluster } : undefined,
          };
        },
        merge: (persistedState, currentState) => {
          const state = persistedState as PersistedAppState | undefined;
          const tradeOptions = state?.tradebox?.options ?? state?.tradeOptions;
          const cluster = state?.network?.cluster ?? state?.cluster;

          return {
            ...currentState,
            tradebox: {
              ...currentState.tradebox,
              options: tradeOptions ?? currentState.tradebox.options,
            },
            network: {
              ...currentState.network,
              cluster: cluster ?? currentState.network.cluster,
            },
          };
        },
        storage: createStorage(),
      }
    ),
    {
      enabled: import.meta.env.MODE === 'development',
    }
  )
);

// createAppStoreSelector is a selector factory that creates a selector for the app store

export const createAppStoreSelector = createSelector.withTypes<RootState>();

// createAppStoreSelectorFactory is a function that takes a factory function and returns a selector function

export function createAppStoreSelectorFactory<
  SelectionResult,
  Args extends SupportedArg[],
>(
  factory: (...args: Args) => CachedSelector<SelectionResult>
): (...args: Args) => CachedSelector<SelectionResult> {
  const cache = new LRUCache<CachedSelector<SelectionResult>>(20);

  return (...args: Args) => {
    const key = getKeyForArgs(...args);

    if (cache.has(key)) {
      const selector = cache.get(key);
      if (!selector) throw new Error('Selector is undefined');
      return selector;
    }

    const selector = factory(...args);
    cache.set(key, selector);

    return selector;
  };
}
