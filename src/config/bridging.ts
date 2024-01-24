import { ARBITRUM, AVALANCHE } from "./chains";

const SOLANA_BRIDGING_IDS = {
  [ARBITRUM]: 23,
  [AVALANCHE]: 6,
};

type BridgingOption = {
  name: string;
  generateLink: (chainId: number) => string;
};

const BRIDGING_OPTIONS: { [symbol: string]: BridgingOption[] } = {
  SOL: [
    {
      name: "Portalbridge",
      generateLink: (chainId: number) => `https://www.portalbridge.com/${SOLANA_BRIDGING_IDS[chainId]}/from/solana`,
    },
  ],
  BNB: [
    {
      name: "Stargate",
      generateLink: () => `https://stargate.finance/transfer`,
    },
  ],
};

export function getBridgingOptionsForToken(tokenSymbol?: string): BridgingOption[] | undefined {
  if (!tokenSymbol) return;
  return BRIDGING_OPTIONS[tokenSymbol];
}
