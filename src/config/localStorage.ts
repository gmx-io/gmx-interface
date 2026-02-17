export const SELECTED_NETWORK_LOCAL_STORAGE_KEY = "SELECTED_NETWORK";
export const SELECTED_SETTLEMENT_CHAIN_ID_KEY = "SELECTED_SETTLEMENT_CHAIN_ID";
export const SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY = "eagerconnect";
export const CURRENT_PROVIDER_LOCALSTORAGE_KEY = "currentprovider";
export const LANGUAGE_LOCALSTORAGE_KEY = "LANGUAGE_KEY";
const SLIPPAGE_BPS_KEY = "Exchange-swap-slippage-basis-points-v4";
const EXECUTION_FEE_BUFFER_BPS_KEY = "execution-fee-buffer-basis-points";
const HAS_OVERRIDDEN_DEFAULT_ARB_30_EXECUTION_FEE_BUFFER_BPS_KEY =
  "has-overridden-default-arb-30-execution-fee-buffer-basis-points";
const CLOSE_POSITION_RECEIVE_TOKEN_KEY = "Close-position-receive-token";
export const IS_PNL_IN_LEVERAGE_KEY = "Exchange-swap-is-pnl-in-leverage";
export const SHOW_PNL_AFTER_FEES_KEY = "Exchange-swap-show-pnl-after-fees";
export const IS_AUTO_CANCEL_TPSL_KEY = "is-auto-cancel-tpsl";
export const DISABLE_ORDER_VALIDATION_KEY = "disable-order-validation";
export const DISABLE_SHARE_MODAL_PNL_CHECK_KEY = "disable-share-modal-pnl-check";
export const SHOULD_SHOW_POSITION_LINES_KEY = "Exchange-swap-should-show-position-lines-key";
export const REFERRAL_CODE_KEY = "GMX-referralCode";
export const REFERRALS_SELECTED_TAB_KEY = "Referrals-selected-tab";
export const TV_SAVE_LOAD_CHARTS_KEY = "tv-save-load-charts";
export const REDIRECT_POPUP_TIMESTAMP_KEY = "redirect-popup-timestamp";
const LEVERAGE_OPTION_KEY = "leverage-option";
const LEVERAGE_ENABLED_KEY = "leverage-enabled";
const KEEP_LEVERAGE_FOR_DECREASE_KEY = "Exchange-keep-leverage";
export const SHOW_DEBUG_VALUES_KEY = "show-debug-values";
export const DEBUG_METRICS_KEY = "debug_metrics";
export const RPC_DEBUG_STATE_KEY = "rpc_debug_state";
export const DEBUG_RPC_ENDPOINTS_KEY = "debug_rpc_endpoints";
export const ORACLE_KEEPER_DEBUG_STATE_KEY = "oracle_keeper_debug_state";
export const MULTICALL_DEBUG_STATE_KEY = "multicall_debug_state";
export const DEBUG_ERROR_BOUNDARY_KEY = "debug-error-boundary";
const SORTED_MARKETS_KEY = "sorted-markets-key";
export const TWAP_NUMBER_OF_PARTS_KEY = "twap-number-of-parts";
export const TWAP_INFO_CARD_CLOSED_KEY = "twap-info-card-closed";
// key updated with chart overrides, to update tv chart with new release
export const WAS_TV_CHART_OVERRIDDEN_KEY = "was-tv-chart-overridden-1";
export const UTM_PARAMS_KEY = "utm_params";

export const BREAKDOWN_NET_PRICE_IMPACT_ENABLED_KEY = "breakdown-net-price-impact-enabled";
export const SET_ACCEPTABLE_PRICE_IMPACT_ENABLED_KEY = "set-acceptable-price-impact-enabled";

const SYNTHETICS_TRADE_OPTIONS = "synthetics-trade-options";
const SYNTHETICS_ACCEPTABLE_PRICE_IMPACT_BUFFER_KEY = "synthetics-acceptable-price-impact-buffer";

export const SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY = "synthetics-market-deposit-token";
const SYNTHETICS_LIST_SECTION_KEY = "synthetics-list-section";
const ACCOUNT_DASHBOARD_TAB_KEY = "account-dashboard-tab";
export const LAST_EARN_TAB_KEY = "last-earn-tab";
const SYNTHETICS_COLLATERAL_EDIT_TOKEN_MAP_KEY = "synthetics-collateral-edit-token-map";
const SYNTHETICS_COLLATERAL_EDIT_TOKEN_IS_FROM_GMX_ACCOUNT_KEY = "synthetics-collateral-edit-token-is-from-gmx-account";
export const PRODUCTION_PREVIEW_KEY = "production-preview";
export const REQUIRED_UI_VERSION_KEY = "required-ui-version";
export const DEBUG_SWAP_SETTINGS_KEY = "debug-swap-settings";
export const EXTERNAL_SWAPS_ENABLED_KEY = "external-swaps-enabled";
export const DEBUG_SWAP_MARKETS_CONFIG_KEY = "debug-swap-markets-config";

