# <img src="https://app.gmx.io/favicon/apple-icon-144x144.png" width="28" height="28"> GMX SDK

## Installation

```bash
yarn add @gmx-io/sdk # or
npm install --save @gmx-io/sdk
```

## Getting Started

```typescript
import { GmxSdk } from "@gmx-io/sdk";
import { useWallet } from "wagmi";

const sdk = new GmxSdk({
  chainId: 42161,
  rpcUrl: "https://arb1.arbitrum.io/rpc",
  oracleUrl: "https://arbitrum-api.gmxinfra.io",
  walletClient: useWallet().walletClient,
  subsquidUrl: "https://gmx.squids.live/gmx-synthetics-arbitrum:prod/api/graphql",
});

const { marketsInfoData, tokensData } = await sdk.markets.getMarketsInfo();

sdk.setAccount("0x1234567890abcdef1234567890abcdef12345678");

sdk.positions
  .getPositions({
    marketsInfoData,
    tokensData,
    start: 0,
    end: 1000,
  })
  .then((positions) => {
    console.log(positions);
  });
```

## API Reference

### Read Methods

### Markets

- `getMarkets(offset?: number, limit?: number): Promise<Market[]>` - fetches a list of available markets
- `getMarketsInfo(): Promise<{ marketsInfoData: MarketInfoData[], tokensData: TokenData[] }>` - retrieves detailed market information along with token data
- `getDailyVolumes(): Promise<{market: string; volume: bigint}[]>` - gets daily trading volume for each market

### Positions

- `getPositions(): Promise<Position[]>` - retrieves all open positions

### Tokens

- `getTokensData(): Promise<TokenData[]>` - fetches data for all available tokens

### Orders

- `getOrders(): Promise<Order[]>` - retrieves all active orders

### Trades

- `getTradeHistory(p: Parameters): Promise<TradeAction[]>` - fetches historical trade data

### Write Methods

### Orders

#### Quick Methods:

