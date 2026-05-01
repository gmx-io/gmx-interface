import { ARBITRUM } from "config/chains";
import { expandDecimals } from "lib/numbers";
import { getTokenBySymbol } from "sdk/configs/tokens";
import { TokenBalanceType } from "sdk/utils/tokens/types";
import type { TokenData } from "sdk/utils/tokens/types";

/**
 * Mock token fixtures backed by production token configs.
 * Addresses are pulled from `sdk/configs/tokens` so tests stay in sync with config changes.
 */

const USDC = getTokenBySymbol(ARBITRUM, "USDC");
const WETH = getTokenBySymbol(ARBITRUM, "WETH");
const BTC = getTokenBySymbol(ARBITRUM, "BTC");

export const USDC_ADDRESS = USDC.address;
export const ETH_ADDRESS = WETH.address;
export const BTC_ADDRESS = BTC.address;

const usdcBalance = expandDecimals(10000, USDC.decimals);
const ethBalance = expandDecimals(10, WETH.decimals);
const btcBalance = expandDecimals(1, BTC.decimals);

export const USDC_TOKEN = {
  ...USDC,
  prices: { minPrice: expandDecimals(1, 30), maxPrice: expandDecimals(1, 30) },
  balance: usdcBalance,
  walletBalance: usdcBalance,
  balanceType: TokenBalanceType.Wallet,
} as TokenData;

// Markets use the WETH address as the ETH index/long token but display it as "ETH".
// Override symbol/name here to mirror that display, so test selectors stay readable.
export const ETH_TOKEN = {
  ...WETH,
  symbol: "ETH",
  name: "Ethereum",
  prices: { minPrice: expandDecimals(2000, 30), maxPrice: expandDecimals(2000, 30) },
  balance: ethBalance,
  walletBalance: ethBalance,
  balanceType: TokenBalanceType.Wallet,
} as TokenData;

export const BTC_TOKEN = {
  ...BTC,
  prices: { minPrice: expandDecimals(60000, 30), maxPrice: expandDecimals(60000, 30) },
  balance: btcBalance,
  walletBalance: btcBalance,
  balanceType: TokenBalanceType.Wallet,
} as TokenData;
