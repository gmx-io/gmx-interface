import { USD_DECIMALS } from "configs/factors";
import { expandDecimals } from "utils/numbers";
import { convertToTokenAmount } from "utils/tokens";
import { Token, TokenData, TokensData } from "utils/tokens/types";
import { ExternalSwapAggregator, ExternalSwapQuote } from "utils/trade/types";

export function usdToToken(usd: number, token: TokenData) {
  return convertToTokenAmount(expandDecimals(usd, USD_DECIMALS), token.decimals, token.prices?.minPrice)!;
}

export const MOCK_GAS_PRICE = 100000000n; // (0.1 gwei)

export function mockMarketKeys() {
  return [
    "AVAX-AVAX-USDC",
    "ETH-ETH-USDC",
    "ETH-ETH-DAI",
    "SOL-ETH-USDC",
    "BTC-BTC-DAI",
    "SPOT-USDC-DAI",
    "SPOT-DAI-USDC",
    // same collaterals, should be disabled for swaps
    "ETH-USDC-USDC",
    // Unreachable markets
    "TBTC-TBTC-TBTC",
    "TETH_A-TETH_A-TETH_B",
    // Partially unreachable markets
    "TEST_B-TEST_B-TEST_A",
    "TEST_C-TEST_C-TEST_A",
  ];
}

export function mockTokensData(overrides: { [symbol: string]: Partial<TokenData> } = {}): TokensData {
  const tokens: TokensData = {
    ...overrides,
    AVAX: {
      address: "AVAX",
      wrappedAddress: "WAVAX",
      name: "Avalanche",
      symbol: "AVAX",
      decimals: 18,
      isNative: true,
      prices: {
        minPrice: expandDecimals(12, 30),
        maxPrice: expandDecimals(12, 30),
      },
      ...((overrides.AVAX || {}) as any),
    },
    WAVAX: {
      address: "WAVAX",
      name: "Wrapped Avalanche",
      symbol: "WAVAX",
      decimals: 18,
      isNative: true,
      prices: {
        minPrice: expandDecimals(12, 30),
        maxPrice: expandDecimals(12, 30),
      },
      ...((overrides.AVAX || {}) as any),
    },
    USDC: {
      address: "USDC",
      name: "USD Coin",
      symbol: "USDC",
      decimals: 6,
      isStable: true,
      prices: {
        minPrice: expandDecimals(1, 30),
        maxPrice: expandDecimals(1, 30),
      },
      ...((overrides.USDC || {}) as any),
    },
    ETH: {
      address: "ETH",
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
      prices: {
        minPrice: expandDecimals(1200, 30),
        maxPrice: expandDecimals(1200, 30),
      },
      ...((overrides.ETH || {}) as any),
    },
    BTC: {
      address: "BTC",
      name: "Bitcoin",
      symbol: "BTC",
      decimals: 8,
      prices: {
        minPrice: expandDecimals(20000, 30),
        maxPrice: expandDecimals(20000, 30),
      },
      ...((overrides.BTC || {}) as any),
    },
    DAI: {
      address: "DAI",
      name: "Dai",
      symbol: "DAI",
      decimals: 30,
      isStable: true,
      prices: {
        minPrice: expandDecimals(1, 30),
        maxPrice: expandDecimals(1, 30),
      },
      ...((overrides.DAI || {}) as any),
    },
    SOL: {
      address: "SOL",
      name: "Solana",
      symbol: "SOL",
      decimals: 18,
      isSynthetic: true,
      prices: {
        minPrice: expandDecimals(16, 30),
        maxPrice: expandDecimals(16, 30),
      },
      ...((overrides.SOL || {}) as any),
    },
    SPOT: {
      address: "SPOT",
      name: "SPOT",
      decimals: 30,
      symbol: "SPOT",
      prices: {
        minPrice: BigInt(1),
        maxPrice: BigInt(1),
      },
      ...((overrides.SPOT || {}) as any),
    },
  };

  return tokens;
}

/**
 * @param marketKeys - array of market keys in the following format: indexToken-longToken-shortToken
 */
export { mockMarketsData, mockMarketsInfoData } from "utils/markets/__tests__/mockMarkets";

export function mockExternalSwap({
  inToken,
  outToken,
  amountIn,
  amountOut,
  priceIn,
  priceOut,
  feesUsd = expandDecimals(5, USD_DECIMALS), // $5 default fee
  data = "0x1",
  to = "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64",
  receiver = "0x1234567890123456789012345678901234567890",
}: {
  inToken: Token;
  outToken: Token;
  amountIn: bigint;
  amountOut: bigint;
  priceIn: bigint;
  priceOut: bigint;
  feesUsd?: bigint;
  data?: string;
  to?: string;
  receiver?: string;
}): ExternalSwapQuote {
  const usdIn = (amountIn * priceIn) / expandDecimals(1, inToken.decimals);
  const usdOut = (amountOut * priceOut) / expandDecimals(1, outToken.decimals);

  return {
    aggregator: ExternalSwapAggregator.OpenOcean,
    inTokenAddress: inToken.address,
    outTokenAddress: outToken.address,
    receiver,
    usdIn,
    usdOut,
    amountIn,
    amountOut,
    priceIn,
    priceOut,
    feesUsd,
    txnData: {
      to,
      data,
      value: 0n,
      estimatedGas: 100000n,
      estimatedExecutionFee: 100000n,
    },
  };
}
