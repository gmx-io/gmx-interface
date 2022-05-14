import React, { useState, useRef, useEffect, useCallback } from "react";
import { InjectedConnector } from "@web3-react/injected-connector";
import {
  WalletConnectConnector,
  UserRejectedRequestError as UserRejectedRequestErrorWalletConnect,
} from "@web3-react/walletconnect-connector";
import { toast } from "react-toastify";
import { useWeb3React, UnsupportedChainIdError } from "@web3-react/core";
import { useLocalStorage } from "react-use";
import { ethers } from "ethers";
import { format as formatDateFn } from "date-fns";
import Token from "./abis/Token.json";
import _ from "lodash";
import { getContract } from "./Addresses";
import useSWR from "swr";

import OrderBookReader from "./abis/OrderBookReader.json";
import OrderBook from "./abis/OrderBook.json";

import { getWhitelistedTokens, isValidToken } from "./data/Tokens";

const { AddressZero } = ethers.constants;

export const UI_VERSION = "1.3";

// use a random placeholder account instead of the zero address as the zero address might have tokens
export const PLACEHOLDER_ACCOUNT = ethers.Wallet.createRandom().address;

export const MAINNET = 56;
export const AVALANCHE = 43114;
export const TESTNET = 97;
export const ARBITRUM_TESTNET = 421611;
export const ARBITRUM = 42161;
// TODO take it from web3
export const DEFAULT_CHAIN_ID = AVALANCHE;
export const CHAIN_ID = DEFAULT_CHAIN_ID;

export const MIN_PROFIT_TIME = 0;

const SELECTED_NETWORK_LOCAL_STORAGE_KEY = "SELECTED_NETWORK";

const CHAIN_NAMES_MAP = {
  [MAINNET]: "BSC",
  [TESTNET]: "BSC Testnet",
  [ARBITRUM_TESTNET]: "Arbitrum Testnet",
  [ARBITRUM]: "Arbitrum",
  [AVALANCHE]: "Avalanche",
};

const GAS_PRICE_ADJUSTMENT_MAP = {
  [ARBITRUM]: "0",
  [AVALANCHE]: "3000000000", // 3 gwei
};

const MAX_GAS_PRICE_MAP = {
  [AVALANCHE]: "200000000000", // 200 gwei
};

const ARBITRUM_RPC_PROVIDERS = ["https://arb1.arbitrum.io/rpc"];
const AVALANCHE_RPC_PROVIDERS = ["https://avax-mainnet.gateway.pokt.network/v1/lb/626f37766c499d003aada23b"];
export const WALLET_CONNECT_LOCALSTORAGE_KEY = "walletconnect";
export const WALLET_LINK_LOCALSTORAGE_PREFIX = "-walletlink";
export const SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY = "eagerconnect";
export const CURRENT_PROVIDER_LOCALSTORAGE_KEY = "currentprovider";

export function getChainName(chainId) {
  return CHAIN_NAMES_MAP[chainId];
}

export const USDG_ADDRESS = getContract(CHAIN_ID, "USDG");
export const MAX_LEVERAGE = 100 * 10000;

export const MAX_PRICE_DEVIATION_BASIS_POINTS = 250;
export const DEFAULT_GAS_LIMIT = 1 * 1000 * 1000;
export const SECONDS_PER_YEAR = 31536000;
export const USDG_DECIMALS = 18;
export const USD_DECIMALS = 30;
export const BASIS_POINTS_DIVISOR = 10000;
export const DEPOSIT_FEE = 30;
export const DUST_BNB = "2000000000000000";
export const DUST_USD = expandDecimals(1, USD_DECIMALS);
export const PRECISION = expandDecimals(1, 30);
export const GLP_DECIMALS = 18;
export const GMX_DECIMALS = 18;
export const DEFAULT_MAX_USDG_AMOUNT = expandDecimals(200 * 1000 * 1000, 18);

export const TAX_BASIS_POINTS = 50;
export const STABLE_TAX_BASIS_POINTS = 5;
export const MINT_BURN_FEE_BASIS_POINTS = 25;
export const SWAP_FEE_BASIS_POINTS = 30;
export const STABLE_SWAP_FEE_BASIS_POINTS = 1;
export const MARGIN_FEE_BASIS_POINTS = 10;

export const LIQUIDATION_FEE = expandDecimals(5, USD_DECIMALS);

export const GLP_COOLDOWN_DURATION = 15 * 60;
export const THRESHOLD_REDEMPTION_VALUE = expandDecimals(993, 27); // 0.993
export const FUNDING_RATE_PRECISION = 1000000;

export const SWAP = "Swap";
export const INCREASE = "Increase";
export const DECREASE = "Decrease";
export const LONG = "Long";
export const SHORT = "Short";

export const MARKET = "Market";
export const LIMIT = "Limit";
export const STOP = "Stop";
export const LEVERAGE_ORDER_OPTIONS = [MARKET, LIMIT];
export const SWAP_ORDER_OPTIONS = [MARKET, LIMIT];
export const SWAP_OPTIONS = [LONG, SHORT, SWAP];
export const DEFAULT_SLIPPAGE_AMOUNT = 30;
export const DEFAULT_HIGHER_SLIPPAGE_AMOUNT = 100;

export const SLIPPAGE_BPS_KEY = "Exchange-swap-slippage-basis-points-v3";
export const IS_PNL_IN_LEVERAGE_KEY = "Exchange-swap-is-pnl-in-leverage";
export const SHOW_PNL_AFTER_FEES_KEY = "Exchange-swap-show-pnl-after-fees";
export const SHOULD_SHOW_POSITION_LINES_KEY = "Exchange-swap-should-show-position-lines";
export const REFERRAL_CODE_KEY = "GMX-referralCode";
export const REFERRAL_CODE_QUERY_PARAMS = "ref";
export const REFERRALS_SELECTED_TAB_KEY = "Referrals-selected-tab";
export const MAX_REFERRAL_CODE_LENGTH = 20;

export const TRIGGER_PREFIX_ABOVE = ">";
export const TRIGGER_PREFIX_BELOW = "<";

export const MIN_PROFIT_BIPS = 0;

export const GLPPOOLCOLORS = {
  ETH: "#6062a6",
  BTC: "#F7931A",
  USDC: "#2775CA",
  "USDC.e": "#2A5ADA",
  USDT: "#67B18A",
  MIM: "#9695F8",
  FRAX: "#000",
  DAI: "#FAC044",
  UNI: "#E9167C",
  AVAX: "#E84142",
  LINK: "#3256D6",
};

export const ICONLINKS = {
  42161: {
    GMX: {
      coingecko: "https://www.coingecko.com/en/coins/gmx",
      arbitrum: "https://arbiscan.io/address/0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a",
    },
    GLP: {
      arbitrum: "https://arbiscan.io/token/0x1aDDD80E6039594eE970E5872D247bf0414C8903",
    },
    ETH: {
      coingecko: "https://www.coingecko.com/en/coins/ethereum",
    },
    BTC: {
      coingecko: "https://www.coingecko.com/en/coins/wrapped-bitcoin",
      arbitrum: "https://arbiscan.io/address/0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f",
    },
    LINK: {
      coingecko: "https://www.coingecko.com/en/coins/chainlink",
      arbitrum: "https://arbiscan.io/address/0xf97f4df75117a78c1a5a0dbb814af92458539fb4",
    },
    UNI: {
      coingecko: "https://www.coingecko.com/en/coins/uniswap",
      arbitrum: "https://arbiscan.io/address/0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0",
    },
    USDC: {
      coingecko: "https://www.coingecko.com/en/coins/usd-coin",
      arbitrum: "https://arbiscan.io/address/0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
    },
    USDT: {
      coingecko: "https://www.coingecko.com/en/coins/tether",
      arbitrum: "https://arbiscan.io/address/0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
    },
    DAI: {
      coingecko: "https://www.coingecko.com/en/coins/dai",
      arbitrum: "https://arbiscan.io/address/0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
    },
    MIM: {
      coingecko: "https://www.coingecko.com/en/coins/magic-internet-money",
      arbitrum: "https://arbiscan.io/address/0xfea7a6a0b346362bf88a9e4a88416b77a57d6c2a",
    },
    FRAX: {
      coingecko: "https://www.coingecko.com/en/coins/frax",
      arbitrum: "https://arbiscan.io/address/0x17fc002b466eec40dae837fc4be5c67993ddbd6f",
    },
  },
  43114: {
    GMX: {
      coingecko: "https://www.coingecko.com/en/coins/gmx",
      avalanche: "https://snowtrace.io/address/0x62edc0692bd897d2295872a9ffcac5425011c661",
    },
    GLP: {
      avalanche: "https://snowtrace.io/address/0x9e295B5B976a184B14aD8cd72413aD846C299660",
    },
    AVAX: {
      coingecko: "https://www.coingecko.com/en/coins/avalanche",
    },
    ETH: {
      coingecko: "https://www.coingecko.com/en/coins/weth",
      avalanche: "https://snowtrace.io/address/0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab",
    },
    BTC: {
      coingecko: "https://www.coingecko.com/en/coins/wrapped-bitcoin",
      avalanche: "https://snowtrace.io/address/0x50b7545627a5162f82a992c33b87adc75187b218",
    },
    MIM: {
      coingecko: "https://www.coingecko.com/en/coins/magic-internet-money",
      avalanche: "https://snowtrace.io/address/0x130966628846bfd36ff31a822705796e8cb8c18d",
    },
    "USDC.e": {
      coingecko: "https://www.coingecko.com/en/coins/usd-coin-avalanche-bridged-usdc-e",
      avalanche: "https://snowtrace.io/address/0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
    },
    USDC: {
      coingecko: "https://www.coingecko.com/en/coins/usd-coin",
      avalanche: "https://snowtrace.io/address/0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e",
    },
  },
};

export const platformTokens = {
  42161: {
    // arbitrum
    GMX: {
      name: "GMX",
      symbol: "GMX",
      decimals: 18,
      address: getContract(ARBITRUM, "GMX"),
      imageUrl: "https://assets.coingecko.com/coins/images/18323/small/arbit.png?1631532468",
    },
    GLP: {
      name: "GMX LP",
      symbol: "GLP",
      decimals: 18,
      address: getContract(ARBITRUM, "StakedGlpTracker"), // address of fsGLP token because user only holds fsGLP
      imageUrl: "https://github.com/gmx-io/gmx-assets/blob/main/GMX-Assets/PNG/GLP_LOGO%20ONLY.png?raw=true",
    },
  },
  43114: {
    // avalanche
    GMX: {
      name: "GMX",
      symbol: "GMX",
      decimals: 18,
      address: getContract(AVALANCHE, "GMX"),
      imageUrl: "https://assets.coingecko.com/coins/images/18323/small/arbit.png?1631532468",
    },
    GLP: {
      name: "GMX LP",
      symbol: "GLP",
      decimals: 18,
      address: getContract(AVALANCHE, "StakedGlpTracker"), // address of fsGLP token because user only holds fsGLP
      imageUrl: "https://github.com/gmx-io/gmx-assets/blob/main/GMX-Assets/PNG/GLP_LOGO%20ONLY.png?raw=true",
    },
  },
};

const supportedChainIds = [ARBITRUM, AVALANCHE];
const injectedConnector = new InjectedConnector({
  supportedChainIds,
});

const getWalletConnectConnector = () => {
  const chainId = localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY) || DEFAULT_CHAIN_ID;
  return new WalletConnectConnector({
    rpc: {
      [AVALANCHE]: AVALANCHE_RPC_PROVIDERS[0],
      [ARBITRUM]: ARBITRUM_RPC_PROVIDERS[0],
    },
    qrcode: true,
    chainId,
  });
};

export function isSupportedChain(chainId) {
  return supportedChainIds.includes(chainId);
}

export function deserialize(data) {
  for (const [key, value] of Object.entries(data)) {
    if (value._type === "BigNumber") {
      data[key] = bigNumberify(value.value);
    }
  }
  return data;
}

