/* 
  This files is used to pre-build data during the build process.
  Avoid adding client-side code here, as it can break the build process.

  However, this files can be a dependency for the client code.
*/

export const BSС_MAINNET = 56;
export const BSС_TESTNET = 97;
export const ETH_MAINNET = 1;
export const AVALANCHE = 43114;
export const AVALANCHE_FUJI = 43113;
export const ARBITRUM = 42161;
export const ARBITRUM_GOERLI = 421613;
export const FEES_HIGH_BPS = 50;
export const DEFAULT_ALLOWED_SLIPPAGE_BPS = 30;

export type ChainId = typeof AVALANCHE | typeof AVALANCHE_FUJI | typeof ARBITRUM | typeof ARBITRUM_GOERLI;
