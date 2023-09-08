import { ARBITRUM, AVALANCHE } from "./chains";

const SOLANA_BRIDGING_IDS = {
  [ARBITRUM]: 23,
  [AVALANCHE]: 6,
};

type BridgingOptionsReturn =
  | [
      {
        name: string;
        generateLink: (chainId: number) => string;
      }
    ]
  | undefined;

const BRIDGING_OPTIONS = {
  SOL: [
    {
      name: "Portalbridge",
      generateLink: (chainId: number) => `https://www.portalbridge.com/${SOLANA_BRIDGING_IDS[chainId]}/from/solana`,
    },
  ],
};

export function getBridgingOptionsForToken(tokenSymbol?: string): BridgingOptionsReturn {
  if (!tokenSymbol) return;
  return BRIDGING_OPTIONS[tokenSymbol];
}

export function isBridgingInfoAvailableForToken(tokenSymbol?: string): boolean {
  return !!getBridgingOptionsForToken(tokenSymbol);
}
