export const SELECTED_NETWORK_LOCAL_STORAGE_KEY = "SELECTED_NETWORK";
export const WALLET_CONNECT_LOCALSTORAGE_KEY = "walletconnect";
export const WALLET_CONNECT_V2_LOCALSTORAGE_KEY = "walletconnect_v2";
export const WALLET_LINK_LOCALSTORAGE_PREFIX = "-walletlink";
export const SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY = "eagerconnect";
export const CURRENT_PROVIDER_LOCALSTORAGE_KEY = "currentprovider";
export const LANGUAGE_LOCALSTORAGE_KEY = "LANGUAGE_KEY";
export const SLIPPAGE_BPS_KEY = "Exchange-swap-slippage-basis-points-v4";
export const EXECUTION_FEE_BUFFER_BPS_KEY = "execution-fee-buffer-basis-points";
export const HAS_OVERRIDDEN_DEFAULT_ARB_30_EXECUTION_FEE_BUFFER_BPS_KEY =
  "has-overridden-default-arb-30-execution-fee-buffer-basis-points";
export const CLOSE_POSITION_RECEIVE_TOKEN_KEY = "Close-position-receive-token";
export const IS_PNL_IN_LEVERAGE_KEY = "Exchange-swap-is-pnl-in-leverage";
export const SHOW_PNL_AFTER_FEES_KEY = "Exchange-swap-show-pnl-after-fees";
export const IS_AUTO_CANCEL_TPSL_KEY = "is-auto-cancel-tpsl";
export const DISABLE_ORDER_VALIDATION_KEY = "disable-order-validation";
export const SHOULD_SHOW_POSITION_LINES_KEY = "Exchange-swap-should-show-position-lines-key";
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
export const SORTED_MARKETS_KEY = "sorted-markets-key";
export const TWAP_NUMBER_OF_PARTS_KEY = "twap-number-of-parts";
export const TWAP_INFO_CARD_CLOSED_KEY = "twap-info-card-closed";

export const SYNTHETICS_TRADE_OPTIONS = "synthetics-trade-options";
export const SYNTHETICS_ACCEPTABLE_PRICE_IMPACT_BUFFER_KEY = "synthetics-acceptable-price-impact-buffer";
export const SYNTHETICS_DEPOSIT_INDEX_TOKEN_KEY = "synthetics-deposit-index-token";
export const SYNTHETICS_DEPOSIT_MARKET_KEY = "synthetics-market-deposit-market";

export const SYNTHETICS_GLV_MARKET_DEPOSIT_TOKEN_KEY = "synthetics-glv-market-deposit-token";
export const SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY = "synthetics-market-deposit-token";
export const SYNTHETICS_COLLATERAL_DEPOSIT_TOKEN_KEY = "synthetics-collateral-deposit-token";
export const SYNTHETICS_LIST_SECTION_KEY = "synthetics-list-section";
export const ACCOUNT_DASHBOARD_TAB_KEY = "account-dashboard-tab";
/**
 * @deprecated
 */
export const SYNTHETICS_COLLATERAL_EDIT_TOKEN_KEY = "synthetics-collateral-edit-token";
export const SYNTHETICS_COLLATERAL_EDIT_TOKEN_MAP_KEY = "synthetics-collateral-edit-token-map";
export const PRODUCTION_PREVIEW_KEY = "production-preview";
export const REQUIRED_UI_VERSION_KEY = "required-ui-version";
export const DEBUG_SWAP_SETTINGS_KEY = "debug-swap-settings";
export const EXTERNAL_SWAPS_ENABLED_KEY = "external-swaps-enabled";
export const DEBUG_SWAP_MARKETS_CONFIG_KEY = "debug-swap-markets-config";

export const ONE_CLICK_TRADING_PROMO_HIDDEN_KEY = "one-click-trading-promo-hidden";
export const EXPRESS_TRADING_PROMO_HIDDEN_KEY = "express-trading-promo-hidden";
export const EXPRESS_TRADING_NATIVE_TOKEN_WARN_HIDDEN_KEY = "express-trading-native-token-warn-hidden";
export const EXPRESS_TRADING_WRAP_OR_UNWRAP_WARN_HIDDEN_KEY = "express-trading-wrap-or-unwrap-warn-hidden";

export const INTERVIEW_INVITATION_SHOWN_TIME_KEY = "interview-invitation-shown-time";
export const NPS_SURVEY_SHOWN_TIME_KEY = "nps-survey-shown-time";
export const LP_INTERVIEW_INVITATION_SHOWN_TIME_KEY = "lp-interview-invitation-shown-time";
/**
 * @deprecated
 */
export const TOKEN_FAVORITE_PREFERENCE_SETTINGS_KEY = "token-favorite-preference";
export const SETTINGS_WARNING_DOT_VISIBLE_KEY = "settings-warning-dot-visible";
export const EXPRESS_TRADING_GAS_TOKEN_SWITCHED = "express-trading-gas-token-switched";

