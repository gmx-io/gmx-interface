# <img src="https://app.gmx.io/favicon/apple-icon-144x144.png" width="28" height="28"> GMX SDK

## Install

```bash
yarn add @gmx-io/sdk # or
npm install --save @gmx-io/sdk
```

## Usage

```typescript
import { GmxSdk } from "@gmx/sdk";
import { useWallet } from "wagmi";

const sdk = new GmxSdk({
  chainId: 42161,
  rpcUrl: "https://arb1.arbitrum.io/rpc",
  oracleUrl: "https://arbitrum-api.gmxinfra.io",
  walletClient: useWallet().walletClient,
  subgraph: {
    subsquid: "https://gmx.squids.live/gmx-synthetics-arbitrum/graphql",
  },
});

const { marketsInfoData, tokensData } = await sdk.markets.getMarketsInfo();

sdk.setAccount("0x1234567890abcdef1234567890abcdef12345678");

sdk.positions.getPositions().then((positions) => {
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
  subgraph: {
    subsquid?: string;
  };
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
    // amounts for position
  },
});
```
