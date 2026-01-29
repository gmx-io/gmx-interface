import { BOTANIX } from "configs/chains";
import { NATIVE_TOKEN_ADDRESS, getTokenBySymbol } from "configs/tokens";
import { ExternalSwapAggregator, ExternalSwapPath } from "utils/trade/types";

const BBTC_ADDRESS = NATIVE_TOKEN_ADDRESS;
const PBTC_ADDRESS = getTokenBySymbol(BOTANIX, "PBTC").address;
const STBTC_ADDRESS = getTokenBySymbol(BOTANIX, "STBTC").address;

export const AVAILABLE_BOTANIX_DEPOSIT_PAIRS = [
  {
    from: BBTC_ADDRESS,
    to: STBTC_ADDRESS,
  },
  {
    from: PBTC_ADDRESS,
    to: STBTC_ADDRESS,
  },
];

export const AVAILABLE_BOTANIX_WITHDRAW_PAIRS = [
  {
    from: STBTC_ADDRESS,
    to: PBTC_ADDRESS,
  },
];

const getBotanixStakingExternalSwapPaths = ({ fromTokenAddress }: { fromTokenAddress: string }): ExternalSwapPath[] => {
  return [...AVAILABLE_BOTANIX_DEPOSIT_PAIRS, ...AVAILABLE_BOTANIX_WITHDRAW_PAIRS]
    .filter((pair) => pair.from === fromTokenAddress)
    .map((pair) => ({
      aggregator: ExternalSwapAggregator.BotanixStaking,
      inTokenAddress: pair.from,
      outTokenAddress: pair.to,
    }));
};

export const getAvailableExternalSwapPaths = ({
  chainId,
  fromTokenAddress,
}: {
  chainId: number;
  fromTokenAddress: string;
}): ExternalSwapPath[] => {
  if (chainId === BOTANIX) {
    return getBotanixStakingExternalSwapPaths({ fromTokenAddress });
  }

  return [];
};
