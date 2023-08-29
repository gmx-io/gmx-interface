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

export default function getBridgingOptionsForToken(tokenSymbol: string): BridgingOptionsReturn {
  return BRIDGING_OPTIONS[tokenSymbol];
}
