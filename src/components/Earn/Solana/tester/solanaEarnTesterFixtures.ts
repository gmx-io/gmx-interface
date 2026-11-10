// Tester for the Solana Earn design review: sample states, shown only outside gmx.io. Never merged.
import { PLATFORM_TOKEN_DECIMALS } from "context/PoolsDetailsContext/selectors";
import type { GlvOrMarketInfo } from "domain/synthetics/markets";
import type { TokenData } from "domain/synthetics/tokens";
import { expandDecimals } from "lib/numbers";

import type { AssetCardEarnings } from "components/Earn/Portfolio/AssetsList/GmGlvAssetCard";

import {
  SOLANA_GT_DECIMALS,
  type SolanaEarnAsset,
  type SolanaEarnData,
  type SolanaEarnGtData,
  type SolanaEarnLpData,
} from "../solanaEarnTypes";

export type SolanaEarnTesterScenario = "live" | "disconnected" | "zero" | "typical" | "big" | "loading";

export const SOLANA_EARN_TESTER_SCENARIOS: SolanaEarnTesterScenario[] = [
  "live",
  "disconnected",
  "zero",
  "typical",
  "big",
  "loading",
];

const TESTER_ACCOUNT = "TESTER-SOLANA-ACCOUNT";
const USD_DECIMALS = 30;
const PERCENT_DECIMALS = 28;

// Decimal string → bigint with the given decimals, e.g. toBig("12.5", 2) = 1250n.
function toBig(value: string, decimals: number): bigint {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole + fraction.padEnd(decimals, "0").slice(0, decimals));
}

const usd = (value: string) => toBig(value, USD_DECIMALS);
const gt = (value: string) => toBig(value, SOLANA_GT_DECIMALS);
const lpTokens = (value: string) => toBig(value, PLATFORM_TOKEN_DECIMALS);
const percent = (value: string) => toBig(value, PERCENT_DECIMALS);

function token(symbol: string, name: string, address: string): TokenData {
  return { symbol, name, address, decimals: 18 } as unknown as TokenData;
}

const SOL = token("SOL", "Solana", "0x0000000000000000000000000000000000000a01");
const BTC = token("BTC", "Bitcoin", "0x0000000000000000000000000000000000000a02");
const ETH = token("ETH", "Ethereum", "0x0000000000000000000000000000000000000a03");
const USDC = token("USDC", "USD Coin", "0x0000000000000000000000000000000000000a04");

function gmMarket(address: string, indexToken: TokenData, longToken: TokenData, shortToken: TokenData) {
  return {
    marketTokenAddress: address,
    indexTokenAddress: indexToken.address,
    longTokenAddress: longToken.address,
    shortTokenAddress: shortToken.address,
    indexToken,
    longToken,
    shortToken,
    isSpotOnly: false,
    name: `${indexToken.symbol}/USD [${longToken.symbol}-${shortToken.symbol}]`,
  } as unknown as GlvOrMarketInfo;
}

function glvVault(address: string, longToken: TokenData, shortToken: TokenData) {
  return {
    isGlv: true,
    glvTokenAddress: address,
    glvToken: token("GLV", "GLV", address),
    indexToken: longToken,
    longToken,
    shortToken,
    isSpotOnly: false,
    name: undefined,
  } as unknown as GlvOrMarketInfo;
}

const GLV_SOL_USDC = glvVault("0x0000000000000000000000000000000000000b01", SOL, USDC);
const GLV_BTC_USDC = glvVault("0x0000000000000000000000000000000000000b02", BTC, USDC);
const GM_SOL = gmMarket("0x0000000000000000000000000000000000000c01", SOL, SOL, USDC);
const GM_BTC = gmMarket("0x0000000000000000000000000000000000000c02", BTC, BTC, USDC);
const GM_ETH = gmMarket("0x0000000000000000000000000000000000000c03", ETH, ETH, USDC);

function asset(
  info: GlvOrMarketInfo,
  values: {
    balance: string;
    balanceUsd: string;
    lifetime: string;
    last7d: string;
    expected365d: string;
    apyTotal: string;
    apy30d: string;
  }
): SolanaEarnAsset {
  const earnings: AssetCardEarnings = {
    total: usd(values.lifetime),
    recent: usd(values.last7d),
    expected365d: usd(values.expected365d),
  };

  return {
    info,
    balances: { totalBalance: lpTokens(values.balance), totalBalanceUsd: usd(values.balanceUsd), balances: {} },
    earnings,
    totalPerformanceApy: percent(values.apyTotal),
    performanceApy30d: percent(values.apy30d),
  };
}

// LP totals always match the cards, so the Summary, the LP panel and the cards agree.
function lpFromAssets(assets: SolanaEarnAsset[]): SolanaEarnLpData {
  const lp: SolanaEarnLpData = { gmLifetimeUsd: 0n, glvLifetimeUsd: 0n, last7dUsd: 0n, expected365dUsd: 0n };

  for (const item of assets) {
    if ("isGlv" in item.info) {
      lp.glvLifetimeUsd += item.earnings.total;
    } else {
      lp.gmLifetimeUsd += item.earnings.total;
    }
    lp.last7dUsd += item.earnings.recent;
    lp.expected365dUsd += item.earnings.expected365d;
  }

  return lp;
}

