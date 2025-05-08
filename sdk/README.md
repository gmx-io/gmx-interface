# <img src="https://app.gmx.io/favicon/apple-icon-144x144.png" width="28" height="28"> GMX SDK

## Install

```bash
yarn add @gmx-io/sdk # or
npm install --save @gmx-io/sdk
```

## Usage

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

## Documentation

### Read methods

### Markets

- `getMarkets(offset?: number, limit?: number): Promise<Market[]>` - returns a list of markets
- `getMarketsInfo(): Promise<{ marketsInfoData: MarketInfoData[], tokensData: TokenData[] }>` - returns a list of markets info and tokens data
- `getDailyVolumes(): Promise<{market: string; volume: bigint}[]>` - returns markets' daily volume data

### Positions

- `getPositions(): Promise<Position[]>` - returns a list of positions

### Tokens

- `getTokensData(): Promise<TokenData[]>` - returns a list of tokens data

### Orders

- `getOrders(): Promise<Order[]>` - returns a list of orders

### Trades

- `getTradeHistory(p: Parameters): Promise<TradeAction[]>` - returns a list of trades

### Write methods

### Orders

#### Quick methods:

- `long(p: Parameters)` - creates long positions (see [examples](#helpers))
- `short(p: Parameters)` - creates short positions (see [examples](#helpers))
- `swap(p: Parameters)` - creates a swap order (see [examples](#helpers))

#### Full methods:

- `cancelOrders(orderKeys: string[])` - cancels orders by order keys
- `createIncreaseOrder(p: Parameters)` - creates an increase order (see [examples](#examples))
- `createDecreaseOrder(p: Parameters)` - creates a decrease order (see [examples](#examples))
- `createSwapOrder(p: Parameters)` - creates a swap order (see [examples](#examples))

## Configuration

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

### Custom Viem clients

When using custom Viem clients, pass batching configuration to the client.

```typescript
import { BATCH_CONFIGS } from "@gmx-io/sdk/configs/batch";

const publicClient = createPublicClient({
  ...your_config,
  batch: BATCH_CONFIGS[chainId].client,
});
```

### Urls

- RPC URLs - use preferred RPC URL
- [Actual Oracle URLs](https://github.com/gmx-io/gmx-interface/blob/master/src/config/oracleKeeper.ts#L5-L11)
- [Actual Subsquid/Subgraph URLs](https://github.com/gmx-io/gmx-interface/blob/master/src/config/subgraph.ts#L5) (subgraph url is `synthetics-stats` field)

### Tokens customization

If you need to override some field in tokens, just pass extension object in SDK config:

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

Here and further, `name` field in tokens data object will be taken from the extension object.

### Markets customization

To enable/disable market in SDK use config field `markets

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

## Examples

### Open long position

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

Helpers are a set of functions that help you create orders without manually calculating the amounts, swap paths, etc. By default helpers will fetch the latest data from the API, but you can pass both `marketsInfoData` and `tokensData` to the helpers to avoid extra calls to the API.

```typescript
sdk.orders.long({
  payAmount: 100031302n,
  marketAddress: "0x70d95587d40A2caf56bd97485aB3Eec10Bee6336",
  payTokenAddress: market.indexTokenAddress,
  collateralTokenAddress: market.shortTokenAddress,
  allowedSlippageBps: 125,
  leverage: 50000n,
});

sdk.orders.swap({
  fromAmount: 1000n,
  fromTokenAddress: "0x912CE59144191C1204E64559FE8253a0e49E6548",
  toTokenAddress: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
  allowedSlippageBps: 125,
});
```

Pay attention to the `payTokenAddress` and `collateralTokenAddress` fields. They are the addresses of the tokens that you are paying for and receiving, respectively, some markets may have synthetic tokens in these fields, so you need to pass the correct address. For instance BTC/USD [WETH-USDC] market has synthetic BTC token in `indexTokenAddress` so you need to pass WBTC address instead of BTC.
