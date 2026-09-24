import {
  DEFAULT_ACCEPABLE_PRICE_IMPACT_BUFFER,
  DEFAULT_LEVERAGE,
} from '@/config/factors';
import { Market } from '@/selectors/market/types';
import {
  TradeboxAdvancedOptions,
  TradeMode,
  TradeOptions,
  TradeParams,
  TradeType,
} from '@/selectors/trade/types';
import { SliceCreator } from '@/zustand/types';
import { BN } from '@coral-xyz/anchor';
import { SetStateAction } from 'react';

const INITIAL_TRADE_OPTIONS: TradeOptions = {
  tradeType: TradeType.Long,
  tradeMode: TradeMode.Market,
  tokens: {},
  markets: {},
  collateralTokenAddress: '',
  receiveTokenAddress: '',
  leverage: DEFAULT_LEVERAGE,
};

interface TradeboxInputs {
  fromTokenValue: string;
  toTokenValue: string;
  triggerRatioValue: string;
  triggerPriceValue: string;
  closeSizeValue: string;

  setFromTokenValue: (value: string) => void;
  setToTokenValue: (value: string) => void;
  setTriggerRatioValue: (value: string) => void;
  setTriggerPriceValue: (value: string) => void;
  setCloseSizeValue: (value: string) => void;
  reset: () => void;
}

interface Tradebox {
  inputs: TradeboxInputs;
  ui: {
    stage: 'trade' | 'confirmation';
    focusedInput: 'from' | 'to';
  };
  options: TradeOptions;
  settings: {
    isLeverageEnabled: boolean;
    keepLeverage: boolean;
    advancedOptions: TradeboxAdvancedOptions;
    defaultTriggerAcceptablePriceImpactBps: number | undefined;
    selectedTriggerAcceptablePriceImpactBps: number | undefined;
  };

  setFromTokenInputValue: (value: string) => void;
  setToTokenInputValue: (value: string) => void;
  setTriggerRatioInputValue: (value: string) => void;
  setTriggerPriceInputValue: (value: string) => void;
  setCloseSizeInputValue: (value: string) => void;
  resetInputs: () => void;

  setStage: (stage: 'trade' | 'confirmation') => void;
  setFocusedInput: (focusedInput: 'from' | 'to') => void;

  resetOptions: (market: Market) => void;
  directSetOptions: (action: SetStateAction<TradeOptions>) => void;
  setChainId: (chainId?: string) => void;
  setTradeType: (tradeType: TradeType) => void;
  setTradeMode: (tradeMode: TradeMode) => void;
  setLeverage: (leverage: BN) => void;
  setTradeParams: (params: TradeParams) => void;

  setMarketTokenAddress: (marketTokenAddress?: string) => void;
  setFromTokenAddress: (tokenAddress?: string) => void;
  setToTokenAddress: (tokenAddress?: string) => void;
  setCollateralTokenAddress: (tokenAddress?: string) => void;
  setReceiveTokenAddress: (tokenAddress?: string) => void;
  switchTokenAddresses: () => void;

  setIsLeverageEnabled: (value: boolean) => void;
  setKeepLeverage: (value: boolean) => void;
  setAdvancedOptions: (advancedOptions: TradeboxAdvancedOptions) => void;
  setDefaultTriggerAcceptablePriceImpactBps: (
    value: number | undefined
  ) => void;
  setSelectedTriggerAcceptablePriceImpactBps: (
    value: number | undefined
  ) => void;
}

export interface TradeboxSlice {
  tradebox: Tradebox;
}

