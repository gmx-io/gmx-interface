import isObject from 'lodash/isObject';

const BALANCE_KEY = 'token-balances';
const METADATA_KEY = 'token-metadatas';
const MARKETS_KEY = 'data_store/markets';
const MARKET_STATUS_KEY = 'data_store/market-status';
const MARKET_TOKEN_PRICES_KEY = 'data_store/market-token-prices';
const POSITIONS_KEY = 'data_store/positions';
const ORDERS_KEY = 'data_store/orders';
const USER_ORDER_ADDRESSES_KEY = 'data_store/user-order-addresses';
const GT_DETAILS_KEY = 'data_store/gt-details';
const GT_GLOBAL_DETAILS_KEY = 'data_store/gt-global-details';
const REFERRAL_DETAILS_KEY = 'data_store/referral-details';

/**
 * Filters token balances based on the provided value.
 * @param {unknown} value - The value to be checked.
 * @returns {boolean} True if the value is an object with a key matching BALANCE_KEY, false otherwise.
 */
export const filterBalances = (value: unknown): boolean => {
  if (isObject(value)) {
    const { key } = value as { key?: string };
    if (key === BALANCE_KEY) {
      console.debug('filtered token balances');
      return true;
    }
  }
  return false;
};

/**
 * Filters token metadata based on the provided value.
 * @param {unknown} value - The value to be checked.
 * @returns {boolean} True if the value is an object with a key matching METADATA_KEY, false otherwise.
 */
export const filterMetadatas = (value: unknown): boolean => {
  if (isObject(value)) {
    const { key } = value as { key?: string };
    if (key === METADATA_KEY) {
      console.debug('filtered token metadatas');
      return true;
    }
  }
  return false;
};

/**
 * Filters markets based on the provided value.
 * @param {unknown} value - The value to be checked.
 * @returns {boolean} True if the value is an object with a key matching MARKETS_KEY, false otherwise.
 */
export const filterMarkets = (value: unknown): boolean => {
  if (isObject(value)) {
    const { key } = value as { key?: string };
    if (key === MARKETS_KEY) {
      console.debug('filtered markets');
      return true;
    }
  }
  return false;
};

/**
 * Filters market status based on the provided value.
 * @param {unknown} value - The value to be checked.
 * @returns {boolean} True if the value is an object with a key matching MARKET_STATUS_KEY, false otherwise.
 */
export const filterMarketStatus = (value: unknown): boolean => {
  if (isObject(value)) {
    const { key } = value as { key?: string };
    if (key === MARKET_STATUS_KEY) {
      return true;
    }
  }
  return false;
};

/**
 * Filters market token prices based on the provided value.
 * @param {unknown} value - The value to be checked.
 * @returns {boolean} True if the value is an object with a key matching MARKET_TOKEN_PRICES_KEY, false otherwise.
 */
export const filterMarketTokenPrices = (value: unknown): boolean => {
  if (isObject(value)) {
    const { key } = value as { key?: string };
    if (key === MARKET_TOKEN_PRICES_KEY) {
      return true;
    }
  }
  return false;
};

/**
 * Filters positions based on the provided value.
 * @param {unknown} value - The value to be checked.
 * @returns {boolean} True if the value is an object with a key matching POSITIONS_KEY, false otherwise.
 */
export const filterPositions = (value: unknown): boolean => {
  if (isObject(value)) {
    const { key } = value as { key?: string };
    if (key === POSITIONS_KEY) {
      console.debug('filtered positions');
      return true;
    }
  }
  return false;
};

/**
 * Filters orders based on the provided value.
 * @param {unknown} value - The value to be checked.
 * @returns {boolean} True if the value is an object with a key matching ORDERS_KEY, false otherwise.
 */
export const filterOrders = (value: unknown): boolean => {
  if (isObject(value)) {
    const { key } = value as { key?: string };
    if (key === ORDERS_KEY) {
      console.debug('filtered orders');
      return true;
    }
  }
  return false;
};

/**
 * Filters user order addresses based on the provided value.
 * @param {unknown} value - The value to be checked.
 * @returns {boolean} True if the value is an object with a key matching USER_ORDER_ADDRESSES_KEY, false otherwise.
 */
export const filterUserOrderAddresses = (value: unknown): boolean => {
  if (isObject(value)) {
    const { key } = value as { key?: string };
    if (key === USER_ORDER_ADDRESSES_KEY) {
      console.debug('filtered user order addresses');
      return true;
    }
  }
  return false;
};

/**
 * Filters GT details based on the provided value.
 * @param {unknown} value - The value to be checked.
 * @returns {boolean} True if the value is an object with a key matching GT_DETAILS_KEY, false otherwise.
 */
export const filterGtDetails = (value: unknown): boolean => {
  if (isObject(value)) {
    const { key } = value as { key?: string };
    if (key === GT_DETAILS_KEY) {
      console.debug('filtered gt details');
      return true;
    }
  }
  return false;
};

/**
 * Filters GT global details based on the provided value.
 * @param {unknown} value - The value to be checked.
 * @returns {boolean} True if the value is an object with a key matching GT_GLOBAL_DETAILS_KEY, false otherwise.
 */
export const filterGtGlobalDetails = (value: unknown): boolean => {
  if (isObject(value)) {
    const { key } = value as { key?: string };
    if (key === GT_GLOBAL_DETAILS_KEY) {
      return true;
    }
  }
  return false;
};

/**
 * Filters referral details based on the provided value.
 * @param {unknown} value - The value to be checked.
 * @returns {boolean} True if the value is an object with a key matching REFERRAL_DETAILS_KEY, false otherwise.
 */
export const filterReferralDetails = (value: unknown): boolean => {
  if (isObject(value)) {
    const { key } = value as { key?: string };
    if (key === REFERRAL_DETAILS_KEY) {
      console.debug('filtered referral details');
      return true;
    }
  }
  return false;
};

const USER_KEY = 'store_program/user';

/**
 * Filters user account based on the provided value.
 * @param {unknown} value - The value to be checked.
 * @returns {boolean} True if the value is an object with a key matching USER_KEY, false otherwise.
 */
export const filterUserAccount = (value: unknown): boolean => {
  if (isObject(value)) {
    const { key } = value as { key?: string };
    if (key === USER_KEY) {
      console.debug('filtered user account');
      return true;
    }
  }
  return false;
};