const ONE_CLICK_TRADING_PROMO_HIDDEN_KEY = "one-click-trading-promo-hidden";
export const EXPRESS_TRADING_NATIVE_TOKEN_WARN_HIDDEN_KEY = "express-trading-native-token-warn-hidden";
export const EXPRESS_TRADING_WRAP_OR_UNWRAP_WARN_HIDDEN_KEY = "express-trading-wrap-or-unwrap-warn-hidden";

export const INTERVIEW_INVITATION_SHOWN_TIME_KEY = "interview-invitation-shown-time";
export const NPS_SURVEY_SHOWN_TIME_KEY = "nps-survey-shown-time";
export const TOKEN_FAVORITES_PREFERENCE_KEY = "token-favorites-preference";
export const SETTINGS_WARNING_DOT_VISIBLE_KEY = "settings-warning-dot-visible";
export const SUPPORT_CHAT_WAS_EVER_SHOWN_KEY = "support-chat-was-ever-shown";
export const SUPPORT_CHAT_WAS_EVER_CLICKED_KEY = "support-chat-was-ever-clicked";
export const SUPPORT_CHAT_USER_ID_KEY = "support-chat-user-id";
export const SUPPORT_CHAT_LAST_CONNECTED_STATE_KEY = "support-chat-last-connected-state";

export const METRICS_PENDING_EVENTS_KEY = "metrics-pending-events";
export const METRICS_TIMERS_KEY = "metrics-timers-key";

export const UI_FLAG_EVENTS_DISMISSED_KEY_PREFIX = "ui-flag-event-dismissed";

const DEBUG_MULTICALL_BATCHING_KEY = "debug-multicall-batching";
export const PERMITS_DISABLED_KEY = "permits-disabled";

export const AB_FLAG_STORAGE_KEY = "ab-flags";

export const IS_LARGE_ACCOUNT_KEY = "is-large-account-2";

const FALLBACK_TRACKER_PREFIX = "fallback-tracker";

const COLLATERAL_CLOSE_DESTINATION_KEY = "collateral-close-destination";

const EXPRESS_ORDERS_ENABLED_KEY = "express-orders-enabled";
const GAS_PAYMENT_TOKEN_ADDRESS_KEY = "gas-payment-token-address";

const SUBACCOUNT_APPROVAL_KEY = "subaccount-approval";
const TOKEN_PERMITS_KEY = "token-permits";

const HIGH_LEVERAGE_WARNING_DISMISSED_TIMESTAMP_KEY = "high-leverage-warning-dismissed-timestamp";

export const getIndexerUrlKey = (chainId: number, subgraph: string) => `subgraphUrl:${chainId}:${subgraph}`;

export function getSubaccountApprovalKey(chainId: number, account: string | undefined) {
  if (!chainId || !account) return null;
  return [chainId, account, SUBACCOUNT_APPROVAL_KEY];
}

export function getTokenPermitsKey(chainId: number, account: string | undefined) {
  if (!chainId || !account) return null;
  return [chainId, account, TOKEN_PERMITS_KEY];
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

export function getSyntheticsCollateralEditAddressMapKey(chainId: number) {
  return [chainId, SYNTHETICS_COLLATERAL_EDIT_TOKEN_MAP_KEY];
}

export function getSyntheticsCollateralEditTokenIsFromGmxAccountMapKey(chainId: number) {
  return [chainId, SYNTHETICS_COLLATERAL_EDIT_TOKEN_IS_FROM_GMX_ACCOUNT_KEY];
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

export function getFallbackTrackerKey(trackerKey: string) {
  return `${FALLBACK_TRACKER_PREFIX}:${trackerKey}`;
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

export function getCollateralCloseDestinationKey(chainId: number, account: string | undefined) {
  return [chainId, account, COLLATERAL_CLOSE_DESTINATION_KEY];
}

export function getExpressOrdersEnabledKey(chainId: number, account: string | undefined) {
  return [chainId, account, EXPRESS_ORDERS_ENABLED_KEY];
}

export function getGasPaymentTokenAddressKey(chainId: number, account: string | undefined) {
  return [chainId, account, GAS_PAYMENT_TOKEN_ADDRESS_KEY];
}

export function getOneClickTradingPromoHiddenKey(chainId: number) {
  return `${chainId}-${ONE_CLICK_TRADING_PROMO_HIDDEN_KEY}`;
}

export function getHighLeverageWarningDismissedTimestampKey(account: string) {
  return `${account}-${HIGH_LEVERAGE_WARNING_DISMISSED_TIMESTAMP_KEY}`;
}
