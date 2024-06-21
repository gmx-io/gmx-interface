export const SELECTED_NETWORK_LOCAL_STORAGE_KEY = "SELECTED_NETWORK";
export const WALLET_CONNECT_LOCALSTORAGE_KEY = "walletconnect";
export const WALLET_CONNECT_V2_LOCALSTORAGE_KEY = "walletconnect_v2";
export const WALLET_LINK_LOCALSTORAGE_PREFIX = "-walletlink";
export const SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY = "eagerconnect";
export const CURRENT_PROVIDER_LOCALSTORAGE_KEY = "currentprovider";
export const LANGUAGE_LOCALSTORAGE_KEY = "LANGUAGE_KEY";
export const SLIPPAGE_BPS_KEY = "Exchange-swap-slippage-basis-points-v3";
export const EXECUTION_FEE_BUFFER_BPS_KEY = "execution-fee-buffer-basis-points";
export const HAS_OVERRIDDEN_DEFAULT_ARB_30_EXECUTION_FEE_BUFFER_BPS_KEY =
  "has-overridden-default-arb-30-execution-fee-buffer-basis-points";
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
export const LEVERAGE_OPTION_KEY = "leverage-option";
export const LEVERAGE_ENABLED_KEY = "leverage-enabled";
export const KEEP_LEVERAGE_FOR_DECREASE_KEY = "Exchange-keep-leverage";
export const TRADE_LINK_KEY = "trade-link";
export const SHOW_DEBUG_VALUES_KEY = "show-debug-values";
export const ORACLE_KEEPER_INSTANCES_CONFIG_KEY = "oracle-keeper-instances-config";

export const SYNTHETICS_TRADE_OPTIONS = "synthetics-trade-options";
export const SYNTHETICS_ACCEPTABLE_PRICE_IMPACT_BUFFER_KEY = "synthetics-acceptable-price-impact-buffer";
export const SYNTHETICS_DEPOSIT_INDEX_TOKEN_KEY = "synthetics-deposit-index-token";
export const SYNTHETICS_DEPOSIT_MARKET_KEY = "synthetics-market-deposit-market";

export const SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY = "synthetics-market-deposit-token";
export const SYNTHETICS_COLLATERAL_DEPOSIT_TOKEN_KEY = "synthetics-collateral-deposit-token";
export const SYNTHETICS_LIST_SECTION_KEY = "synthetics-list-section";
export const ACCOUNT_DASHBOARD_TAB_KEY = "account-dashboard-tab";
export const SYNTHETICS_COLLATERAL_EDIT_TOKEN_KEY = "synthetics-collateral-edit-token";
export const PRODUCTION_PREVIEW_KEY = "production-preview";
export const REQUIRED_UI_VERSION_KEY = "required-ui-version";

export const ONE_CLICK_TRADING_OFFER_HIDDEN = "one-click-trading-offer-hidden";
export const ONE_CLICK_TRADING_NATIVE_TOKEN_WARN_HIDDEN = "one-click-trading-native-token-warn-hidden";
export const ONE_CLICK_TRADING_WRAP_OR_UNWRAP_WARN_HIDDEN = "one-click-trading-wrap-or-unwrap-warn-hidden";

export const getSubgraphUrlKey = (chainId: number, subgraph: string) => `subgraphUrl:${chainId}:${subgraph}`;

export function getSyntheticsDepositIndexTokenKey(chainId: number) {
  return [chainId, SYNTHETICS_DEPOSIT_INDEX_TOKEN_KEY];
}

export function getSyntheticsDepositMarketKey(chainId: number) {
  return [chainId, SYNTHETICS_DEPOSIT_MARKET_KEY];
}

export function getSyntheticsListSectionKey(chainId: number) {
  return [chainId, SYNTHETICS_LIST_SECTION_KEY];
}

export function getAccountDashboardTabKey(chainId: number) {
  return [chainId, ACCOUNT_DASHBOARD_TAB_KEY];
}

export function getSyntheticsAcceptablePriceImpactBufferKey(chainId: number) {
  return [chainId, SYNTHETICS_ACCEPTABLE_PRICE_IMPACT_BUFFER_KEY];
}

export function getSyntheticsTradeOptionsKey(chainId: number) {
  return [chainId, SYNTHETICS_TRADE_OPTIONS];
}

export function getSyntheticsCollateralEditAddressKey(chainId: number, positionCollateralAddress?: string) {
  return [chainId, SYNTHETICS_COLLATERAL_EDIT_TOKEN_KEY, positionCollateralAddress];
}

export function getLeverageKey(chainId: number) {
  return [chainId, LEVERAGE_OPTION_KEY];
}

export function getKeepLeverageKey(chainId: number) {
  return [chainId, KEEP_LEVERAGE_FOR_DECREASE_KEY];
}

export function getLeverageEnabledKey(chainId: number) {
  return [chainId, LEVERAGE_ENABLED_KEY];
}

export function getAllowedSlippageKey(chainId: number) {
  return [chainId, SLIPPAGE_BPS_KEY];
}

export function getExecutionFeeBufferBpsKey(chainId: number) {
  return [chainId, EXECUTION_FEE_BUFFER_BPS_KEY];
}

// TODO: this was made on 07.06.2024, remove this in 6 months, because everyone would be migrated to new defaults by then
export function getHasOverriddenDefaultArb30ExecutionFeeBufferBpsKey(chainId: number) {
  return [chainId, HAS_OVERRIDDEN_DEFAULT_ARB_30_EXECUTION_FEE_BUFFER_BPS_KEY];
}

export function getSubaccountConfigKey(chainId: number | undefined, account: string | undefined) {
  if (!chainId || !account) return null;
  return [chainId, account, "one-click-trading-config"];
}

export function getSyntheticsReceiveMoneyTokenKey(chainId: number, marketName: string | undefined, direction: string) {
  return [chainId, CLOSE_POSITION_RECEIVE_TOKEN_KEY, marketName, direction];
}
