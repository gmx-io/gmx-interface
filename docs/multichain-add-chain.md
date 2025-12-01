# Multichain

## How to add a new chain

Take a look into a BSC addition [pr](https://github.com/gmx-io/gmx-interface/pull/1941/files)

1. Add new chain in [`sdk/src/configs/chainIds.ts`](../sdk/src/configs/chainIds.ts). Depending whether its a source chain call it `SOURCE_<CHAIN_NAME>_MAINNET` or just `<CHAIN_NAME>` if its a settlement chain.
2. Add to `SourceChainId` type and `ChainName` in [`sdk/src/configs/chains.ts`](../sdk/src/configs/chains.ts). Types are done in such way typescript errors will occur in all places you need to add new chain. So just use tscheck with watch mode to list them.
   - Add the chain to `VIEM_CHAIN_BY_CHAIN_ID` mapping in [`sdk/src/configs/chains.ts`](../sdk/src/configs/chains.ts). Import the chain from `viem/chains` (or define it if it's a custom chain like `botanix`) and add it to the mapping. This is required for wallet configuration to work automatically.
3. RPC Configuration in [`src/config/chains.ts`](../src/config/chains.ts):
   - Add public RPC URLs to `RPC_PROVIDERS` array
   - Add alchemy url getters like `getAlchemy<Chain>HttpUrl` and `getAlchemy<Chain>WsUrl`. IMPORTANT: do not forget to ask @Divhead to activate the chain in alchemy dashboard.
   - Add fallback provider to `FALLBACK_PROVIDERS` using the alchemy HTTP URL getter
   - Update `getExplorerUrl` function to return the blockchain explorer URL
   - Update `getWsProvider` in `src/lib/rpc/index.ts` to handle the new chain
4. `LayerZeroEndpointId`  in `src/domain/multichain/types.ts` should be updated with endpointId from [stargate docs](https://stargateprotocol.gitbook.io/stargate/v2-developer-docs/technical-reference/mainnet-contracts). Do not confuse endpointId with chainId. Then populate `CHAIN_ID_TO_ENDPOINT_ID` with it.
5. `MULTICALLS_MAP` in [`src/config/multichain.ts`](../src/config/multichain.ts) usually is populated with hardcoded string from default multicall contract addresses from viem chain e.g for arbitrum 
`arbitrum.contracts.multicall3.address`.
6. Import Stargate pool addresses from `@stargatefinance/stg-evm-sdk-v2/deployments` in [`src/config/multichain.ts`](../src/config/multichain.ts). Add source chain tokens to `TOKEN_GROUPS` in `src/config/multichain.ts`. If its a platform token use `addMultichainPlatformTokenConfig`. If its a testnet place it under `if (isDevelopment()) {...}`. Sometimes decimals are different on source chains.
7. For correct price display we must configure where to get the source chain native token price in [`src/domain/multichain/nativeTokenPriceMap.ts`](../src/domain/multichain/nativeTokenPriceMap.ts). This is needed because sometimes source chain native token is not listed on settlement chain and we have to find the price elsewhere.
8. Icons and UI Configuration:
   - Import chain icon SVG and add icon mapping to `ICONS` and `CHAIN_ID_TO_NETWORK_ICON` in [`src/config/icons.ts`](../src/config/icons.ts)
   - Add network icon and select option with color in [`src/config/networkOptions.ts`](../src/config/networkOptions.ts)
   - Add explorer name and transaction URL builder to `CHAIN_ID_TO_EXPLORER_NAME` and `CHAIN_ID_TO_TX_URL_BUILDER` in [`src/lib/chains/blockExplorers.tsx`](../src/lib/chains/blockExplorers.tsx)
9. Landing page:
    1. Update `BLOCKCHAIN_COUNT` constant in [`landing/src/pages/Home/HeroSection/AnimatedTitle.tsx`](../landing/src/pages/Home/HeroSection/AnimatedTitle.tsx)
    2. Add new enum value to `RedirectChainIds` in [`landing/src/pages/Home/hooks/useGoToTrade.tsx`](../landing/src/pages/Home/hooks/useGoToTrade.tsx)
    3. Add redirect mapping in [`REDIRECT_MAP`](../landing/src/pages/Home/hooks/useGoToTrade.tsx) in the same file
    4. Import chain icon SVG in [`landing/src/pages/Home/LaunchSection/LaunchButton.tsx`](../landing/src/pages/Home/LaunchSection/LaunchButton.tsx)
    5. Add icon mapping to `icons` and add name mapping to `names` object in [`LaunchButton.tsx`](../landing/src/pages/Home/LaunchSection/LaunchButton.tsx)
    6. Update [`landing/src/pages/Home/LaunchSection/LaunchSection.tsx`](../landing/src/pages/Home/LaunchSection/LaunchSection.tsx) to include the new chain card

To make the funding history work update the squid according to its documentation.