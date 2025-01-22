/* 
  This files is used to pre-build data during the build process.
  Avoid adding client-side code here, as it can break the build process.

  However, this files can be a dependency for the client code.
*/

import { ARBITRUM, AVALANCHE, AVALANCHE_FUJI } from "sdk/configs/chains";

export * from "sdk/configs/chains";

export const FEES_HIGH_BPS = 50;
export const DEFAULT_ALLOWED_SLIPPAGE_BPS = 30;

export type ChainId = typeof AVALANCHE | typeof AVALANCHE_FUJI | typeof ARBITRUM;
