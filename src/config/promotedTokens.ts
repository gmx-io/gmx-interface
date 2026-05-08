import { zeroAddress } from "viem";

import { ARBITRUM } from "config/chains";

/** Tokens pinned at the top of market dropdowns on default sort. Order matters. */
export const PROMOTED_TOKENS_ORDER: Partial<Record<number, string[]>> = {
  [ARBITRUM]: [
    // BTC
    "0x47904963fc8b2340414262125aF798B9655E58Cd",
    // ETH (native address, not WETH)
    zeroAddress,
    // SOL
    "0x2bcC6D6CdBbDC0a4071e48bb3B969b06B3330c07",
    // WTIOIL
    "0xa8Ffb545d5cBF1F44E3eBA123D60372cD267D73c",
    // BRENTOIL
    "0x9C5C4b9BA1fEBA72186f50d8Ae7C58b1D7f0B12F",
    // GOLD
    "0xc48d782c5C54157d37d2Fa4E6BA27E8cf57Da956",
    // SILVER
    "0xE41902f9aD379A8CC34A34efa00F5c3EE5112bC8",
    // NATGAS
    "0x620aC65BE29066Bb9D1E92C65b35B9fD321Fb963",
  ],
};