export const helperToast = {
  success: (content) => {
    toast.dismiss();
    toast.success(content);
  },
  error: (content) => {
    toast.dismiss();
    toast.error(content);
  },
};

export function useLocalStorageByChainId(chainId, key, defaultValue) {
  const [internalValue, setInternalValue] = useLocalStorage(key, {});

  const setValue = useCallback(
    (value) => {
      setInternalValue((internalValue) => {
        if (typeof value === "function") {
          value = value(internalValue[chainId] || defaultValue);
        }
        const newInternalValue = {
          ...internalValue,
          [chainId]: value,
        };
        return newInternalValue;
      });
    },
    [chainId, setInternalValue, defaultValue]
  );

  let value;
  if (chainId in internalValue) {
    value = internalValue[chainId];
  } else {
    value = defaultValue;
  }

  return [value, setValue];
}

export function useLocalStorageSerializeKey(key, value, opts) {
  key = JSON.stringify(key);
  return useLocalStorage(key, value, opts);
}

function getTriggerPrice(tokenAddress, max, info, orderOption, triggerPriceUsd) {
  // Limit/stop orders are executed with price specified by user
  if (orderOption && orderOption !== MARKET && triggerPriceUsd) {
    return triggerPriceUsd;
  }

  // Market orders are executed with current market price
  if (!info) {
    return;
  }
  if (max && !info.maxPrice) {
    return;
  }
  if (!max && !info.minPrice) {
    return;
  }
  return max ? info.maxPrice : info.minPrice;
}

export function getLiquidationPriceFromDelta({ liquidationAmount, size, collateral, averagePrice, isLong }) {
  if (!size || size.eq(0)) {
    return;
  }

  if (liquidationAmount.gt(collateral)) {
    const liquidationDelta = liquidationAmount.sub(collateral);
    const priceDelta = liquidationDelta.mul(averagePrice).div(size);
    return isLong ? averagePrice.add(priceDelta) : averagePrice.sub(priceDelta);
  }

  const liquidationDelta = collateral.sub(liquidationAmount);
  const priceDelta = liquidationDelta.mul(averagePrice).div(size);

  return isLong ? averagePrice.sub(priceDelta) : averagePrice.add(priceDelta);
}

export const replaceNativeTokenAddress = (path, nativeTokenAddress) => {
  if (!path) {
    return;
  }

  let updatedPath = [];
  for (let i = 0; i < path.length; i++) {
    let address = path[i];
    if (address === AddressZero) {
      address = nativeTokenAddress;
    }
    updatedPath.push(address);
  }

  return updatedPath;
};

export function getMarginFee(sizeDelta) {
  if (!sizeDelta) {
    return bigNumberify(0);
  }
  const afterFeeUsd = sizeDelta.mul(BASIS_POINTS_DIVISOR - MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR);
  return sizeDelta.sub(afterFeeUsd);
}

export function getServerBaseUrl(chainId) {
  if (!chainId) {
    throw new Error("chainId is not provided");
  }
  if (document.location.hostname.includes("deploy-preview")) {
    const fromLocalStorage = localStorage.getItem("SERVER_BASE_URL");
    if (fromLocalStorage) {
      return fromLocalStorage;
    }
  }
  if (chainId === MAINNET) {
    return "https://gambit-server-staging.uc.r.appspot.com";
  } else if (chainId === ARBITRUM_TESTNET) {
    return "https://gambit-l2.as.r.appspot.com";
  } else if (chainId === ARBITRUM) {
    return "https://gmx-server-mainnet.uw.r.appspot.com";
  } else if (chainId === AVALANCHE) {
    return "https://gmx-avax-server.uc.r.appspot.com";
  }
  return "https://gmx-server-mainnet.uw.r.appspot.com";
}

export function getServerUrl(chainId, path) {
  return `${getServerBaseUrl(chainId)}${path}`;
}

export function isTriggerRatioInverted(fromTokenInfo, toTokenInfo) {
  if (!toTokenInfo || !fromTokenInfo) return false;
  if (toTokenInfo.isStable || toTokenInfo.isUsdg) return true;
  if (toTokenInfo.maxPrice) return toTokenInfo.maxPrice.lt(fromTokenInfo.maxPrice);
  return false;
}

export function getExchangeRate(tokenAInfo, tokenBInfo, inverted) {
  if (!tokenAInfo || !tokenAInfo.minPrice || !tokenBInfo || !tokenBInfo.maxPrice) {
    return;
  }
  if (inverted) {
    return tokenAInfo.minPrice.mul(PRECISION).div(tokenBInfo.maxPrice);
  }
  return tokenBInfo.maxPrice.mul(PRECISION).div(tokenAInfo.minPrice);
}

export function getMostAbundantStableToken(chainId, infoTokens) {
  const whitelistedTokens = getWhitelistedTokens(chainId);
  let availableAmount;
  let stableToken = whitelistedTokens.find((t) => t.isStable);
  for (let i = 0; i < whitelistedTokens.length; i++) {
    const info = getTokenInfo(infoTokens, whitelistedTokens[i].address);
    if (!info.isStable || !info.availableAmount) {
      continue;
    }

    const adjustedAvailableAmount = adjustForDecimals(info.availableAmount, info.decimals, USD_DECIMALS);
    if (!availableAmount || adjustedAvailableAmount.gt(availableAmount)) {
      availableAmount = adjustedAvailableAmount;
      stableToken = info;
    }
  }
  return stableToken;
}

export function shouldInvertTriggerRatio(tokenA, tokenB) {
  if (tokenB.isStable || tokenB.isUsdg) return true;
  if (tokenB.maxPrice && tokenA.maxPrice && tokenB.maxPrice.lt(tokenA.maxPrice)) return true;
  return false;
}

export function getExchangeRateDisplay(rate, tokenA, tokenB, opts = {}) {
  if (!rate || !tokenA || !tokenB) return "...";
  if (shouldInvertTriggerRatio(tokenA, tokenB)) {
    [tokenA, tokenB] = [tokenB, tokenA];
    rate = PRECISION.mul(PRECISION).div(rate);
  }
  const rateValue = formatAmount(rate, USD_DECIMALS, tokenA.isStable || tokenA.isUsdg ? 2 : 4, true);
  if (opts.omitSymbols) {
    return rateValue;
  }
  return `${rateValue} ${tokenA.symbol} / ${tokenB.symbol}`;
}

const adjustForDecimalsFactory = (n) => (number) => {
  if (n === 0) {
    return number;
  }
  if (n > 0) {
    return number.mul(expandDecimals(1, n));
  }
  return number.div(expandDecimals(1, -n));
};

export function adjustForDecimals(amount, divDecimals, mulDecimals) {
  return amount.mul(expandDecimals(1, mulDecimals)).div(expandDecimals(1, divDecimals));
}

export function getTargetUsdgAmount(token, usdgSupply, totalTokenWeights) {
  if (!token || !token.weight || !usdgSupply) {
    return;
  }

  if (usdgSupply.eq(0)) {
    return bigNumberify(0);
  }

  return token.weight.mul(usdgSupply).div(totalTokenWeights);
}

export function getFeeBasisPoints(
  token,
  usdgDelta,
  feeBasisPoints,
  taxBasisPoints,
  increment,
  usdgSupply,
  totalTokenWeights
) {
  if (!token || !token.usdgAmount || !usdgSupply || !totalTokenWeights) {
    return 0;
  }

  feeBasisPoints = bigNumberify(feeBasisPoints);
  taxBasisPoints = bigNumberify(taxBasisPoints);

  const initialAmount = token.usdgAmount;
  let nextAmount = initialAmount.add(usdgDelta);
  if (!increment) {
    nextAmount = usdgDelta.gt(initialAmount) ? bigNumberify(0) : initialAmount.sub(usdgDelta);
  }

  const targetAmount = getTargetUsdgAmount(token, usdgSupply, totalTokenWeights);
  if (!targetAmount || targetAmount.eq(0)) {
    return feeBasisPoints.toNumber();
  }

  const initialDiff = initialAmount.gt(targetAmount)
    ? initialAmount.sub(targetAmount)
    : targetAmount.sub(initialAmount);
  const nextDiff = nextAmount.gt(targetAmount) ? nextAmount.sub(targetAmount) : targetAmount.sub(nextAmount);

  if (nextDiff.lt(initialDiff)) {
    const rebateBps = taxBasisPoints.mul(initialDiff).div(targetAmount);
    return rebateBps.gt(feeBasisPoints) ? 0 : feeBasisPoints.sub(rebateBps).toNumber();
  }

  let averageDiff = initialDiff.add(nextDiff).div(2);
  if (averageDiff.gt(targetAmount)) {
    averageDiff = targetAmount;
  }
  const taxBps = taxBasisPoints.mul(averageDiff).div(targetAmount);
  return feeBasisPoints.add(taxBps).toNumber();
}

export function getBuyGlpToAmount(fromAmount, swapTokenAddress, infoTokens, glpPrice, usdgSupply, totalTokenWeights) {
  const defaultValue = { amount: bigNumberify(0), feeBasisPoints: 0 };
  if (!fromAmount || !swapTokenAddress || !infoTokens || !glpPrice || !usdgSupply || !totalTokenWeights) {
    return defaultValue;
  }

  const swapToken = getTokenInfo(infoTokens, swapTokenAddress);
  if (!swapToken || !swapToken.minPrice) {
    return defaultValue;
  }

  let glpAmount = fromAmount.mul(swapToken.minPrice).div(glpPrice);
  glpAmount = adjustForDecimals(glpAmount, swapToken.decimals, USDG_DECIMALS);

  let usdgAmount = fromAmount.mul(swapToken.minPrice).div(PRECISION);
  usdgAmount = adjustForDecimals(usdgAmount, swapToken.decimals, USDG_DECIMALS);
  const feeBasisPoints = getFeeBasisPoints(
    swapToken,
    usdgAmount,
    MINT_BURN_FEE_BASIS_POINTS,
    TAX_BASIS_POINTS,
    true,
    usdgSupply,
    totalTokenWeights
  );

  glpAmount = glpAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints).div(BASIS_POINTS_DIVISOR);

  return { amount: glpAmount, feeBasisPoints };
}

export function getSellGlpFromAmount(toAmount, swapTokenAddress, infoTokens, glpPrice, usdgSupply, totalTokenWeights) {
  const defaultValue = { amount: bigNumberify(0), feeBasisPoints: 0 };
  if (!toAmount || !swapTokenAddress || !infoTokens || !glpPrice || !usdgSupply || !totalTokenWeights) {
    return defaultValue;
  }

  const swapToken = getTokenInfo(infoTokens, swapTokenAddress);
  if (!swapToken || !swapToken.maxPrice) {
    return defaultValue;
  }

  let glpAmount = toAmount.mul(swapToken.maxPrice).div(glpPrice);
  glpAmount = adjustForDecimals(glpAmount, swapToken.decimals, USDG_DECIMALS);

  let usdgAmount = toAmount.mul(swapToken.maxPrice).div(PRECISION);
  usdgAmount = adjustForDecimals(usdgAmount, swapToken.decimals, USDG_DECIMALS);
  const feeBasisPoints = getFeeBasisPoints(
    swapToken,
    usdgAmount,
    MINT_BURN_FEE_BASIS_POINTS,
    TAX_BASIS_POINTS,
    false,
    usdgSupply,
    totalTokenWeights
  );

  glpAmount = glpAmount.mul(BASIS_POINTS_DIVISOR).div(BASIS_POINTS_DIVISOR - feeBasisPoints);

  return { amount: glpAmount, feeBasisPoints };
}