// GT values in USD follow one minting price, the same way the real numbers will.
function gtData(values: {
  balance: string;
  unclaimed: string;
  sellable: string;
  lifetimeBuyback: string;
  lastBuyback: string;
  mintPrice: string;
}): SolanaEarnGtData {
  const balance = gt(values.balance);
  const unclaimedFromStaking = gt(values.unclaimed);
  const sellableAmount = gt(values.sellable);
  const mintPriceUsd = usd(values.mintPrice);
  const gtUnit = expandDecimals(1, SOLANA_GT_DECIMALS);

  return {
    balance,
    unclaimedFromStaking,
    lifetimeBuybackUsd: usd(values.lifetimeBuyback),
    lastBuybackUsd: usd(values.lastBuyback),
    sellableAmount,
    maxSellableUsd: (sellableAmount * mintPriceUsd) / gtUnit,
    potentialValueUsd: ((balance + unclaimedFromStaking) * mintPriceUsd) / gtUnit,
  };
}

const TYPICAL_ASSETS = [
  asset(GLV_SOL_USDC, {
    balance: "2619.6",
    balanceUsd: "3612.40",
    lifetime: "658.12",
    last7d: "6.10",
    expected365d: "470.00",
    apyTotal: "18.30",
    apy30d: "25.16",
  }),
  asset(GM_BTC, {
    balance: "2009.2",
    balanceUsd: "3140.27",
    lifetime: "202.12",
    last7d: "4.60",
    expected365d: "182.00",
    apyTotal: "16.74",
    apy30d: "11.99",
  }),
  asset(GM_SOL, {
    balance: "1479.6",
    balanceUsd: "2050.11",
    lifetime: "210.25",
    last7d: "4.12",
    expected365d: "160.40",
    apyTotal: "25.17",
    apy30d: "53.22",
  }),
];

const BIG_ASSETS = [
  asset(GLV_SOL_USDC, {
    balance: "8912345.678",
    balanceUsd: "12345678.90",
    lifetime: "1234567.89",
    last7d: "23456.78",
    expected365d: "2345678.90",
    apyTotal: "118.30",
    apy30d: "225.16",
  }),
  asset(GLV_BTC_USDC, {
    balance: "3123456.789",
    balanceUsd: "4567890.12",
    lifetime: "456789.01",
    last7d: "8765.43",
    expected365d: "876543.21",
    apyTotal: "21.04",
    apy30d: "19.87",
  }),
  asset(GM_SOL, {
    balance: "1678901.234",
    balanceUsd: "2345678.90",
    lifetime: "345678.90",
    last7d: "6543.21",
    expected365d: "456789.01",
    apyTotal: "25.17",
    apy30d: "53.22",
  }),
  asset(GM_BTC, {
    balance: "631234.567",
    balanceUsd: "987654.32",
    lifetime: "98765.43",
    last7d: "1234.56",
    expected365d: "123456.78",
    apyTotal: "16.74",
    apy30d: "11.99",
  }),
  asset(GM_ETH, {
    balance: "301234.567",
    balanceUsd: "456789.01",
    lifetime: "45678.90",
    last7d: "567.89",
    expected365d: "67890.12",
    apyTotal: "-3.42",
    apy30d: "8.15",
  }),
];

export function getSolanaEarnTesterData(scenario: SolanaEarnTesterScenario): SolanaEarnData | undefined {
  switch (scenario) {
    case "live":
      return undefined;
    case "disconnected":
      return {
        account: undefined,
        isWalletInitializing: false,
        isLoading: false,
        gt: undefined,
        lp: undefined,
        assets: [],
      };
    case "loading":
      return {
        account: TESTER_ACCOUNT,
        isWalletInitializing: false,
        isLoading: true,
        gt: undefined,
        lp: undefined,
        assets: [],
      };
    case "zero":
      return {
        account: TESTER_ACCOUNT,
        isWalletInitializing: false,
        isLoading: false,
        gt: gtData({
          balance: "0",
          unclaimed: "0",
          sellable: "0",
          lifetimeBuyback: "0",
          lastBuyback: "0",
          mintPrice: "2.6187",
        }),
        lp: { gmLifetimeUsd: 0n, glvLifetimeUsd: 0n, last7dUsd: 0n, expected365dUsd: 0n },
        assets: [],
      };
    case "typical":
      return {
        account: TESTER_ACCOUNT,
        isWalletInitializing: false,
        isLoading: false,
        gt: gtData({
          balance: "18450.25",
          unclaimed: "1234.56",
          sellable: "1235.56",
          lifetimeBuyback: "1234.56",
          lastBuyback: "123.45",
          mintPrice: "2.6187",
        }),
        lp: lpFromAssets(TYPICAL_ASSETS),
        assets: TYPICAL_ASSETS,
      };
    case "big":
      return {
        account: TESTER_ACCOUNT,
        isWalletInitializing: false,
        isLoading: false,
        gt: gtData({
          balance: "2000000",
          unclaimed: "345678.9",
          sellable: "909456.78",
          lifetimeBuyback: "1234567.89",
          lastBuyback: "123456.78",
          mintPrice: "3.5579",
        }),
        lp: lpFromAssets(BIG_ASSETS),
        assets: BIG_ASSETS,
      };
  }
}
