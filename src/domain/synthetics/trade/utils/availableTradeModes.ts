import { ARBITRUM, AVALANCHE } from "config/chains";
import { getNetworkFeatures } from "config/features";
import { getTokenBySymbol } from "sdk/configs/tokens";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import { TradeMode, TradeType } from "sdk/utils/trade/types";

const AVAILABLE_TRADE_MODES = {
  [TradeType.Long]: [TradeMode.Market, TradeMode.Limit, [TradeMode.StopMarket, TradeMode.Twap]] as const,
  [TradeType.Short]: [TradeMode.Market, TradeMode.Limit, [TradeMode.StopMarket, TradeMode.Twap]] as const,
  [TradeType.Swap]: [TradeMode.Market, TradeMode.Limit, TradeMode.Twap] as const,
};

const ONLY_MARKET_TRADE_MODES = [TradeMode.Market] as const;

const ARBITRUM_ETH_TOKEN_ADDRESS = NATIVE_TOKEN_ADDRESS;
const ARBITRUM_WETH_TOKEN_ADDRESS = getTokenBySymbol(ARBITRUM, "WETH")?.address;
const AVALANCHE_AVAX_TOKEN_ADDRESS = NATIVE_TOKEN_ADDRESS;
const AVALANCHE_WAVAX_TOKEN_ADDRESS = getTokenBySymbol(AVALANCHE, "WAVAX")?.address;

function withoutUnsupportedModes(
  modes: readonly (TradeMode | readonly TradeMode[])[],
  features: { twap: boolean; stopMarket: boolean }
): (TradeMode | TradeMode[])[] {
  return modes.flatMap((mode) => {
    if (Array.isArray(mode)) {
      const nested = mode.filter((item) => {
        if (item === TradeMode.Twap) return features.twap;
        if (item === TradeMode.StopMarket) return features.stopMarket;
        return true;
      });
      return nested.length > 0 ? [nested] : [];
    }

    if (mode === TradeMode.Twap && !features.twap) return [];
    if (mode === TradeMode.StopMarket && !features.stopMarket) return [];
    return [mode];
  });
}

export function getAvailableTradeModes({
  chainId,
  networkId,
  tradeType,
  fromTokenAddress,
  toTokenAddress,
}: {
  chainId: number;
  networkId: number;
  tradeType: TradeType;
  fromTokenAddress: string | undefined;
  toTokenAddress: string | undefined;
}) {
  if (!tradeType) {
    return [];
  }

  const features = getNetworkFeatures(networkId);

  if (tradeType === TradeType.Swap && !features.swap) {
    return [];
  }

  if (tradeType === TradeType.Swap) {
    if (chainId === ARBITRUM) {
      if (fromTokenAddress === ARBITRUM_ETH_TOKEN_ADDRESS && toTokenAddress === ARBITRUM_WETH_TOKEN_ADDRESS) {
        return ONLY_MARKET_TRADE_MODES;
      }

      if (fromTokenAddress === ARBITRUM_WETH_TOKEN_ADDRESS && toTokenAddress === ARBITRUM_ETH_TOKEN_ADDRESS) {
        return ONLY_MARKET_TRADE_MODES;
      }
    }

    if (chainId === AVALANCHE) {
      if (fromTokenAddress === AVALANCHE_AVAX_TOKEN_ADDRESS && toTokenAddress === AVALANCHE_WAVAX_TOKEN_ADDRESS) {
        return ONLY_MARKET_TRADE_MODES;
      }

      if (fromTokenAddress === AVALANCHE_WAVAX_TOKEN_ADDRESS && toTokenAddress === AVALANCHE_AVAX_TOKEN_ADDRESS) {
        return ONLY_MARKET_TRADE_MODES;
      }
    }
  }

  return withoutUnsupportedModes(AVAILABLE_TRADE_MODES[tradeType], features);
}
