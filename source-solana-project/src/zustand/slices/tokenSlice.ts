import { getGmw346Enabled } from '@/config/featureFlagEnable';
import { Token, TokenPrices } from '@/selectors/token/types';
import { SliceCreator } from '@/zustand/types';
import { BN } from '@coral-xyz/anchor';
import isEqual from 'lodash/isEqual';
import throttle from 'lodash/throttle';

interface TokenState {
  tokens: Record<string, Token>;
  prices: Record<string, TokenPrices>;
  balances: Record<string, BN | null>;
  isPricesInitialized: boolean;
  throttledPricesDelay: number;
  _throttledSetPrices: ((prices: Record<string, TokenPrices>) => void) | null;
  throttledPrices: Record<string, TokenPrices>;

  setToken: (tokenAddress: string, token: Token) => void;
  setPrice: (tokenAddress: string, price: TokenPrices) => void;
  setAllPrices: (prices: Record<string, TokenPrices>) => void;
  setAllTokens: (tokens: Record<string, Token>) => void;
  setBalance: (tokenAddress: string, balance: BN | null) => void;
  setIsPricesInitialized: (initialized: boolean) => void;
  setThrottledPricesDelay: (ms: number) => void;
  setThrottledPrices: (prices: Record<string, TokenPrices>) => void;
}

export interface TokenSlice {
  tokenState: TokenState;
}

const shouldUpdateBalance = (balance: BN | null, current?: BN | null) =>
  current === undefined ||
  (current === null && balance !== null) ||
  (current !== null && balance === null) ||
  (!(current === null && balance === null) && !current!.eq(balance!));

export const createTokenSlice: SliceCreator<TokenSlice> = (set, get) => ({
  tokenState: {
    tokens: {},
    prices: {},
    balances: {},
    isPricesInitialized: false,
    throttledPricesDelay: 1000,
    _throttledSetPrices: null,
    throttledPrices: {},

    setToken: (tokenAddress, token) => {
      const current = get().tokenState.tokens[tokenAddress];
      if (!isEqual(current, token)) {
        set((state) => ({
          tokenState: {
            ...state.tokenState,
            tokens: { ...state.tokenState.tokens, [tokenAddress]: token },
          },
        }));
      }
    },

    setPrice: (tokenAddress, price) => {
      const current = get().tokenState.prices[tokenAddress];
      if (!isEqual(current, price)) {
        set(
          (state) => ({
            tokenState: {
              ...state.tokenState,
              prices: { ...state.tokenState.prices, [tokenAddress]: price },
            },
          }),
          undefined,
          'set-price'
        );
      }
    },

    setAllPrices: (prices) => {
      if (!getGmw346Enabled()) {
        set((state) => ({
          tokenState: {
            ...state.tokenState,
            prices: { ...state.tokenState.prices, ...prices },
            isPricesInitialized: true,
          },
        }));
        return;
      }

      const { prices: currentPrices, isPricesInitialized } = get().tokenState;

      const changedEntries = Object.entries(prices).filter(
        ([tokenAddress, price]) => !isEqual(currentPrices[tokenAddress], price)
      );

      const hasPriceChanges = changedEntries.length > 0;
      const needsInitialization = !isPricesInitialized;

      if (!hasPriceChanges && !needsInitialization) {
        return;
      }

      set((state) => ({
        tokenState: {
          ...state.tokenState,
          prices: hasPriceChanges
            ? {
                ...state.tokenState.prices,
                ...Object.fromEntries(changedEntries),
              }
            : state.tokenState.prices,
          isPricesInitialized: true,
        },
      }));
    },

    setAllTokens: (tokens) => {
      set((state) => ({
        tokenState: {
          ...state.tokenState,
          tokens,
        },
      }));
    },

    setBalance: (tokenAddress, balance) => {
      const current = get().tokenState.balances[tokenAddress];
      if (shouldUpdateBalance(balance, current)) {
        set((state) => ({
          tokenState: {
            ...state.tokenState,
            balances: { ...state.tokenState.balances, [tokenAddress]: balance },
          },
        }));
      }
    },

    setIsPricesInitialized: (initialized) => {
      if (get().tokenState.isPricesInitialized !== initialized) {
        set((state) => ({
          tokenState: {
            ...state.tokenState,
            isPricesInitialized: initialized,
          },
        }));
      }
    },

    setThrottledPricesDelay: (ms) => {
      const _throttledSetPrice = throttle(
        (prices: Record<string, TokenPrices>) =>
          set((state) => ({
            tokenState: {
              ...state.tokenState,
              throttledPrices: prices,
            },
          })),
        ms
      );

      set((state) => ({
        tokenState: {
          ...state.tokenState,
          throttledPricesDelay: ms,
          _throttledSetPrices: _throttledSetPrice,
        },
      }));
    },

    setThrottledPrices: (prices) => {
      if (!get().tokenState._throttledSetPrices) {
        const _throttledSetPrice = throttle(
          (prices: Record<string, TokenPrices>) =>
            set((state) => ({
              tokenState: {
                ...state.tokenState,
                throttledPrices: prices,
              },
            })),
          get().tokenState.throttledPricesDelay
        );

        set((state) => ({
          tokenState: {
            ...state.tokenState,
            _throttledSetPrices: _throttledSetPrice,
          },
        }));
      }
      get().tokenState._throttledSetPrices!(prices);
    },
  },
});
