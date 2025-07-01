import { ARBITRUM, AVALANCHE, BOTANIX } from "config/chains";
import { getTokenBySymbol } from "sdk/configs/tokens";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import { TradeMode, TradeType } from "sdk/types/trade";

const AVAILABLE_TRADE_MODES = {
  [TradeType.Long]: [
    TradeMode.Market,
    TradeMode.Limit,
    [TradeMode.Trigger, TradeMode.StopMarket, TradeMode.Twap],
  ] as const,
  [TradeType.Short]: [
    TradeMode.Market,
    TradeMode.Limit,
    [TradeMode.Trigger, TradeMode.StopMarket, TradeMode.Twap],
  ] as const,
  [TradeType.Swap]: [TradeMode.Market, TradeMode.Limit, TradeMode.Twap] as const,
};

const ONLY_MARKET_TRADE_MODES = [TradeMode.Market] as const;

const ARBITRUM_ETH_TOKEN_ADDRESS = NATIVE_TOKEN_ADDRESS;
const ARBITRUM_WETH_TOKEN_ADDRESS = getTokenBySymbol(ARBITRUM, "WETH")?.address;
const AVALANCHE_AVAX_TOKEN_ADDRESS = NATIVE_TOKEN_ADDRESS;
const AVALANCHE_WAVAX_TOKEN_ADDRESS = getTokenBySymbol(AVALANCHE, "WAVAX")?.address;
const BOTANIX_BTC_TOKEN_ADDRESS = NATIVE_TOKEN_ADDRESS;
const BOTANIX_PBTC_TOKEN_ADDRESS = getTokenBySymbol(BOTANIX, "PBTC")?.address;
const BOTANIX_STBTC_TOKEN_ADDRESS = getTokenBySymbol(BOTANIX, "STBTC")?.address;

export function getAvailableTradeModes({
  chainId,
  tradeType,
  fromTokenAddress,
  toTokenAddress,
}: {
  chainId: number;
  tradeType: TradeType;
  fromTokenAddress: string | undefined;
  toTokenAddress: string | undefined;
}) {
  if (!tradeType) {
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

    if (chainId === BOTANIX) {
      if (fromTokenAddress === BOTANIX_BTC_TOKEN_ADDRESS && toTokenAddress === BOTANIX_PBTC_TOKEN_ADDRESS) {
        return ONLY_MARKET_TRADE_MODES;
      }

      if (fromTokenAddress === BOTANIX_PBTC_TOKEN_ADDRESS && toTokenAddress === BOTANIX_BTC_TOKEN_ADDRESS) {
        return ONLY_MARKET_TRADE_MODES;
      }

      if (
        (fromTokenAddress === BOTANIX_BTC_TOKEN_ADDRESS || fromTokenAddress === BOTANIX_PBTC_TOKEN_ADDRESS) &&
        toTokenAddress === BOTANIX_STBTC_TOKEN_ADDRESS
      ) {
        return ONLY_MARKET_TRADE_MODES;
      }

      if (fromTokenAddress === BOTANIX_STBTC_TOKEN_ADDRESS && toTokenAddress === BOTANIX_PBTC_TOKEN_ADDRESS) {
        return ONLY_MARKET_TRADE_MODES;
      }
    }
  }

  return AVAILABLE_TRADE_MODES[tradeType];
}