export const METRICS_PENDING_EVENTS_KEY = "metrics-pending-events";
export const METRICS_TIMERS_KEY = "metrics-timers-key";

export const DEBUG_MULTICALL_BATCHING_KEY = "debug-multicall-batching";

export const AB_FLAG_STORAGE_KEY = "ab-flags";

export const RPC_PROVIDER_KEY = "rpc-provider";
export const IS_LARGE_ACCOUNT_KEY = "is-large-account";

/**
 * @deprecated
 */
export const SORTER_CONFIG_KEY = "sorter-config";

export const EXPRESS_ORDERS_ENABLED_KEY = "express-orders-enabled";
export const ONE_CLICK_TRADING_ENABLED_KEY = "one-click-trading-enabled";
export const GAS_PAYMENT_TOKEN_ADDRESS_KEY = "gas-payment-token-address";
export const EXPRESS_TRADING_BANNER_DISMISSED_KEY = "express-trading-banner-dismissed";

export const SUBACCOUNT_APPROVAL_KEY = "subaccount-approval";
export const TOKEN_PERMITS_KEY = "token-permits";

export const getSubgraphUrlKey = (chainId: number, subgraph: string) => `subgraphUrl:${chainId}:${subgraph}`;

export function getSubaccountApprovalKey(chainId: number, account: string | undefined) {
  if (!chainId || !account) return null;
  return [chainId, account, SUBACCOUNT_APPROVAL_KEY];
}

export function getTokenPermitsKey(chainId: number, account: string | undefined) {
  if (!chainId || !account) return null;
  return [chainId, account, TOKEN_PERMITS_KEY];
}

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

/**
 * @deprecated
 */
export function getSyntheticsCollateralEditAddressKey(chainId: number, positionCollateralAddress?: string) {
  return [chainId, SYNTHETICS_COLLATERAL_EDIT_TOKEN_KEY, positionCollateralAddress];
}

export function getSyntheticsCollateralEditAddressMapKey(chainId: number) {
  return [chainId, SYNTHETICS_COLLATERAL_EDIT_TOKEN_MAP_KEY];
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

export function getRpcProviderKey(chainId: number | string) {
  return [chainId, RPC_PROVIDER_KEY];
}

// TODO: this was made on 07.06.2024, remove this in 6 months, because everyone would be migrated to new defaults by then
export function getHasOverriddenDefaultArb30ExecutionFeeBufferBpsKey(chainId: number) {
  return [chainId, HAS_OVERRIDDEN_DEFAULT_ARB_30_EXECUTION_FEE_BUFFER_BPS_KEY];
}

export function getSubaccountConfigKey(chainId: number | undefined, account: string | undefined) {
  if (!chainId || !account) return null;
  return [chainId, account, "one-click-trading-config"];
}

export function getSyntheticsReceiveMoneyTokenKey(
  chainId: number,
  marketName: string | undefined,
  direction: string,
  collateralToken: string | undefined
) {
  return [chainId, CLOSE_POSITION_RECEIVE_TOKEN_KEY, marketName, direction, collateralToken];
}

export function getIsMulticallBatchingDisabledKey() {
  return [DEBUG_MULTICALL_BATCHING_KEY, "disabled"];
}

export function getMulticallBatchingLoggingEnabledKey() {
  return [DEBUG_MULTICALL_BATCHING_KEY, "logging"];
}

export function getSortedMarketsAddressesKey(chainId: number) {
  return [SORTED_MARKETS_KEY, chainId].join(":");
}

export function getExpressOrdersEnabledKey(chainId: number) {
  return [chainId, EXPRESS_ORDERS_ENABLED_KEY];
}

export function getGasPaymentTokenAddressKey(chainId: number) {
  return [chainId, GAS_PAYMENT_TOKEN_ADDRESS_KEY];
}

export function getExpressTradingBannerDismissedKey(chainId: number) {
  return `${chainId}-${EXPRESS_TRADING_BANNER_DISMISSED_KEY}`;
}

export function getOneClickTradingPromoHiddenKey(chainId: number) {
  return `${chainId}-${ONE_CLICK_TRADING_PROMO_HIDDEN_KEY}`;
}

export function getExpressTradingPromoHiddenKey(chainId: number) {
  return `${chainId}-${EXPRESS_TRADING_PROMO_HIDDEN_KEY}`;
}

export function getFromTokenIsGmxAccountKey(chainId: number) {
  return [chainId, "from-token-is-gmx-account"];
}

export function getExpressTradingGasTokenSwitchedKey(chainId: number, account: string | undefined) {
  return `${chainId}-${account}-${EXPRESS_TRADING_GAS_TOKEN_SWITCHED}`;
}
