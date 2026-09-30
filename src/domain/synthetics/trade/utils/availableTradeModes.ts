import { ARBITRUM, AVALANCHE } from "config/chains";
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
  }

  return AVAILABLE_TRADE_MODES[tradeType];
}
