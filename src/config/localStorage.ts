import { useLocalStorage } from "react-use";

export const SELECTED_NETWORK_LOCAL_STORAGE_KEY = "SELECTED_NETWORK";
export const WALLET_CONNECT_LOCALSTORAGE_KEY = "walletconnect";
export const WALLET_LINK_LOCALSTORAGE_PREFIX = "-walletlink";
export const SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY = "eagerconnect";
export const CURRENT_PROVIDER_LOCALSTORAGE_KEY = "currentprovider";
export const LANGUAGE_LOCALSTORAGE_KEY = "LANGUAGE_KEY";
export const SLIPPAGE_BPS_KEY = "t3-Exchange-swap-slippage-basis-points-v3";
export const CLOSE_POSITION_RECEIVE_TOKEN_KEY = "Close-position-receive-token";
export const IS_PNL_IN_LEVERAGE_KEY = "Exchange-swap-is-pnl-in-leverage";
export const SHOW_PNL_AFTER_FEES_KEY = "Exchange-swap-show-pnl-after-fees";
export const DISABLE_ORDER_VALIDATION_KEY = "disable-order-validation";
export const SHOULD_SHOW_POSITION_LINES_KEY = "Exchange-swap-should-show-position-lines";
export const REFERRAL_CODE_KEY = "GMX-referralCode";
export const REFERRALS_SELECTED_TAB_KEY = "Referrals-selected-tab";
export const TV_SAVE_LOAD_CHARTS_KEY = "tv-save-load-charts";
export const TV_CHART_RELOAD_TIMESTAMP_KEY = "tv-chart-reload-timestamp";
export const REDIRECT_POPUP_TIMESTAMP_KEY = "redirect-popup-timestamp";
export const PRODUCTION_PREVIEW_KEY = "production-preview";
export const TV_PARAMS_CACHE_KEY = "tv-params-cache-key";

export const getSubgraphUrlKey = (chainId: number, subgraph: string) => `subgraphUrl:${chainId}:${subgraph}`;

export function getTvParamsCacheKey(chainId: number, isV2: boolean) {
    return [TV_PARAMS_CACHE_KEY, chainId, isV2].join(":");
  }

  export type LocalStorageKey = string | number | boolean | null | undefined;

  export function useLocalStorageSerializeKey<T>(
    key: LocalStorageKey | LocalStorageKey[],
    initialValue: T,
    opts?: {
      raw: boolean;
      serializer: (val: T) => string;
      deserializer: (value: string) => T;
    }
  ) {
    key = JSON.stringify(key);
  
    return useLocalStorage<T>(key, initialValue, opts);
  }