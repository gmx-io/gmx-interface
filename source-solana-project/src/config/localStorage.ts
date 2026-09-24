export const SYNTHETICS_MARKET_DEPOSIT_TOKEN_KEY =
  'synthetics-market-deposit-token';
export const SYNTHETICS_DEPOSIT_INDEX_TOKEN_KEY =
  'synthetics-deposit-index-token';
export const SYNTHETICS_TRADE_OPTIONS = 'synthetics-trade-options';
export const SYNTHETICS_LIST_SECTION_KEY = 'synthetics-list-section';
export const SYNTHETICS_DEPOSIT_MARKET_KEY = 'synthetics-market-deposit-market';
export const LANGUAGE_LOCALSTORAGE_KEY = 'LANGUAGE_KEY';
export const LANDING_TOTAL_FEES_LABEL_KEY =
  'landing/core-value/total-fees-label';
export const LANDING_CORE_VALUE_APR_KEY = 'landing/core-value/30d-apr';
export const RPC_SETTINGS_KEY = 'rpc-settings';
export const TRADE_CONFIG_LOCALSTORAGE_KEY = 'trade_config';

export function getSyntheticsDepositIndexTokenKey(chainId: string) {
  return [chainId, SYNTHETICS_DEPOSIT_INDEX_TOKEN_KEY];
}

export function getSyntheticsTradeOptionsKey(chainId: string) {
  return [chainId, SYNTHETICS_TRADE_OPTIONS];
}

export function getSyntheticsListSectionKey(chainId: string) {
  return [chainId, SYNTHETICS_LIST_SECTION_KEY];
}

export function getSyntheticsDepositMarketKey(chainId: string) {
  return [chainId, SYNTHETICS_DEPOSIT_MARKET_KEY];
}