export function getBuyGlpFromAmount(toAmount, fromTokenAddress, infoTokens, glpPrice, usdgSupply, totalTokenWeights) {
  const defaultValue = { amount: bigNumberify(0) };
  if (!toAmount || !fromTokenAddress || !infoTokens || !glpPrice || !usdgSupply || !totalTokenWeights) {
    return defaultValue;
  }

  const fromToken = getTokenInfo(infoTokens, fromTokenAddress);
  if (!fromToken || !fromToken.minPrice) {
    return defaultValue;
  }

  let fromAmount = toAmount.mul(glpPrice).div(fromToken.minPrice);
  fromAmount = adjustForDecimals(fromAmount, GLP_DECIMALS, fromToken.decimals);

  const usdgAmount = toAmount.mul(glpPrice).div(PRECISION);
  const feeBasisPoints = getFeeBasisPoints(
    fromToken,
    usdgAmount,
    MINT_BURN_FEE_BASIS_POINTS,
    TAX_BASIS_POINTS,
    true,
    usdgSupply,
    totalTokenWeights
  );

  fromAmount = fromAmount.mul(BASIS_POINTS_DIVISOR).div(BASIS_POINTS_DIVISOR - feeBasisPoints);

  return { amount: fromAmount, feeBasisPoints };
}

export function getSellGlpToAmount(toAmount, fromTokenAddress, infoTokens, glpPrice, usdgSupply, totalTokenWeights) {
  const defaultValue = { amount: bigNumberify(0) };
  if (!toAmount || !fromTokenAddress || !infoTokens || !glpPrice || !usdgSupply || !totalTokenWeights) {
    return defaultValue;
  }

  const fromToken = getTokenInfo(infoTokens, fromTokenAddress);
  if (!fromToken || !fromToken.maxPrice) {
    return defaultValue;
  }

  let fromAmount = toAmount.mul(glpPrice).div(fromToken.maxPrice);
  fromAmount = adjustForDecimals(fromAmount, GLP_DECIMALS, fromToken.decimals);

  const usdgAmount = toAmount.mul(glpPrice).div(PRECISION);
  const feeBasisPoints = getFeeBasisPoints(
    fromToken,
    usdgAmount,
    MINT_BURN_FEE_BASIS_POINTS,
    TAX_BASIS_POINTS,
    false,
    usdgSupply,
    totalTokenWeights
  );

  fromAmount = fromAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints).div(BASIS_POINTS_DIVISOR);

  return { amount: fromAmount, feeBasisPoints };
}

export function getNextFromAmount(
  chainId,
  toAmount,
  fromTokenAddress,
  toTokenAddress,
  infoTokens,
  toTokenPriceUsd,
  ratio,
  usdgSupply,
  totalTokenWeights
) {
  const defaultValue = { amount: bigNumberify(0) };

  if (!toAmount || !fromTokenAddress || !toTokenAddress || !infoTokens) {
    return defaultValue;
  }

  if (fromTokenAddress === toTokenAddress) {
    return { amount: toAmount };
  }

  const fromToken = getTokenInfo(infoTokens, fromTokenAddress);
  const toToken = getTokenInfo(infoTokens, toTokenAddress);

  if (fromToken.isNative && toToken.isWrapped) {
    return { amount: toAmount };
  }

  if (fromToken.isWrapped && toToken.isNative) {
    return { amount: toAmount };
  }

  if (!fromToken || !fromToken.minPrice || !toToken || !toToken.maxPrice) {
    return defaultValue;
  }

  const adjustDecimals = adjustForDecimalsFactory(fromToken.decimals - toToken.decimals);

  let fromAmountBasedOnRatio;
  if (ratio && !ratio.isZero()) {
    fromAmountBasedOnRatio = toAmount.mul(ratio).div(PRECISION);
  }

  if (toTokenAddress === USDG_ADDRESS) {
    const feeBasisPoints = getSwapFeeBasisPoints(fromToken.isStable);

    if (ratio && !ratio.isZero()) {
      return {
        amount: adjustDecimals(
          fromAmountBasedOnRatio.mul(BASIS_POINTS_DIVISOR + feeBasisPoints).div(BASIS_POINTS_DIVISOR)
        ),
      };
    }
    const fromAmount = toAmount.mul(PRECISION).div(fromToken.maxPrice);
    return {
      amount: adjustDecimals(fromAmount.mul(BASIS_POINTS_DIVISOR + feeBasisPoints).div(BASIS_POINTS_DIVISOR)),
    };
  }

  if (fromTokenAddress === USDG_ADDRESS) {
    const redemptionValue = toToken.redemptionAmount.mul(toToken.maxPrice).div(expandDecimals(1, toToken.decimals));
    if (redemptionValue.gt(THRESHOLD_REDEMPTION_VALUE)) {
      const feeBasisPoints = getSwapFeeBasisPoints(toToken.isStable);

      const fromAmount =
        ratio && !ratio.isZero()
          ? fromAmountBasedOnRatio
          : toAmount.mul(expandDecimals(1, toToken.decimals)).div(toToken.redemptionAmount);

      return {
        amount: adjustDecimals(fromAmount.mul(BASIS_POINTS_DIVISOR + feeBasisPoints).div(BASIS_POINTS_DIVISOR)),
      };
    }

    const expectedAmount = toAmount.mul(toToken.maxPrice).div(PRECISION);

    const stableToken = getMostAbundantStableToken(chainId, infoTokens);
    if (!stableToken || stableToken.availableAmount.lt(expectedAmount)) {
      const feeBasisPoints = getSwapFeeBasisPoints(toToken.isStable);

      const fromAmount =
        ratio && !ratio.isZero()
          ? fromAmountBasedOnRatio
          : toAmount.mul(expandDecimals(1, toToken.decimals)).div(toToken.redemptionAmount);

      return {
        amount: adjustDecimals(fromAmount.mul(BASIS_POINTS_DIVISOR + feeBasisPoints).div(BASIS_POINTS_DIVISOR)),
      };
    }

    const feeBasisPoints0 = getSwapFeeBasisPoints(true);
    const feeBasisPoints1 = getSwapFeeBasisPoints(false);

    if (ratio && !ratio.isZero()) {
      // apply fees twice usdg -> token1 -> token2
      const fromAmount = fromAmountBasedOnRatio
        .mul(BASIS_POINTS_DIVISOR + feeBasisPoints0 + feeBasisPoints1)
        .div(BASIS_POINTS_DIVISOR);
      return {
        amount: adjustDecimals(fromAmount),
        path: [USDG_ADDRESS, stableToken.address, toToken.address],
      };
    }

    // get fromAmount for stableToken => toToken
    let fromAmount = toAmount.mul(toToken.maxPrice).div(stableToken.minPrice);

    // apply stableToken => toToken fees
    fromAmount = fromAmount.mul(BASIS_POINTS_DIVISOR + feeBasisPoints1).div(BASIS_POINTS_DIVISOR);

    // get fromAmount for USDG => stableToken
    fromAmount = fromAmount.mul(stableToken.maxPrice).div(PRECISION);

    // apply USDG => stableToken fees
    fromAmount = fromAmount.mul(BASIS_POINTS_DIVISOR + feeBasisPoints0).div(BASIS_POINTS_DIVISOR);

    return {
      amount: adjustDecimals(fromAmount),
      path: [USDG_ADDRESS, stableToken.address, toToken.address],
    };
  }

  const fromAmount =
    ratio && !ratio.isZero() ? fromAmountBasedOnRatio : toAmount.mul(toToken.maxPrice).div(fromToken.minPrice);

  let usdgAmount = fromAmount.mul(fromToken.minPrice).div(PRECISION);
  usdgAmount = adjustForDecimals(usdgAmount, toToken.decimals, USDG_DECIMALS);
  const swapFeeBasisPoints =
    fromToken.isStable && toToken.isStable ? STABLE_SWAP_FEE_BASIS_POINTS : SWAP_FEE_BASIS_POINTS;
  const taxBasisPoints = fromToken.isStable && toToken.isStable ? STABLE_TAX_BASIS_POINTS : TAX_BASIS_POINTS;
  const feeBasisPoints0 = getFeeBasisPoints(
    fromToken,
    usdgAmount,
    swapFeeBasisPoints,
    taxBasisPoints,
    true,
    usdgSupply,
    totalTokenWeights
  );
  const feeBasisPoints1 = getFeeBasisPoints(
    toToken,
    usdgAmount,
    swapFeeBasisPoints,
    taxBasisPoints,
    false,
    usdgSupply,
    totalTokenWeights
  );
  const feeBasisPoints = feeBasisPoints0 > feeBasisPoints1 ? feeBasisPoints0 : feeBasisPoints1;

  return {
    amount: adjustDecimals(fromAmount.mul(BASIS_POINTS_DIVISOR).div(BASIS_POINTS_DIVISOR - feeBasisPoints)),
    feeBasisPoints,
  };
}

export function getNextToAmount(
  chainId,
  fromAmount,
  fromTokenAddress,
  toTokenAddress,
  infoTokens,
  toTokenPriceUsd,
  ratio,
  usdgSupply,
  totalTokenWeights
) {
  const defaultValue = { amount: bigNumberify(0) };
  if (!fromAmount || !fromTokenAddress || !toTokenAddress || !infoTokens) {
    return defaultValue;
  }

  if (fromTokenAddress === toTokenAddress) {
    return { amount: fromAmount };
  }

  const fromToken = getTokenInfo(infoTokens, fromTokenAddress);
  const toToken = getTokenInfo(infoTokens, toTokenAddress);

  if (fromToken.isNative && toToken.isWrapped) {
    return { amount: fromAmount };
  }

  if (fromToken.isWrapped && toToken.isNative) {
    return { amount: fromAmount };
  }

  if (!fromToken || !fromToken.minPrice || !toToken || !toToken.maxPrice) {
    return defaultValue;
  }

  const adjustDecimals = adjustForDecimalsFactory(toToken.decimals - fromToken.decimals);

  let toAmountBasedOnRatio = bigNumberify(0);
  if (ratio && !ratio.isZero()) {
    toAmountBasedOnRatio = fromAmount.mul(PRECISION).div(ratio);
  }

  if (toTokenAddress === USDG_ADDRESS) {
    const feeBasisPoints = getSwapFeeBasisPoints(fromToken.isStable);

    if (ratio && !ratio.isZero()) {
      const toAmount = toAmountBasedOnRatio;
      return {
        amount: adjustDecimals(toAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints).div(BASIS_POINTS_DIVISOR)),
        feeBasisPoints,
      };
    }

    const toAmount = fromAmount.mul(fromToken.minPrice).div(PRECISION);
    return {
      amount: adjustDecimals(toAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints).div(BASIS_POINTS_DIVISOR)),
      feeBasisPoints,
    };
  }

  if (fromTokenAddress === USDG_ADDRESS) {
    const redemptionValue = toToken.redemptionAmount
      .mul(toTokenPriceUsd || toToken.maxPrice)
      .div(expandDecimals(1, toToken.decimals));

    if (redemptionValue.gt(THRESHOLD_REDEMPTION_VALUE)) {
      const feeBasisPoints = getSwapFeeBasisPoints(toToken.isStable);

      const toAmount =
        ratio && !ratio.isZero()
          ? toAmountBasedOnRatio
          : fromAmount.mul(toToken.redemptionAmount).div(expandDecimals(1, toToken.decimals));

      return {
        amount: adjustDecimals(toAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints).div(BASIS_POINTS_DIVISOR)),
        feeBasisPoints,
      };
    }

    const expectedAmount = fromAmount;

    const stableToken = getMostAbundantStableToken(chainId, infoTokens);
    if (!stableToken || stableToken.availableAmount.lt(expectedAmount)) {
      const toAmount =
        ratio && !ratio.isZero()
          ? toAmountBasedOnRatio
          : fromAmount.mul(toToken.redemptionAmount).div(expandDecimals(1, toToken.decimals));
      const feeBasisPoints = getSwapFeeBasisPoints(toToken.isStable);
      return {
        amount: adjustDecimals(toAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints).div(BASIS_POINTS_DIVISOR)),
        feeBasisPoints,
      };
    }

    const feeBasisPoints0 = getSwapFeeBasisPoints(true);
    const feeBasisPoints1 = getSwapFeeBasisPoints(false);

    if (ratio && !ratio.isZero()) {
      const toAmount = toAmountBasedOnRatio
        .mul(BASIS_POINTS_DIVISOR - feeBasisPoints0 - feeBasisPoints1)
        .div(BASIS_POINTS_DIVISOR);
      return {
        amount: adjustDecimals(toAmount),
        path: [USDG_ADDRESS, stableToken.address, toToken.address],
        feeBasisPoints: feeBasisPoints0 + feeBasisPoints1,
      };
    }

    // get toAmount for USDG => stableToken
    let toAmount = fromAmount.mul(PRECISION).div(stableToken.maxPrice);
    // apply USDG => stableToken fees
    toAmount = toAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints0).div(BASIS_POINTS_DIVISOR);

    // get toAmount for stableToken => toToken
    toAmount = toAmount.mul(stableToken.minPrice).div(toTokenPriceUsd || toToken.maxPrice);
    // apply stableToken => toToken fees
    toAmount = toAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints1).div(BASIS_POINTS_DIVISOR);

    return {
      amount: adjustDecimals(toAmount),
      path: [USDG_ADDRESS, stableToken.address, toToken.address],
      feeBasisPoints: feeBasisPoints0 + feeBasisPoints1,
    };
  }

  const toAmount =
    ratio && !ratio.isZero()
      ? toAmountBasedOnRatio
      : fromAmount.mul(fromToken.minPrice).div(toTokenPriceUsd || toToken.maxPrice);

  let usdgAmount = fromAmount.mul(fromToken.minPrice).div(PRECISION);
  usdgAmount = adjustForDecimals(usdgAmount, fromToken.decimals, USDG_DECIMALS);
  const swapFeeBasisPoints =
    fromToken.isStable && toToken.isStable ? STABLE_SWAP_FEE_BASIS_POINTS : SWAP_FEE_BASIS_POINTS;
  const taxBasisPoints = fromToken.isStable && toToken.isStable ? STABLE_TAX_BASIS_POINTS : TAX_BASIS_POINTS;
  const feeBasisPoints0 = getFeeBasisPoints(
    fromToken,
    usdgAmount,
    swapFeeBasisPoints,
    taxBasisPoints,
    true,
    usdgSupply,
    totalTokenWeights
  );
  const feeBasisPoints1 = getFeeBasisPoints(
    toToken,
    usdgAmount,
    swapFeeBasisPoints,
    taxBasisPoints,
    false,
    usdgSupply,
    totalTokenWeights
  );
  const feeBasisPoints = feeBasisPoints0 > feeBasisPoints1 ? feeBasisPoints0 : feeBasisPoints1;

  return {
    amount: adjustDecimals(toAmount.mul(BASIS_POINTS_DIVISOR - feeBasisPoints).div(BASIS_POINTS_DIVISOR)),
    feeBasisPoints,
  };
}