export const createTradeboxSlice: SliceCreator<TradeboxSlice> = (set, get) => ({
  tradebox: {
    inputs: {
      fromTokenValue: '',
      toTokenValue: '',
      triggerRatioValue: '',
      triggerPriceValue: '',
      closeSizeValue: '',

      setFromTokenValue: (value) =>
        set((state) => ({
          tradebox: {
            ...state.tradebox,
            inputs: {
              ...state.tradebox.inputs,
              fromTokenValue: value,
            },
          },
        })),

      setToTokenValue: (value) =>
        set((state) => ({
          tradebox: {
            ...state.tradebox,
            inputs: {
              ...state.tradebox.inputs,
              toTokenValue: value,
            },
          },
        })),

      setTriggerRatioValue: (value) =>
        set((state) => ({
          tradebox: {
            ...state.tradebox,
            inputs: {
              ...state.tradebox.inputs,
              triggerRatioValue: value,
            },
          },
        })),

      setTriggerPriceValue: (value) =>
        set((state) => ({
          tradebox: {
            ...state.tradebox,
            inputs: {
              ...state.tradebox.inputs,
              triggerPriceValue: value,
            },
          },
        })),

      setCloseSizeValue: (value) =>
        set((state) => ({
          tradebox: {
            ...state.tradebox,
            inputs: {
              ...state.tradebox.inputs,
              closeSizeValue: value,
            },
          },
        })),

      reset: () => {
        const currentInputs = get().tradebox.inputs;
        set((state) => ({
          tradebox: {
            ...state.tradebox,
            inputs: {
              ...currentInputs,
              fromTokenValue: '',
              toTokenValue: '',
              triggerRatioValue: '',
              triggerPriceValue: '',
              closeSizeValue: '',
            },
          },
        }));
      },
    },
    ui: {
      stage: 'trade',
      focusedInput: 'from',
    },
    options: INITIAL_TRADE_OPTIONS,
    settings: {
      isLeverageEnabled: true,
      keepLeverage: true,
      advancedOptions: { advancedDisplay: false, limitOrTPSL: false },
      defaultTriggerAcceptablePriceImpactBps:
        DEFAULT_ACCEPABLE_PRICE_IMPACT_BUFFER,
      selectedTriggerAcceptablePriceImpactBps:
        DEFAULT_ACCEPABLE_PRICE_IMPACT_BUFFER,
    },

    setFromTokenInputValue: (value) =>
      set(
        (state) => ({
          tradebox: {
            ...state.tradebox,
            inputs: { ...state.tradebox.inputs, fromTokenValue: value },
          },
        }),
        false,
        'tradebox/setFromTokenInputValue'
      ),

    setToTokenInputValue: (value) =>
      set(
        (state) => ({
          tradebox: {
            ...state.tradebox,
            inputs: { ...state.tradebox.inputs, toTokenValue: value },
          },
        }),
        false,
        'tradebox/setToTokenInputValue'
      ),

    setTriggerRatioInputValue: (value) =>
      set(
        (state) => ({
          tradebox: {
            ...state.tradebox,
            inputs: { ...state.tradebox.inputs, triggerRatioValue: value },
          },
        }),
        false,
        'tradebox/setTriggerRatioInputValue'
      ),

    setTriggerPriceInputValue: (value) =>
      set(
        (state) => ({
          tradebox: {
            ...state.tradebox,
            inputs: { ...state.tradebox.inputs, triggerPriceValue: value },
          },
        }),
        false,
        'tradebox/setTriggerPriceInputValue'
      ),

    setCloseSizeInputValue: (value) =>
      set(
        (state) => ({
          tradebox: {
            ...state.tradebox,
            inputs: { ...state.tradebox.inputs, closeSizeValue: value },
          },
        }),
        false,
        'tradebox/setCloseSizeInputValue'
      ),

    resetInputs: () =>
      set(
        (state) => ({
          tradebox: {
            ...state.tradebox,
            inputs: {
              ...state.tradebox.inputs,
              fromTokenValue: '',
              toTokenValue: '',
              triggerRatioValue: '',
              triggerPriceValue: '',
              closeSizeValue: '',
            },
          },
        }),
        false,
        'tradebox/resetInputs'
      ),

    setStage: (stage) =>
      set(
        (state) => ({
          tradebox: {
            ...state.tradebox,
            ui: { ...state.tradebox.ui, stage },
          },
        }),
        false,
        'tradebox/setStage'
      ),

    setFocusedInput: (focusedInput) =>
      set(
        (state) => ({
          tradebox: {
            ...state.tradebox,
            ui: { ...state.tradebox.ui, focusedInput },
          },
        }),
        false,
        'tradebox/setFocusedInput'
      ),

    resetOptions: (market) =>
      set(
        (state) => ({
          tradebox: {
            ...state.tradebox,
            options: {
              ...INITIAL_TRADE_OPTIONS,
              tokens: {
                indexTokenAddress: market.indexTokenAddress.toBase58(),
                fromTokenAddress: market.shortTokenAddress.toBase58(),
              },
              markets: {
                [market.indexTokenAddress.toBase58()]: {
                  longTokenAddress: market.longTokenAddress.toBase58(),
                  shortTokenAddress: market.shortTokenAddress.toBase58(),
                },
              },
              collateralTokenAddress: market.longTokenAddress.toBase58(),
            },
          },
        }),
        false,
        'tradebox/resetOptions'
      ),

    directSetOptions: (action) =>
      set(
        (state) => ({
          tradebox: {
            ...state.tradebox,
            options:
              typeof action === 'function'
                ? action(state.tradebox.options)
                : action,
          },
        }),
        false,
        'tradebox/directSetOptions'
      ),

    setChainId: (chainId) =>
      set(
        (state) => ({
          tradebox: {
            ...state.tradebox,
            options: { ...state.tradebox.options, chainId },
          },
        }),
        false,
        'tradebox/setChainId'
      ),

    setTradeType: (tradeType) =>
      set(
        (state) => ({
          tradebox: {
            ...state.tradebox,
            options: { ...state.tradebox.options, tradeType },
          },
        }),
        false,
        'tradebox/setTradeType'
      ),

    setTradeMode: (tradeMode) =>
      set(
        (state) => ({
          tradebox: {
            ...state.tradebox,
            options: { ...state.tradebox.options, tradeMode },
          },
        }),
        false,
        'tradebox/setTradeMode'
      ),

    setLeverage: (leverage) =>
      set(
        (state) => ({
          tradebox: {
            ...state.tradebox,
            options: { ...state.tradebox.options, leverage },
          },
        }),
        false,
        'tradebox/setLeverage'
      ),

    setTradeParams: (params) =>
      set(
        (state) => {
          const {
            tradeType,
            tradeMode,
            fromTokenAddress,
            toTokenAddress,
            marketTokenAddress,
            collateralTokenAddress,
          } = params;
          const newOptions = { ...state.tradebox.options };

          if (tradeType) newOptions.tradeType = tradeType;
          if (tradeMode) newOptions.tradeMode = tradeMode;
          if (fromTokenAddress)
            newOptions.tokens.fromTokenAddress = fromTokenAddress;

          if (toTokenAddress) {
            if (tradeType === TradeType.Swap) {
              newOptions.tokens.swapToTokenAddress = toTokenAddress;
            } else {
              newOptions.tokens.indexTokenAddress = toTokenAddress;
              if (toTokenAddress && marketTokenAddress) {
                newOptions.markets[toTokenAddress] =
                  newOptions.markets[toTokenAddress] || {};
                if (tradeType === TradeType.Long) {
                  newOptions.markets[toTokenAddress].longTokenAddress =
                    marketTokenAddress;
                } else if (tradeType === TradeType.Short) {
                  newOptions.markets[toTokenAddress].shortTokenAddress =
                    marketTokenAddress;
                }
              }
            }
          }

          if (collateralTokenAddress)
            newOptions.collateralTokenAddress = collateralTokenAddress;

          return {
            tradebox: {
              ...state.tradebox,
              options: newOptions,
            },
          };
        },
        false,
        'tradebox/setTradeParams'
      ),

    setMarketTokenAddress: (tokenAddress) =>
      set((state) => {
        const toTokenAddress = state.tradebox.options.tokens.indexTokenAddress;
        const isLong = state.tradebox.options.tradeType === TradeType.Long;
        if (!toTokenAddress) return state;

        return {
          tradebox: {
            ...state.tradebox,
            options: {
              ...state.tradebox.options,
              markets: {
                ...state.tradebox.options.markets,
                [toTokenAddress]: {
                  ...state.tradebox.options.markets[toTokenAddress],
                  [isLong ? 'longTokenAddress' : 'shortTokenAddress']:
                    tokenAddress,
                },
              },
            },
          },
        };
      }),

    setFromTokenAddress: (tokenAddress) =>
      set((state) => ({
        tradebox: {
          ...state.tradebox,
          options: {
            ...state.tradebox.options,
            tokens: {
              ...state.tradebox.options.tokens,
              fromTokenAddress: tokenAddress,
            },
          },
        },
      })),

    setToTokenAddress: (tokenAddress) =>
      set((state) => {
        const isSwap = state.tradebox.options.tradeType === TradeType.Swap;
        return {
          tradebox: {
            ...state.tradebox,
            options: {
              ...state.tradebox.options,
              tokens: {
                ...state.tradebox.options.tokens,
                [isSwap ? 'swapToTokenAddress' : 'indexTokenAddress']:
                  tokenAddress,
              },
            },
          },
        };
      }),

    setCollateralTokenAddress: (tokenAddress) =>
      set((state) => ({
        tradebox: {
          ...state.tradebox,
          options: {
            ...state.tradebox.options,
            collateralTokenAddress: tokenAddress,
          },
        },
      })),

    setReceiveTokenAddress: (tokenAddress) =>
      set((state) => ({
        tradebox: {
          ...state.tradebox,
          options: {
            ...state.tradebox.options,
            receiveTokenAddress: tokenAddress,
          },
        },
      })),

    switchTokenAddresses: () =>
      set((state) => {
        const isSwap = state.tradebox.options.tradeType === TradeType.Swap;
        const fromTokenAddress = state.tradebox.options.tokens.fromTokenAddress;
        const toTokenAddress = isSwap
          ? state.tradebox.options.tokens.swapToTokenAddress
          : state.tradebox.options.tokens.indexTokenAddress;

        return {
          tradebox: {
            ...state.tradebox,
            options: {
              ...state.tradebox.options,
              tokens: {
                ...state.tradebox.options.tokens,
                fromTokenAddress: toTokenAddress,
                [isSwap ? 'swapToTokenAddress' : 'indexTokenAddress']:
                  fromTokenAddress,
              },
            },
          },
        };
      }),

    setIsLeverageEnabled: (value) =>
      set((state) => ({
        tradebox: {
          ...state.tradebox,
          settings: { ...state.tradebox.settings, isLeverageEnabled: value },
        },
      })),

    setKeepLeverage: (value) =>
      set((state) => ({
        tradebox: {
          ...state.tradebox,
          settings: { ...state.tradebox.settings, keepLeverage: value },
        },
      })),

    setAdvancedOptions: (advancedOptions) =>
      set((state) => ({
        tradebox: {
          ...state.tradebox,
          settings: { ...state.tradebox.settings, advancedOptions },
        },
      })),

    setDefaultTriggerAcceptablePriceImpactBps: (value) =>
      set((state) => ({
        tradebox: {
          ...state.tradebox,
          settings: {
            ...state.tradebox.settings,
            defaultTriggerAcceptablePriceImpactBps: value,
          },
        },
      })),

    setSelectedTriggerAcceptablePriceImpactBps: (value) =>
      set((state) => ({
        tradebox: {
          ...state.tradebox,
          settings: {
            ...state.tradebox.settings,
            selectedTriggerAcceptablePriceImpactBps: value,
          },
        },
      })),
  },
});