- `long(p: Parameters)` - opens a long position (see [examples](#helpers))
- `short(p: Parameters)` - opens a short position (see [examples](#helpers))
- `swap(p: Parameters)` - executes a token swap (see [examples](#helpers))

#### Full Methods:

- `cancelOrders(orderKeys: string[])` - cancels one or more orders using their keys
- `createIncreaseOrder(p: Parameters)` - creates an order to increase position size (see [examples](#examples))
- `createDecreaseOrder(p: Parameters)` - creates an order to decrease position size (see [examples](#examples))
- `createSwapOrder(p: Parameters)` - creates a token swap order (see [examples](#examples))

## Configuration Options

```typescript
interface GmxSdkConfig {
  chainId: number;
  rpcUrl: string;
  oracleUrl: string;
  subsquidUrl?: string;
  account?: string;
  publicClient: PublicClient;
  walletClient: WalletClient;
  tokens?: Record<string, Partial<Token>>;
  markets?: Record<
    string,
    {
      isListed: boolean;
    }
  >;
}
```

### Setting Up Custom Viem Clients

When working with custom Viem clients, make sure to include the batching configuration:

```typescript
import { BATCH_CONFIGS } from "@gmx-io/sdk/configs/batch";

const publicClient = createPublicClient({
  ...your_config,
  batch: BATCH_CONFIGS[chainId].client,
});
```

### Network URLs

- RPC URLs - use your preferred RPC endpoint
- [Current Oracle URLs](https://github.com/gmx-io/gmx-interface/blob/master/src/config/oracleKeeper.ts#L5-L11)
- [Current Subsquid/Subgraph URLs](https://github.com/gmx-io/gmx-interface/blob/master/src/config/subgraph.ts#L5) (the subgraph url corresponds to the `synthetics-stats` field)

### Customizing Token Data

You can override default token properties by passing an extension object in the SDK configuration:

```typescript
const sdk = new GmxSdk({
  ...arbitrumSdkConfig,
  tokens: {
    "0x912CE59144191C1204E64559FE8253a0e49E6548": {
      name: "My Custom Name for ARB",
    },
  },
});
```

With this configuration, the `name` field for this token will use your custom value throughout the SDK.

### Customizing Market Availability

To control which markets are available in the SDK, use the `markets` configuration field:

```typescript
const sdk = new GmxSdk({
  ...arbitrumSdkConfig,
  markets: {
    "0x47c031236e19d024b42f8AE6780E44A573170703": {
      isListed: false,
    },
  },
});
```

## Usage Examples

### Opening a Long Position

```typescript
import type { IncreasePositionAmounts } from "@gmx-io/sdk/types/orders";

const { marketsInfoData, tokensData } = await sdk.markets.getMarketsInfo();

if (!marketsInfoData || !tokensData) {
  throw new Error("No markets or tokens info data");
}

const marketInfo = marketsInfo["0x47c031236e19d024b42f8AE6780E44A573170703"];
const collateralToken = tokensData["0x912CE59144191C1204E64559FE8253a0e49E6548"];
sdk.orders.createIncreaseOrder({
  marketsInfoData: marketsInfoData!,
  tokensData,
  isLimit: false,
  isLong: true,
  marketAddress: marketInfo.marketTokenAddress,
  allowedSlippage: 50,
  collateralToken,
  collateralTokenAddress: collateralToken.address,
  receiveTokenAddress: collateralToken.address,
  fromToken: tokensData["0x912CE59144191C1204E64559FE8253a0e49E6548"],
  marketInfo,
  indexToken: marketInfo.indexToken,
  increaseAmounts: {
    initialCollateralAmount: 3000000n,
    initialCollateralUsd: 2999578868393486100000000000000n,
    collateralDeltaAmount: 2997003n,
    collateralDeltaUsd: 2996582289103961007386100000000n,
    indexTokenAmount: 1919549334876037n,
    sizeDeltaUsd: 5993158579050185227800000000000n,
    sizeDeltaInTokens: 1919536061202302n,
    estimatedLeverage: 20000n,
    indexPrice: 3122169600000000000000000000000000n,
    initialCollateralPrice: 999859622797828700000000000000n,
    collateralPrice: 999859622797828700000000000000n,
    triggerPrice: 0n,
    acceptablePrice: 3122191190655414690893787784152819n,
    acceptablePriceDeltaBps: 0n,
    positionFeeUsd: 2996579289525092613900000000n,
    swapPathStats: undefined,
    uiFeeUsd: 0n,
    swapUiFeeUsd: 0n,
    feeDiscountUsd: 0n,
    borrowingFeeUsd: 0n,
    fundingFeeUsd: 0n,
    positionPriceImpactDeltaUsd: 41444328240807630917223064n,
  },
});
```

### Helpers

Helper functions simplify order creation by automatically calculating amounts, swap paths, and other parameters. By default, helpers fetch the latest data from the API, but you can optionally pass `marketsInfoData` and `tokensData` yourself to reduce API calls.

```typescript
sdk.orders.long({
  payAmount: 100031302n,
  marketAddress: "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336", // ETH/USD [WETH-USDC]
  payTokenAddress: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
  collateralTokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC
  allowedSlippageBps: 125,
  leverage: 50000n,
});

sdk.orders.swap({
  fromAmount: 1000n,
  fromTokenAddress: "0x912CE59144191C1204E64559FE8253a0e49E6548", // ARB
  toTokenAddress: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
  allowedSlippageBps: 125,
});
```

Note the distinction between `payTokenAddress` and `collateralTokenAddress`. These represent the ERC20 token addresses for payment and collateral respectively. Some markets use synthetic tokens, so you'll need to provide the correct underlying token address. For example, the BTC/USD [WETH-USDC] market has a synthetic BTC token as its `indexTokenAddress`, so you should pass the WBTC address instead of BTC.