export function getProfitPrice(closePrice, position) {
  let profitPrice;
  if (position && position.averagePrice && closePrice) {
    profitPrice = position.isLong
      ? position.averagePrice.mul(BASIS_POINTS_DIVISOR + MIN_PROFIT_BIPS).div(BASIS_POINTS_DIVISOR)
      : position.averagePrice.mul(BASIS_POINTS_DIVISOR - MIN_PROFIT_BIPS).div(BASIS_POINTS_DIVISOR);
  }
  return profitPrice;
}

export function calculatePositionDelta(
  price,
  { size, collateral, isLong, averagePrice, lastIncreasedTime },
  sizeDelta
) {
  if (!sizeDelta) {
    sizeDelta = size;
  }
  const priceDelta = averagePrice.gt(price) ? averagePrice.sub(price) : price.sub(averagePrice);
  let delta = sizeDelta.mul(priceDelta).div(averagePrice);
  const pendingDelta = delta;

  const minProfitExpired = lastIncreasedTime + MIN_PROFIT_TIME < Date.now() / 1000;
  const hasProfit = isLong ? price.gt(averagePrice) : price.lt(averagePrice);
  if (!minProfitExpired && hasProfit && delta.mul(BASIS_POINTS_DIVISOR).lte(size.mul(MIN_PROFIT_BIPS))) {
    delta = bigNumberify(0);
  }

  const deltaPercentage = delta.mul(BASIS_POINTS_DIVISOR).div(collateral);
  const pendingDeltaPercentage = pendingDelta.mul(BASIS_POINTS_DIVISOR).div(collateral);

  return {
    delta,
    pendingDelta,
    pendingDeltaPercentage,
    hasProfit,
    deltaPercentage,
  };
}

export function getDeltaStr({ delta, deltaPercentage, hasProfit }) {
  let deltaStr;
  let deltaPercentageStr;

  if (delta.gt(0)) {
    deltaStr = hasProfit ? "+" : "-";
    deltaPercentageStr = hasProfit ? "+" : "-";
  } else {
    deltaStr = "";
    deltaPercentageStr = "";
  }
  deltaStr += `$${formatAmount(delta, USD_DECIMALS, 2, true)}`;
  deltaPercentageStr += `${formatAmount(deltaPercentage, 2, 2)}%`;

  return { deltaStr, deltaPercentageStr };
}

export function getLeverage({
  size,
  sizeDelta,
  increaseSize,
  collateral,
  collateralDelta,
  increaseCollateral,
  entryFundingRate,
  cumulativeFundingRate,
  hasProfit,
  delta,
  includeDelta,
}) {
  if (!size && !sizeDelta) {
    return;
  }
  if (!collateral && !collateralDelta) {
    return;
  }

  let nextSize = size ? size : bigNumberify(0);
  if (sizeDelta) {
    if (increaseSize) {
      nextSize = size.add(sizeDelta);
    } else {
      if (sizeDelta.gte(size)) {
        return;
      }
      nextSize = size.sub(sizeDelta);
    }
  }

  let remainingCollateral = collateral ? collateral : bigNumberify(0);
  if (collateralDelta) {
    if (increaseCollateral) {
      remainingCollateral = collateral.add(collateralDelta);
    } else {
      if (collateralDelta.gte(collateral)) {
        return;
      }
      remainingCollateral = collateral.sub(collateralDelta);
    }
  }

  if (delta && includeDelta) {
    if (hasProfit) {
      remainingCollateral = remainingCollateral.add(delta);
    } else {
      if (delta.gt(remainingCollateral)) {
        return;
      }

      remainingCollateral = remainingCollateral.sub(delta);
    }
  }

  if (remainingCollateral.eq(0)) {
    return;
  }

  remainingCollateral = sizeDelta
    ? remainingCollateral.mul(BASIS_POINTS_DIVISOR - MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR)
    : remainingCollateral;
  if (entryFundingRate && cumulativeFundingRate) {
    const fundingFee = size.mul(cumulativeFundingRate.sub(entryFundingRate)).div(FUNDING_RATE_PRECISION);
    remainingCollateral = remainingCollateral.sub(fundingFee);
  }

  return nextSize.mul(BASIS_POINTS_DIVISOR).div(remainingCollateral);
}

export function getLiquidationPrice(data) {
  let {
    isLong,
    size,
    collateral,
    averagePrice,
    entryFundingRate,
    cumulativeFundingRate,
    sizeDelta,
    collateralDelta,
    increaseCollateral,
    increaseSize,
    delta,
    hasProfit,
    includeDelta,
  } = data;
  if (!size || !collateral || !averagePrice) {
    return;
  }

  let nextSize = size ? size : bigNumberify(0);
  let remainingCollateral = collateral;

  if (sizeDelta) {
    if (increaseSize) {
      nextSize = size.add(sizeDelta);
    } else {
      if (sizeDelta.gte(size)) {
        return;
      }
      nextSize = size.sub(sizeDelta);
    }

    if (includeDelta && !hasProfit) {
      const adjustedDelta = sizeDelta.mul(delta).div(size);
      remainingCollateral = remainingCollateral.sub(adjustedDelta);
    }
  }

  if (collateralDelta) {
    if (increaseCollateral) {
      remainingCollateral = remainingCollateral.add(collateralDelta);
    } else {
      if (collateralDelta.gte(remainingCollateral)) {
        return;
      }
      remainingCollateral = remainingCollateral.sub(collateralDelta);
    }
  }

  let positionFee = getMarginFee(size).add(LIQUIDATION_FEE);
  if (entryFundingRate && cumulativeFundingRate) {
    const fundingFee = size.mul(cumulativeFundingRate.sub(entryFundingRate)).div(FUNDING_RATE_PRECISION);
    positionFee = positionFee.add(fundingFee);
  }

  const liquidationPriceForFees = getLiquidationPriceFromDelta({
    liquidationAmount: positionFee,
    size: nextSize,
    collateral: remainingCollateral,
    averagePrice,
    isLong,
  });

  const liquidationPriceForMaxLeverage = getLiquidationPriceFromDelta({
    liquidationAmount: nextSize.mul(BASIS_POINTS_DIVISOR).div(MAX_LEVERAGE),
    size: nextSize,
    collateral: remainingCollateral,
    averagePrice,
    isLong,
  });

  if (!liquidationPriceForFees) {
    return liquidationPriceForMaxLeverage;
  }
  if (!liquidationPriceForMaxLeverage) {
    return liquidationPriceForFees;
  }

  if (isLong) {
    // return the higher price
    return liquidationPriceForFees.gt(liquidationPriceForMaxLeverage)
      ? liquidationPriceForFees
      : liquidationPriceForMaxLeverage;
  }

  // return the lower price
  return liquidationPriceForFees.lt(liquidationPriceForMaxLeverage)
    ? liquidationPriceForFees
    : liquidationPriceForMaxLeverage;
}

export function getUsd(amount, tokenAddress, max, infoTokens, orderOption, triggerPriceUsd) {
  if (!amount) {
    return;
  }
  if (tokenAddress === USDG_ADDRESS) {
    return amount.mul(PRECISION).div(expandDecimals(1, 18));
  }
  const info = getTokenInfo(infoTokens, tokenAddress);
  const price = getTriggerPrice(tokenAddress, max, info, orderOption, triggerPriceUsd);
  if (!price) {
    return;
  }

  return amount.mul(price).div(expandDecimals(1, info.decimals));
}

export function getPositionKey(account, collateralTokenAddress, indexTokenAddress, isLong, nativeTokenAddress) {
  const tokenAddress0 = collateralTokenAddress === AddressZero ? nativeTokenAddress : collateralTokenAddress;
  const tokenAddress1 = indexTokenAddress === AddressZero ? nativeTokenAddress : indexTokenAddress;
  return account + ":" + tokenAddress0 + ":" + tokenAddress1 + ":" + isLong;
}

export function getPositionContractKey(account, collateralToken, indexToken, isLong) {
  return ethers.utils.solidityKeccak256(
    ["address", "address", "address", "bool"],
    [account, collateralToken, indexToken, isLong]
  );
}

export function getSwapFeeBasisPoints(isStable) {
  return isStable ? STABLE_SWAP_FEE_BASIS_POINTS : SWAP_FEE_BASIS_POINTS;
}

// BSC TESTNET
// const RPC_PROVIDERS = [
//   "https://data-seed-prebsc-1-s1.binance.org:8545",
//   "https://data-seed-prebsc-2-s1.binance.org:8545",
//   "https://data-seed-prebsc-1-s2.binance.org:8545",
//   "https://data-seed-prebsc-2-s2.binance.org:8545",
//   "https://data-seed-prebsc-1-s3.binance.org:8545",
//   "https://data-seed-prebsc-2-s3.binance.org:8545"
// ]

// BSC MAINNET
export const BSC_RPC_PROVIDERS = [
  "https://bsc-dataseed.binance.org",
  "https://bsc-dataseed1.defibit.io",
  "https://bsc-dataseed1.ninicoin.io",
  "https://bsc-dataseed2.defibit.io",
  "https://bsc-dataseed3.defibit.io",
  "https://bsc-dataseed4.defibit.io",
  "https://bsc-dataseed2.ninicoin.io",
  "https://bsc-dataseed3.ninicoin.io",
  "https://bsc-dataseed4.ninicoin.io",
  "https://bsc-dataseed1.binance.org",
  "https://bsc-dataseed2.binance.org",
  "https://bsc-dataseed3.binance.org",
  "https://bsc-dataseed4.binance.org",
];

