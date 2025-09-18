# Changelog

## 1.3.1

- Fix calling createOrder with `dataList` in SDK

## 1.3.0

- Support v2.2 contracts in SDK

## 1.2.1

- Fixed Botanix default Viem client initialization

## 1.2.0

- Added: PUMP/USD [WBTC-USDC] and ARB/USD [ARB-ARB] in Arbitrum and PUMP/USD [WAVAX-USDC] in Avalanche

## 1.1.0

- Added: CRV, XMR, MOODENG, PI

## 1.0.5

- Fixed: `uiFeeReceiver` passing bug in `orders.createIncreaseOrder`

### 1.0.3

- Added `isTrigger` in `orders.createDecreaseOrder`
- Fixed `OrderType` passing bug in `orders.createDecreaseOrder`

## 1.0.0

- Removed `subgraphUrl` from the config
- Support for ESM and CJS
- Switch default module format to CJS
