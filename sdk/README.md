# GMX SDK

## Install

```bash
yarn add @gmx/sdk
```

## Usage

```javascript
import { GmxSdk } from "@gmx/sdk";
import { useWallet } from "wagmi";

const sdk = new GmxSdk({
  chainId: 42161,
  rpcUrl: "https://arb1.arbitrum.io/rpc",
  oracleUrl: "https://arbitrum-api.gmxinfra.io",
  walletClient: useWallet().walletClient,
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

#### Parameters:

```typescript
forAllAccounts?: boolean;
pageSize: number;
fromTxTimestamp?: number;
toTxTimestamp?: number;
marketsInfoData: MarketsInfoData | undefined;
tokensData: TokensData | undefined;
pageIndex: number;
marketsDirectionsFilter?: MarketFilterLongShortItemData[];
orderEventCombinations?: {
    eventName?: TradeActionType;
    orderType?: OrderType;
    isDepositOrWithdraw?: boolean;
}[];
```

### Write methods

### Orders

- `cancelOrders(orderKeys: string[])` - creates an order