const RPC_PROVIDERS = {
  [MAINNET]: BSC_RPC_PROVIDERS,
  [ARBITRUM]: ARBITRUM_RPC_PROVIDERS,
  [AVALANCHE]: AVALANCHE_RPC_PROVIDERS,
};

const FALLBACK_PROVIDERS = {
  [ARBITRUM]: ["https://arb-mainnet.g.alchemy.com/v2/ha7CFsr1bx5ZItuR6VZBbhKozcKDY4LZ"],
  [AVALANCHE]: ["https://avax-mainnet.gateway.pokt.network/v1/lb/626f37766c499d003aada23b"],
};

export function shortenAddress(address, length) {
  if (!length) {
    return "";
  }
  if (!address) {
    return address;
  }
  if (address.length < 10) {
    return address;
  }
  let left = Math.floor((length - 3) / 2) + 1;
  return address.substring(0, left) + "..." + address.substring(address.length - (length - (left + 3)), address.length);
}

export function formatDateTime(time) {
  return formatDateFn(time * 1000, "dd MMM yyyy, h:mm a");
}

export function getTimeRemaining(time) {
  const now = parseInt(Date.now() / 1000);
  if (time < now) {
    return "0h 0m";
  }
  const diff = time - now;
  const hours = parseInt(diff / (60 * 60));
  const minutes = parseInt((diff - hours * 60 * 60) / 60);
  return `${hours}h ${minutes}m`;
}

export function formatDate(time) {
  return formatDateFn(time * 1000, "dd MMM yyyy");
}

export function hasMetaMaskWalletExtension() {
  return window.ethereum;
}

export function hasCoinBaseWalletExtension() {
  const { ethereum } = window;

  if (!ethereum?.providers && !ethereum?.isCoinbaseWallet) {
    return false;
  }
  return window.ethereum.isCoinbaseWallet || ethereum.providers.find(({ isCoinbaseWallet }) => isCoinbaseWallet);
}

export function activateInjectedProvider(providerName) {
  const { ethereum } = window;

  if (!ethereum?.providers && !ethereum?.isCoinbaseWallet && !ethereum?.isMetaMask) {
    return undefined;
  }

  let provider;
  if (ethereum?.providers) {
    switch (providerName) {
      case "CoinBase":
        provider = ethereum.providers.find(({ isCoinbaseWallet }) => isCoinbaseWallet);
        break;
      case "MetaMask":
      default:
        provider = ethereum.providers.find(({ isMetaMask }) => isMetaMask);
        break;
    }
  }

  if (provider) {
    ethereum.setSelectedProvider(provider);
  }
}

export function getInjectedConnector() {
  return injectedConnector;
}

export function useChainId() {
  let { chainId } = useWeb3React();

  if (!chainId) {
    const chainIdFromLocalStorage = localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY);
    if (chainIdFromLocalStorage) {
      chainId = parseInt(chainIdFromLocalStorage);
      if (!chainId) {
        // localstorage value is invalid
        localStorage.removeItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY);
      }
    }
  }

  if (!chainId || !supportedChainIds.includes(chainId)) {
    chainId = DEFAULT_CHAIN_ID;
  }
  return { chainId };
}

export function useENS(address) {
  const [ensName, setENSName] = useState();

  useEffect(() => {
    async function resolveENS() {
      if (address) {
        const provider = new ethers.providers.JsonRpcProvider("https://rpc.ankr.com/eth");
        const name = await provider.lookupAddress(address.toLowerCase());
        if (name) setENSName(name);
      }
    }
    resolveENS();
  }, [address]);

  return { ensName };
}

export function clearWalletConnectData() {
  localStorage.removeItem(WALLET_CONNECT_LOCALSTORAGE_KEY);
}

export function clearWalletLinkData() {
  Object.entries(localStorage)
    .map((x) => x[0])
    .filter((x) => x.startsWith(WALLET_LINK_LOCALSTORAGE_PREFIX))
    .map((x) => localStorage.removeItem(x));
}

export function useEagerConnect(setActivatingConnector) {
  const { activate, active } = useWeb3React();
  const [tried, setTried] = useState(false);

  useEffect(() => {
    (async function () {
      if (Boolean(localStorage.getItem(SHOULD_EAGER_CONNECT_LOCALSTORAGE_KEY)) !== true) {
        // only works with WalletConnect
        clearWalletConnectData();
        // force clear localStorage connection for MM/CB Wallet (Brave legacy)
        clearWalletLinkData();
        return;
      }

      let shouldTryWalletConnect = false;
      try {
        // naive validation to not trigger Wallet Connect if data is corrupted
        const rawData = localStorage.getItem(WALLET_CONNECT_LOCALSTORAGE_KEY);
        if (rawData) {
          const data = JSON.parse(rawData);
          if (data && data.connected) {
            shouldTryWalletConnect = true;
          }
        }
      } catch (ex) {
        if (ex instanceof SyntaxError) {
          // rawData is not a valid json
          clearWalletConnectData();
        }
      }

      if (shouldTryWalletConnect) {
        try {
          const connector = getWalletConnectConnector();
          setActivatingConnector(connector);
          await activate(connector, undefined, true);
          // in case Wallet Connect is activated no need to check injected wallet
          return;
        } catch (ex) {
          // assume data in localstorage is corrupted and delete it to not retry on next page load
          clearWalletConnectData();
        }
      }

      try {
        const connector = getInjectedConnector();
        const currentProviderName = localStorage.getItem(CURRENT_PROVIDER_LOCALSTORAGE_KEY) ?? false;
        if (currentProviderName !== false) {
          activateInjectedProvider(currentProviderName);
        }
        const authorized = await connector.isAuthorized();
        if (authorized) {
          setActivatingConnector(connector);
          await activate(connector, undefined, true);
        }
      } catch (ex) {}

      setTried(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally only running on mount (make sure it's only mounted once :))

  // if the connection worked, wait until we get confirmation of that to flip the flag
  useEffect(() => {
    if (!tried && active) {
      setTried(true);
    }
  }, [tried, active]);

  return tried;
}

export function useInactiveListener(suppress = false) {
  const injected = getInjectedConnector();
  const { active, error, activate } = useWeb3React();

  useEffect(() => {
    const { ethereum } = window;
    if (ethereum && ethereum.on && !active && !error && !suppress) {
      const handleConnect = () => {
        activate(injected);
      };
      const handleChainChanged = (chainId) => {
        activate(injected);
      };
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          activate(injected);
        }
      };
      const handleNetworkChanged = (networkId) => {
        activate(injected);
      };

      ethereum.on("connect", handleConnect);
      ethereum.on("chainChanged", handleChainChanged);
      ethereum.on("accountsChanged", handleAccountsChanged);
      ethereum.on("networkChanged", handleNetworkChanged);

      return () => {
        if (ethereum.removeListener) {
          ethereum.removeListener("connect", handleConnect);
          ethereum.removeListener("chainChanged", handleChainChanged);
          ethereum.removeListener("accountsChanged", handleAccountsChanged);
          ethereum.removeListener("networkChanged", handleNetworkChanged);
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, error, suppress, activate]);
}

export function getProvider(library, chainId) {
  let provider;
  if (library) {
    return library.getSigner();
  }
  provider = _.sample(RPC_PROVIDERS[chainId]);
  return new ethers.providers.StaticJsonRpcProvider(provider, { chainId });
}

export function getFallbackProvider(chainId) {
  if (!FALLBACK_PROVIDERS[chainId]) {
    return;
  }

  const provider = _.sample(FALLBACK_PROVIDERS[chainId]);
  return new ethers.providers.StaticJsonRpcProvider(provider, { chainId });
}

export const getContractCall = ({ provider, contractInfo, arg0, arg1, method, params, additionalArgs, onError }) => {
  if (ethers.utils.isAddress(arg0)) {
    const address = arg0;
    const contract = new ethers.Contract(address, contractInfo.abi, provider);

    if (additionalArgs) {
      return contract[method](...params.concat(additionalArgs));
    }
    return contract[method](...params);
  }

  if (!provider) {
    return;
  }

  return provider[method](arg1, ...params);
};

// prettier-ignore
export const fetcher = (library, contractInfo, additionalArgs) => (...args) => {
  // eslint-disable-next-line
  const [id, chainId, arg0, arg1, ...params] = args;
  const provider = getProvider(library, chainId);

  const method = ethers.utils.isAddress(arg0) ? arg1 : arg0;

  const contractCall = getContractCall({
    provider,
    contractInfo,
    arg0,
    arg1,
    method,
    params,
    additionalArgs,
  })

  let shouldCallFallback = true

  const handleFallback = async (resolve, reject, error) => {
    if (!shouldCallFallback) {
      return
    }
    // prevent fallback from being called twice
    shouldCallFallback = false

    const fallbackProvider = getFallbackProvider(chainId)
    if (!fallbackProvider) {
      reject(error)
      return
    }

    console.info("using fallbackProvider for", method)
    const fallbackContractCall = getContractCall({
      provider: fallbackProvider,
      contractInfo,
      arg0,
      arg1,
      method,
      params,
      additionalArgs,
    })

    fallbackContractCall.then((result) => resolve(result)).catch((e) => {
      console.error("fallback fetcher error", id, contractInfo.contractName, method, e);
      reject(e)
    })
  }

  return new Promise(async (resolve, reject) => {
    contractCall.then((result) => {
      shouldCallFallback = false
      resolve(result)
    }).catch((e) => {
      console.error("fetcher error", id, contractInfo.contractName, method, e);
      handleFallback(resolve, reject, e)
    })

    setTimeout(() => {
      handleFallback(resolve, reject, "contractCall timeout")
    }, 2000)
  })
};

export function bigNumberify(n) {
  return ethers.BigNumber.from(n);
}

export function expandDecimals(n, decimals) {
  return bigNumberify(n).mul(bigNumberify(10).pow(decimals));
}

export const trimZeroDecimals = (amount) => {
  if (parseFloat(amount) === parseInt(amount)) {
    return parseInt(amount).toString();
  }
  return amount;
};

export const limitDecimals = (amount, maxDecimals) => {
  let amountStr = amount.toString();
  if (maxDecimals === undefined) {
    return amountStr;
  }
  if (maxDecimals === 0) {
    return amountStr.split(".")[0];
  }
  const dotIndex = amountStr.indexOf(".");
  if (dotIndex !== -1) {
    let decimals = amountStr.length - dotIndex - 1;
    if (decimals > maxDecimals) {
      amountStr = amountStr.substr(0, amountStr.length - (decimals - maxDecimals));
    }
  }
  return amountStr;
};

export const padDecimals = (amount, minDecimals) => {
  let amountStr = amount.toString();
  const dotIndex = amountStr.indexOf(".");
  if (dotIndex !== -1) {
    const decimals = amountStr.length - dotIndex - 1;
    if (decimals < minDecimals) {
      amountStr = amountStr.padEnd(amountStr.length + (minDecimals - decimals), "0");
    }
  } else {
    amountStr = amountStr + ".0000";
  }
  return amountStr;
};

export const formatKeyAmount = (map, key, tokenDecimals, displayDecimals, useCommas) => {
  if (!map || !map[key]) {
    return "...";
  }

  return formatAmount(map[key], tokenDecimals, displayDecimals, useCommas);
};

export const formatArrayAmount = (arr, index, tokenDecimals, displayDecimals, useCommas) => {
  if (!arr || !arr[index]) {
    return "...";
  }

  return formatAmount(arr[index], tokenDecimals, displayDecimals, useCommas);
};

function _parseOrdersData(ordersData, account, indexes, extractor, uintPropsLength, addressPropsLength) {
  if (!ordersData || ordersData.length === 0) {
    return [];
  }
  const [uintProps, addressProps] = ordersData;
  const count = uintProps.length / uintPropsLength;

  const orders = [];
  for (let i = 0; i < count; i++) {
    const sliced = addressProps
      .slice(addressPropsLength * i, addressPropsLength * (i + 1))
      .concat(uintProps.slice(uintPropsLength * i, uintPropsLength * (i + 1)));

    if (sliced[0] === AddressZero && sliced[1] === AddressZero) {
      continue;
    }

    const order = extractor(sliced);
    order.index = indexes[i];
    order.account = account;
    orders.push(order);
  }

  return orders;
}

function parseDecreaseOrdersData(chainId, decreaseOrdersData, account, indexes) {
  const extractor = (sliced) => {
    const isLong = sliced[4].toString() === "1";
    return {
      collateralToken: sliced[0],
      indexToken: sliced[1],
      collateralDelta: sliced[2],
      sizeDelta: sliced[3],
      isLong,
      triggerPrice: sliced[5],
      triggerAboveThreshold: sliced[6].toString() === "1",
      type: DECREASE,
    };
  };
  return _parseOrdersData(decreaseOrdersData, account, indexes, extractor, 5, 2).filter((order) => {
    return isValidToken(chainId, order.collateralToken) && isValidToken(chainId, order.indexToken);
  });
}

function parseIncreaseOrdersData(chainId, increaseOrdersData, account, indexes) {
  const extractor = (sliced) => {
    const isLong = sliced[5].toString() === "1";
    return {
      purchaseToken: sliced[0],
      collateralToken: sliced[1],
      indexToken: sliced[2],
      purchaseTokenAmount: sliced[3],
      sizeDelta: sliced[4],
      isLong,
      triggerPrice: sliced[6],
      triggerAboveThreshold: sliced[7].toString() === "1",
      type: INCREASE,
    };
  };
  return _parseOrdersData(increaseOrdersData, account, indexes, extractor, 5, 3).filter((order) => {
    return (
      isValidToken(chainId, order.purchaseToken) &&
      isValidToken(chainId, order.collateralToken) &&
      isValidToken(chainId, order.indexToken)
    );
  });
}

function parseSwapOrdersData(chainId, swapOrdersData, account, indexes) {
  if (!swapOrdersData || !swapOrdersData.length) {
    return [];
  }

  const extractor = (sliced) => {
    const triggerAboveThreshold = sliced[6].toString() === "1";
    const shouldUnwrap = sliced[7].toString() === "1";

    return {
      path: [sliced[0], sliced[1], sliced[2]].filter((address) => address !== AddressZero),
      amountIn: sliced[3],
      minOut: sliced[4],
      triggerRatio: sliced[5],
      triggerAboveThreshold,
      type: SWAP,
      shouldUnwrap,
    };
  };
  return _parseOrdersData(swapOrdersData, account, indexes, extractor, 5, 3).filter((order) => {
    return order.path.every((token) => isValidToken(chainId, token));
  });
}

export function getOrderKey(order) {
  return `${order.type}-${order.account}-${order.index}`;
}

export function useAccountOrders(flagOrdersEnabled, overrideAccount) {
  const { library, account: connectedAccount } = useWeb3React();
  const active = true; // this is used in Actions.js so set active to always be true
  const account = overrideAccount || connectedAccount;

  const { chainId } = useChainId();
  const shouldRequest = active && account && flagOrdersEnabled;

  const orderBookAddress = getContract(chainId, "OrderBook");
  const orderBookReaderAddress = getContract(chainId, "OrderBookReader");
  const key = shouldRequest ? [active, chainId, orderBookAddress, account] : false;
  const {
    data: orders = [],
    mutate: updateOrders,
    error: ordersError,
  } = useSWR(key, {
    dedupingInterval: 5000,
    fetcher: async (active, chainId, orderBookAddress, account) => {
      const provider = getProvider(library, chainId);
      const orderBookContract = new ethers.Contract(orderBookAddress, OrderBook.abi, provider);
      const orderBookReaderContract = new ethers.Contract(orderBookReaderAddress, OrderBookReader.abi, provider);

      const fetchIndexesFromServer = () => {
        const ordersIndexesUrl = `${getServerBaseUrl(chainId)}/orders_indices?account=${account}`;
        return fetch(ordersIndexesUrl)
          .then(async (res) => {
            const json = await res.json();
            const ret = {};
            for (const key of Object.keys(json)) {
              ret[key.toLowerCase()] = json[key].map((val) => parseInt(val.value));
            }

            return ret;
          })
          .catch(() => ({ swap: [], increase: [], decrease: [] }));
      };

      const fetchLastIndex = async (type) => {
        const method = type.toLowerCase() + "OrdersIndex";
        return await orderBookContract[method](account).then((res) => bigNumberify(res._hex).toNumber());
      };

      const fetchLastIndexes = async () => {
        const [swap, increase, decrease] = await Promise.all([
          fetchLastIndex("swap"),
          fetchLastIndex("increase"),
          fetchLastIndex("decrease"),
        ]);

        return { swap, increase, decrease };
      };

      const getRange = (to, from) => {
        const LIMIT = 10;
        const _indexes = [];
        from = from || Math.max(to - LIMIT, 0);
        for (let i = to - 1; i >= from; i--) {
          _indexes.push(i);
        }
        return _indexes;
      };

      const getIndexes = (knownIndexes, lastIndex) => {
        if (knownIndexes.length === 0) {
          return getRange(lastIndex);
        }
        return [
          ...knownIndexes,
          ...getRange(lastIndex, knownIndexes[knownIndexes.length - 1] + 1).sort((a, b) => b - a),
        ];
      };

      const getOrders = async (method, knownIndexes, lastIndex, parseFunc) => {
        const indexes = getIndexes(knownIndexes, lastIndex);
        const ordersData = await orderBookReaderContract[method](orderBookAddress, account, indexes);
        const orders = parseFunc(chainId, ordersData, account, indexes);

        return orders;
      };

      try {
        const [serverIndexes, lastIndexes] = await Promise.all([fetchIndexesFromServer(), fetchLastIndexes()]);
        const [swapOrders = [], increaseOrders = [], decreaseOrders = []] = await Promise.all([
          getOrders("getSwapOrders", serverIndexes.swap, lastIndexes.swap, parseSwapOrdersData),
          getOrders("getIncreaseOrders", serverIndexes.increase, lastIndexes.increase, parseIncreaseOrdersData),
          getOrders("getDecreaseOrders", serverIndexes.decrease, lastIndexes.decrease, parseDecreaseOrdersData),
        ]);
        return [...swapOrders, ...increaseOrders, ...decreaseOrders];
      } catch (ex) {
        console.error(ex);
      }
    },
  });

  return [orders, updateOrders, ordersError];
}

export const formatAmount = (amount, tokenDecimals, displayDecimals, useCommas, defaultValue) => {
  if (!defaultValue) {
    defaultValue = "...";
  }
  if (amount === undefined || amount.toString().length === 0) {
    return defaultValue;
  }
  if (displayDecimals === undefined) {
    displayDecimals = 4;
  }
  let amountStr = ethers.utils.formatUnits(amount, tokenDecimals);
  amountStr = limitDecimals(amountStr, displayDecimals);
  if (displayDecimals !== 0) {
    amountStr = padDecimals(amountStr, displayDecimals);
  }
  if (useCommas) {
    return numberWithCommas(amountStr);
  }
  return amountStr;
};

export const formatAmountFree = (amount, tokenDecimals, displayDecimals) => {
  if (!amount) {
    return "...";
  }
  let amountStr = ethers.utils.formatUnits(amount, tokenDecimals);
  amountStr = limitDecimals(amountStr, displayDecimals);
  return trimZeroDecimals(amountStr);
};

export const parseValue = (value, tokenDecimals) => {
  const pValue = parseFloat(value);
  if (isNaN(pValue)) {
    return undefined;
  }
  value = limitDecimals(value, tokenDecimals);
  const amount = ethers.utils.parseUnits(value, tokenDecimals);
  return bigNumberify(amount);
};

export function numberWithCommas(x) {
  if (!x) {
    return "...";
  }
  var parts = x.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

export function getExplorerUrl(chainId) {
  if (chainId === 3) {
    return "https://ropsten.etherscan.io/";
  } else if (chainId === 42) {
    return "https://kovan.etherscan.io/";
  } else if (chainId === MAINNET) {
    return "https://bscscan.com/";
  } else if (chainId === TESTNET) {
    return "https://testnet.bscscan.com/";
  } else if (chainId === ARBITRUM_TESTNET) {
    return "https://rinkeby-explorer.arbitrum.io/";
  } else if (chainId === ARBITRUM) {
    return "https://arbiscan.io/";
  } else if (chainId === AVALANCHE) {
    return "https://snowtrace.io/";
  }
  return "https://etherscan.io/";
}

export function getAccountUrl(chainId, account) {
  if (!account) {
    return getExplorerUrl(chainId);
  }
  return getExplorerUrl(chainId) + "address/" + account;
}

export function getTokenUrl(chainId, address) {
  if (!address) {
    return getExplorerUrl(chainId);
  }
  return getExplorerUrl(chainId) + "token/" + address;
}

export function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export async function setGasPrice(txnOpts, provider, chainId) {
  let maxGasPrice = MAX_GAS_PRICE_MAP[chainId];
  const premium = GAS_PRICE_ADJUSTMENT_MAP[chainId] || bigNumberify(0);

  if (maxGasPrice) {
    const gasPrice = await provider.getGasPrice();
    if (gasPrice.gt(maxGasPrice)) {
      maxGasPrice = gasPrice;
    }

    const feeData = await provider.getFeeData();
    txnOpts.maxFeePerGas = maxGasPrice;
    txnOpts.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas.add(premium);
  } else {
    const gasPrice = await provider.getGasPrice();
    txnOpts.gasPrice = gasPrice.add(premium);
  }
}

export async function getGasLimit(contract, method, params = [], value, gasBuffer) {
  const defaultGasBuffer = 300000;
  const defaultValue = bigNumberify(0);

  if (!value) {
    value = defaultValue;
  }

  let gasLimit = await contract.estimateGas[method](...params, { value });

  if (!gasBuffer) {
    gasBuffer = defaultGasBuffer;
  }

  return gasLimit.add(gasBuffer);
}

export function approveTokens({
  setIsApproving,
  library,
  tokenAddress,
  spender,
  chainId,
  onApproveSubmitted,
  getTokenInfo,
  infoTokens,
  pendingTxns,
  setPendingTxns,
  includeMessage,
}) {
  setIsApproving(true);
  const contract = new ethers.Contract(tokenAddress, Token.abi, library.getSigner());
  contract
    .approve(spender, ethers.constants.MaxUint256)
    .then(async (res) => {
      const txUrl = getExplorerUrl(chainId) + "tx/" + res.hash;
      helperToast.success(
        <div>
          Approval submitted!{" "}
          <a href={txUrl} target="_blank" rel="noopener noreferrer">
            View status.
          </a>
          <br />
        </div>
      );
      if (onApproveSubmitted) {
        onApproveSubmitted();
      }
      if (getTokenInfo && infoTokens && pendingTxns && setPendingTxns) {
        const token = getTokenInfo(infoTokens, tokenAddress);
        const pendingTxn = {
          hash: res.hash,
          message: includeMessage ? `${token.symbol} Approved!` : false,
        };
        setPendingTxns([...pendingTxns, pendingTxn]);
      }
    })
    .catch((e) => {
      console.error(e);
      let failMsg;
      if (
        ["not enough funds for gas", "failed to execute call with revert code InsufficientGasFunds"].includes(
          e.data?.message
        )
      ) {
        failMsg = (
          <div>
            There is not enough ETH in your account on Arbitrum to send this transaction.
            <br />
            <br />
            <a href={"https://arbitrum.io/bridge-tutorial/"} target="_blank" rel="noopener noreferrer">
              Bridge ETH to Arbitrum
            </a>
          </div>
        );
      } else if (e.message?.includes("User denied transaction signature")) {
        failMsg = "Approval was cancelled.";
      } else {
        failMsg = "Approval failed.";
      }
      helperToast.error(failMsg);
    })
    .finally(() => {
      setIsApproving(false);
    });
}

export const shouldRaiseGasError = (token, amount) => {
  if (!amount) {
    return false;
  }
  if (token.address !== AddressZero) {
    return false;
  }
  if (!token.balance) {
    return false;
  }
  if (amount.gte(token.balance)) {
    return true;
  }
  if (token.balance.sub(amount).lt(DUST_BNB)) {
    return true;
  }
  return false;
};

export const getTokenInfo = (infoTokens, tokenAddress, replaceNative, nativeTokenAddress) => {
  if (replaceNative && tokenAddress === nativeTokenAddress) {
    return infoTokens[AddressZero];
  }
  return infoTokens[tokenAddress];
};

const NETWORK_METADATA = {
  [MAINNET]: {
    chainId: "0x" + MAINNET.toString(16),
    chainName: "BSC",
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
    rpcUrls: BSC_RPC_PROVIDERS,
    blockExplorerUrls: ["https://bscscan.com"],
  },
  [TESTNET]: {
    chainId: "0x" + TESTNET.toString(16),
    chainName: "BSC Testnet",
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
    rpcUrls: ["https://data-seed-prebsc-1-s1.binance.org:8545/"],
    blockExplorerUrls: ["https://testnet.bscscan.com/"],
  },
  [ARBITRUM_TESTNET]: {
    chainId: "0x" + ARBITRUM_TESTNET.toString(16),
    chainName: "Arbitrum Testnet",
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: ["https://rinkeby.arbitrum.io/rpc"],
    blockExplorerUrls: ["https://rinkeby-explorer.arbitrum.io/"],
  },
  [ARBITRUM]: {
    chainId: "0x" + ARBITRUM.toString(16),
    chainName: "Arbitrum",
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: ARBITRUM_RPC_PROVIDERS,
    blockExplorerUrls: [getExplorerUrl(ARBITRUM)],
  },
  [AVALANCHE]: {
    chainId: "0x" + AVALANCHE.toString(16),
    chainName: "Avalanche",
    nativeCurrency: {
      name: "AVAX",
      symbol: "AVAX",
      decimals: 18,
    },
    rpcUrls: AVALANCHE_RPC_PROVIDERS,
    blockExplorerUrls: [getExplorerUrl(AVALANCHE)],
  },
};

export const addBscNetwork = async () => {
  return addNetwork(NETWORK_METADATA[MAINNET]);
};

export const addNetwork = async (metadata) => {
  await window.ethereum.request({ method: "wallet_addEthereumChain", params: [metadata] }).catch();
};

export const switchNetwork = async (chainId, active) => {
  if (!active) {
    // chainId in localStorage allows to switch network even if wallet is not connected
    // or there is no wallet at all
    localStorage.setItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY, chainId);
    document.location.reload();
    return;
  }

  try {
    const chainIdHex = "0x" + chainId.toString(16);
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
    helperToast.success("Connected to " + getChainName(chainId));
    return getChainName(chainId);
  } catch (ex) {
    // https://docs.metamask.io/guide/rpc-api.html#other-rpc-methods
    // This error code indicates that the chain has not been added to MetaMask.
    // 4001 error means user has denied the request
    // If the error code is not 4001, then we need to add the network
    if (ex.code !== 4001) {
      return await addNetwork(NETWORK_METADATA[chainId]);
    }

    console.error("error", ex);
  }
};

export const getWalletConnectHandler = (activate, deactivate, setActivatingConnector) => {
  const fn = async () => {
    const walletConnect = getWalletConnectConnector();
    setActivatingConnector(walletConnect);
    activate(walletConnect, (ex) => {
      if (ex instanceof UnsupportedChainIdError) {
        helperToast.error("Unsupported chain. Switch to Arbitrum network on your wallet and try again");
        console.warn(ex);
      } else if (!(ex instanceof UserRejectedRequestErrorWalletConnect)) {
        helperToast.error(ex.message);
        console.warn(ex);
      }
      clearWalletConnectData();
      deactivate();
    });
  };
  return fn;
};

export const getInjectedHandler = (activate) => {
  const fn = async () => {
    activate(getInjectedConnector(), (e) => {
      const chainId = localStorage.getItem(SELECTED_NETWORK_LOCAL_STORAGE_KEY) || DEFAULT_CHAIN_ID;

      if (e instanceof UnsupportedChainIdError) {
        helperToast.error(
          <div>
            <div>Your wallet is not connected to {getChainName(chainId)}.</div>
            <br />
            <div className="clickable underline margin-bottom" onClick={() => switchNetwork(chainId, true)}>
              Switch to {getChainName(chainId)}
            </div>
            <div className="clickable underline" onClick={() => switchNetwork(chainId, true)}>
              Add {getChainName(chainId)}
            </div>
          </div>
        );
        return;
      }
      const errString = e.message ?? e.toString();
      helperToast.error(errString);
    });
  };
  return fn;
};

export function isMobileDevice(navigator) {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function setTokenUsingIndexPrices(token, indexPrices, nativeTokenAddress) {
  if (!indexPrices) {
    return;
  }

  const tokenAddress = token.isNative ? nativeTokenAddress : token.address;

  const indexPrice = indexPrices[tokenAddress];
  if (!indexPrice) {
    return;
  }

  const indexPriceBn = bigNumberify(indexPrice);
  if (indexPriceBn.eq(0)) {
    return;
  }

  const spread = token.maxPrice.sub(token.minPrice);
  const spreadBps = spread.mul(BASIS_POINTS_DIVISOR).div(token.maxPrice);

  if (spreadBps.gt(MAX_PRICE_DEVIATION_BASIS_POINTS - 50)) {
    // only set one of the values as there will be a spread between the index price and the Chainlink price
    if (indexPriceBn.gt(token.minPrimaryPrice)) {
      token.maxPrice = indexPriceBn;
    } else {
      token.minPrice = indexPriceBn;
    }
    return;
  }

  const halfSpreadBps = spreadBps.div(2).toNumber();
  token.maxPrice = indexPriceBn.mul(BASIS_POINTS_DIVISOR + halfSpreadBps).div(BASIS_POINTS_DIVISOR);
  token.minPrice = indexPriceBn.mul(BASIS_POINTS_DIVISOR - halfSpreadBps).div(BASIS_POINTS_DIVISOR);
}

export function getInfoTokens(
  tokens,
  tokenBalances,
  whitelistedTokens,
  vaultTokenInfo,
  fundingRateInfo,
  vaultPropsLength,
  indexPrices,
  nativeTokenAddress
) {
  if (!vaultPropsLength) {
    vaultPropsLength = 14;
  }
  const fundingRatePropsLength = 2;
  const infoTokens = {};

  for (let i = 0; i < tokens.length; i++) {
    const token = JSON.parse(JSON.stringify(tokens[i]));
    if (tokenBalances) {
      token.balance = tokenBalances[i];
    }
    if (token.address === USDG_ADDRESS) {
      token.minPrice = expandDecimals(1, USD_DECIMALS);
      token.maxPrice = expandDecimals(1, USD_DECIMALS);
    }
    infoTokens[token.address] = token;
  }

  for (let i = 0; i < whitelistedTokens.length; i++) {
    const token = JSON.parse(JSON.stringify(whitelistedTokens[i]));
    if (vaultTokenInfo) {
      token.poolAmount = vaultTokenInfo[i * vaultPropsLength];
      token.reservedAmount = vaultTokenInfo[i * vaultPropsLength + 1];
      token.availableAmount = token.poolAmount.sub(token.reservedAmount);
      token.usdgAmount = vaultTokenInfo[i * vaultPropsLength + 2];
      token.redemptionAmount = vaultTokenInfo[i * vaultPropsLength + 3];
      token.weight = vaultTokenInfo[i * vaultPropsLength + 4];
      token.bufferAmount = vaultTokenInfo[i * vaultPropsLength + 5];
      token.maxUsdgAmount = vaultTokenInfo[i * vaultPropsLength + 6];
      token.globalShortSize = vaultTokenInfo[i * vaultPropsLength + 7];
      token.maxGlobalShortSize = vaultTokenInfo[i * vaultPropsLength + 8];
      token.minPrice = vaultTokenInfo[i * vaultPropsLength + 9];
      token.maxPrice = vaultTokenInfo[i * vaultPropsLength + 10];
      token.guaranteedUsd = vaultTokenInfo[i * vaultPropsLength + 11];
      token.maxPrimaryPrice = vaultTokenInfo[i * vaultPropsLength + 12];
      token.minPrimaryPrice = vaultTokenInfo[i * vaultPropsLength + 13];

      // save minPrice and maxPrice as setTokenUsingIndexPrices may override it
      token.contractMinPrice = token.minPrice;
      token.contractMaxPrice = token.maxPrice;

      token.maxAvailableShort = bigNumberify(0);
      if (token.maxGlobalShortSize.gt(0)) {
        if (token.maxGlobalShortSize.gt(token.globalShortSize)) {
          token.maxAvailableShort = token.maxGlobalShortSize.sub(token.globalShortSize);
        }
      }

      if (token.maxUsdgAmount.eq(0)) {
        token.maxUsdgAmount = DEFAULT_MAX_USDG_AMOUNT;
      }

      token.availableUsd = token.isStable
        ? token.poolAmount.mul(token.minPrice).div(expandDecimals(1, token.decimals))
        : token.availableAmount.mul(token.minPrice).div(expandDecimals(1, token.decimals));

      token.managedUsd = token.availableUsd.add(token.guaranteedUsd);
      token.managedAmount = token.managedUsd.mul(expandDecimals(1, token.decimals)).div(token.minPrice);

      setTokenUsingIndexPrices(token, indexPrices, nativeTokenAddress);
    }

    if (fundingRateInfo) {
      token.fundingRate = fundingRateInfo[i * fundingRatePropsLength];
      token.cumulativeFundingRate = fundingRateInfo[i * fundingRatePropsLength + 1];
    }

    if (infoTokens[token.address]) {
      token.balance = infoTokens[token.address].balance;
    }

    infoTokens[token.address] = token;
  }

  return infoTokens;
}

export const CHART_PERIODS = {
  "5m": 60 * 5,
  "15m": 60 * 15,
  "1h": 60 * 60,
  "4h": 60 * 60 * 4,
  "1d": 60 * 60 * 24,
};

export function getTotalVolumeSum(volumes) {
  if (!volumes || volumes.length === 0) {
    return;
  }

  let volume = bigNumberify(0);
  for (let i = 0; i < volumes.length; i++) {
    volume = volume.add(volumes[i].data.volume);
  }

  return volume;
}

export function getBalanceAndSupplyData(balances) {
  if (!balances || balances.length === 0) {
    return {};
  }

  const keys = ["gmx", "esGmx", "glp", "stakedGmxTracker"];
  const balanceData = {};
  const supplyData = {};
  const propsLength = 2;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    balanceData[key] = balances[i * propsLength];
    supplyData[key] = balances[i * propsLength + 1];
  }

  return { balanceData, supplyData };
}

export function getDepositBalanceData(depositBalances) {
  if (!depositBalances || depositBalances.length === 0) {
    return;
  }

  const keys = [
    "gmxInStakedGmx",
    "esGmxInStakedGmx",
    "stakedGmxInBonusGmx",
    "bonusGmxInFeeGmx",
    "bnGmxInFeeGmx",
    "glpInStakedGlp",
  ];
  const data = {};

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    data[key] = depositBalances[i];
  }

  return data;
}

export function getVestingData(vestingInfo) {
  if (!vestingInfo || vestingInfo.length === 0) {
    return;
  }

  const keys = ["gmxVester", "glpVester"];
  const data = {};
  const propsLength = 7;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    data[key] = {
      pairAmount: vestingInfo[i * propsLength],
      vestedAmount: vestingInfo[i * propsLength + 1],
      escrowedBalance: vestingInfo[i * propsLength + 2],
      claimedAmounts: vestingInfo[i * propsLength + 3],
      claimable: vestingInfo[i * propsLength + 4],
      maxVestableAmount: vestingInfo[i * propsLength + 5],
      averageStakedAmount: vestingInfo[i * propsLength + 6],
    };

    data[key + "PairAmount"] = data[key].pairAmount;
    data[key + "VestedAmount"] = data[key].vestedAmount;
    data[key + "EscrowedBalance"] = data[key].escrowedBalance;
    data[key + "ClaimSum"] = data[key].claimedAmounts.add(data[key].claimable);
    data[key + "Claimable"] = data[key].claimable;
    data[key + "MaxVestableAmount"] = data[key].maxVestableAmount;
    data[key + "AverageStakedAmount"] = data[key].averageStakedAmount;
  }

  return data;
}

export function getStakingData(stakingInfo) {
  if (!stakingInfo || stakingInfo.length === 0) {
    return;
  }

  const keys = ["stakedGmxTracker", "bonusGmxTracker", "feeGmxTracker", "stakedGlpTracker", "feeGlpTracker"];
  const data = {};
  const propsLength = 5;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    data[key] = {
      claimable: stakingInfo[i * propsLength],
      tokensPerInterval: stakingInfo[i * propsLength + 1],
      averageStakedAmounts: stakingInfo[i * propsLength + 2],
      cumulativeRewards: stakingInfo[i * propsLength + 3],
      totalSupply: stakingInfo[i * propsLength + 4],
    };
  }

  return data;
}

export function getProcessedData(
  balanceData,
  supplyData,
  depositBalanceData,
  stakingData,
  vestingData,
  aum,
  nativeTokenPrice,
  stakedGmxSupply,
  gmxPrice,
  gmxSupply
) {
  if (
    !balanceData ||
    !supplyData ||
    !depositBalanceData ||
    !stakingData ||
    !vestingData ||
    !aum ||
    !nativeTokenPrice ||
    !stakedGmxSupply ||
    !gmxPrice ||
    !gmxSupply
  ) {
    return {};
  }

  const data = {};

  data.gmxBalance = balanceData.gmx;
  data.gmxBalanceUsd = balanceData.gmx.mul(gmxPrice).div(expandDecimals(1, 18));

  data.gmxSupply = bigNumberify(gmxSupply);

  data.gmxSupplyUsd = data.gmxSupply.mul(gmxPrice).div(expandDecimals(1, 18));
  data.stakedGmxSupply = stakedGmxSupply;
  data.stakedGmxSupplyUsd = stakedGmxSupply.mul(gmxPrice).div(expandDecimals(1, 18));
  data.gmxInStakedGmx = depositBalanceData.gmxInStakedGmx;
  data.gmxInStakedGmxUsd = depositBalanceData.gmxInStakedGmx.mul(gmxPrice).div(expandDecimals(1, 18));

  data.esGmxBalance = balanceData.esGmx;
  data.esGmxBalanceUsd = balanceData.esGmx.mul(gmxPrice).div(expandDecimals(1, 18));

  data.stakedGmxTrackerSupply = supplyData.stakedGmxTracker;
  data.stakedGmxTrackerSupplyUsd = supplyData.stakedGmxTracker.mul(gmxPrice).div(expandDecimals(1, 18));
  data.stakedEsGmxSupply = data.stakedGmxTrackerSupply.sub(data.stakedGmxSupply);
  data.stakedEsGmxSupplyUsd = data.stakedEsGmxSupply.mul(gmxPrice).div(expandDecimals(1, 18));

  data.esGmxInStakedGmx = depositBalanceData.esGmxInStakedGmx;
  data.esGmxInStakedGmxUsd = depositBalanceData.esGmxInStakedGmx.mul(gmxPrice).div(expandDecimals(1, 18));

  data.bnGmxInFeeGmx = depositBalanceData.bnGmxInFeeGmx;
  data.bonusGmxInFeeGmx = depositBalanceData.bonusGmxInFeeGmx;
  data.feeGmxSupply = stakingData.feeGmxTracker.totalSupply;
  data.feeGmxSupplyUsd = data.feeGmxSupply.mul(gmxPrice).div(expandDecimals(1, 18));

  data.stakedGmxTrackerRewards = stakingData.stakedGmxTracker.claimable;
  data.stakedGmxTrackerRewardsUsd = stakingData.stakedGmxTracker.claimable.mul(gmxPrice).div(expandDecimals(1, 18));

  data.bonusGmxTrackerRewards = stakingData.bonusGmxTracker.claimable;

  data.feeGmxTrackerRewards = stakingData.feeGmxTracker.claimable;
  data.feeGmxTrackerRewardsUsd = stakingData.feeGmxTracker.claimable.mul(nativeTokenPrice).div(expandDecimals(1, 18));

  data.boostBasisPoints = bigNumberify(0);
  if (data && data.bnGmxInFeeGmx && data.bonusGmxInFeeGmx && data.bonusGmxInFeeGmx.gt(0)) {
    data.boostBasisPoints = data.bnGmxInFeeGmx.mul(BASIS_POINTS_DIVISOR).div(data.bonusGmxInFeeGmx);
  }

  data.stakedGmxTrackerAnnualRewardsUsd = stakingData.stakedGmxTracker.tokensPerInterval
    .mul(SECONDS_PER_YEAR)
    .mul(gmxPrice)
    .div(expandDecimals(1, 18));
  data.gmxAprForEsGmx =
    data.stakedGmxTrackerSupplyUsd && data.stakedGmxTrackerSupplyUsd.gt(0)
      ? data.stakedGmxTrackerAnnualRewardsUsd.mul(BASIS_POINTS_DIVISOR).div(data.stakedGmxTrackerSupplyUsd)
      : bigNumberify(0);
  data.feeGmxTrackerAnnualRewardsUsd = stakingData.feeGmxTracker.tokensPerInterval
    .mul(SECONDS_PER_YEAR)
    .mul(nativeTokenPrice)
    .div(expandDecimals(1, 18));
  data.gmxAprForNativeToken =
    data.feeGmxSupplyUsd && data.feeGmxSupplyUsd.gt(0)
      ? data.feeGmxTrackerAnnualRewardsUsd.mul(BASIS_POINTS_DIVISOR).div(data.feeGmxSupplyUsd)
      : bigNumberify(0);
  data.gmxBoostAprForNativeToken = data.gmxAprForNativeToken.mul(data.boostBasisPoints).div(BASIS_POINTS_DIVISOR);
  data.gmxAprTotal = data.gmxAprForNativeToken.add(data.gmxAprForEsGmx);
  data.gmxAprTotalWithBoost = data.gmxAprForNativeToken.add(data.gmxBoostAprForNativeToken).add(data.gmxAprForEsGmx);
  data.gmxAprForNativeTokenWithBoost = data.gmxAprForNativeToken.add(data.gmxBoostAprForNativeToken);

  data.totalGmxRewardsUsd = data.stakedGmxTrackerRewardsUsd.add(data.feeGmxTrackerRewardsUsd);

  data.glpSupply = supplyData.glp;
  data.glpPrice =
    data.glpSupply && data.glpSupply.gt(0)
      ? aum.mul(expandDecimals(1, GLP_DECIMALS)).div(data.glpSupply)
      : bigNumberify(0);

  data.glpSupplyUsd = supplyData.glp.mul(data.glpPrice).div(expandDecimals(1, 18));

  data.glpBalance = depositBalanceData.glpInStakedGlp;
  data.glpBalanceUsd = depositBalanceData.glpInStakedGlp.mul(data.glpPrice).div(expandDecimals(1, GLP_DECIMALS));

  data.stakedGlpTrackerRewards = stakingData.stakedGlpTracker.claimable;
  data.stakedGlpTrackerRewardsUsd = stakingData.stakedGlpTracker.claimable.mul(gmxPrice).div(expandDecimals(1, 18));

  data.feeGlpTrackerRewards = stakingData.feeGlpTracker.claimable;
  data.feeGlpTrackerRewardsUsd = stakingData.feeGlpTracker.claimable.mul(nativeTokenPrice).div(expandDecimals(1, 18));

  data.stakedGlpTrackerAnnualRewardsUsd = stakingData.stakedGlpTracker.tokensPerInterval
    .mul(SECONDS_PER_YEAR)
    .mul(gmxPrice)
    .div(expandDecimals(1, 18));
  data.glpAprForEsGmx =
    data.glpSupplyUsd && data.glpSupplyUsd.gt(0)
      ? data.stakedGlpTrackerAnnualRewardsUsd.mul(BASIS_POINTS_DIVISOR).div(data.glpSupplyUsd)
      : bigNumberify(0);
  data.feeGlpTrackerAnnualRewardsUsd = stakingData.feeGlpTracker.tokensPerInterval
    .mul(SECONDS_PER_YEAR)
    .mul(nativeTokenPrice)
    .div(expandDecimals(1, 18));
  data.glpAprForNativeToken =
    data.glpSupplyUsd && data.glpSupplyUsd.gt(0)
      ? data.feeGlpTrackerAnnualRewardsUsd.mul(BASIS_POINTS_DIVISOR).div(data.glpSupplyUsd)
      : bigNumberify(0);
  data.glpAprTotal = data.glpAprForNativeToken.add(data.glpAprForEsGmx);

  data.totalGlpRewardsUsd = data.stakedGlpTrackerRewardsUsd.add(data.feeGlpTrackerRewardsUsd);

  data.totalEsGmxRewards = data.stakedGmxTrackerRewards.add(data.stakedGlpTrackerRewards);
  data.totalEsGmxRewardsUsd = data.stakedGmxTrackerRewardsUsd.add(data.stakedGlpTrackerRewardsUsd);

  data.gmxVesterRewards = vestingData.gmxVester.claimable;
  data.glpVesterRewards = vestingData.glpVester.claimable;
  data.totalVesterRewards = data.gmxVesterRewards.add(data.glpVesterRewards);
  data.totalVesterRewardsUsd = data.totalVesterRewards.mul(gmxPrice).div(expandDecimals(1, 18));

  data.totalNativeTokenRewards = data.feeGmxTrackerRewards.add(data.feeGlpTrackerRewards);
  data.totalNativeTokenRewardsUsd = data.feeGmxTrackerRewardsUsd.add(data.feeGlpTrackerRewardsUsd);

  data.totalRewardsUsd = data.totalEsGmxRewardsUsd.add(data.totalNativeTokenRewardsUsd).add(data.totalVesterRewardsUsd);

  return data;
}

export async function addTokenToMetamask(token) {
  try {
    const wasAdded = await window.ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: token.address,
          symbol: token.symbol,
          decimals: token.decimals,
          image: token.imageUrl,
        },
      },
    });
    if (wasAdded) {
      // https://github.com/MetaMask/metamask-extension/issues/11377
      // We can show a toast message when the token is added to metamask but because of the bug we can't. Once the bug is fixed we can show a toast message.
    }
  } catch (error) {
    console.error(error);
  }
}

export function sleep(ms) {
  return new Promise((resolve) => resolve(), ms);
}

export function getPageTitle(data) {
  return `${data} | Decentralized
  Perpetual Exchange | GMX`;
}

export function isHashZero(value) {
  return value === ethers.constants.HashZero;
}
export function isAddressZero(value) {
  return value === ethers.constants.AddressZero;
}

export function useDebounce(value, delay) {
  // State and setters for debounced value
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(
    () => {
      // Update debounced value after delay
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
      // Cancel the timeout if value changes (also on delay change or unmount)
      // This is how we prevent debounced value from updating if value is changed ...
      // .. within the delay period. Timeout gets cleared and restarted.
      return () => {
        clearTimeout(handler);
      };
    },
    [value, delay] // Only re-call effect if value or delay changes
  );
  return debouncedValue;
}
