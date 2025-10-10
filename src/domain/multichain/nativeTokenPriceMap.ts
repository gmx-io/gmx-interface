import {
  ARBITRUM,
  ARBITRUM_SEPOLIA,
  AVALANCHE,
  SettlementChainId,
  SOURCE_BASE_MAINNET,
  SOURCE_BSC_MAINNET,
  SOURCE_OPTIMISM_SEPOLIA,
  SOURCE_SEPOLIA,
  SourceChainId,
} from "config/static/chains";
import { getTokenBySymbol } from "sdk/configs/tokens";

export const NATIVE_TOKEN_PRICE_MAP: Partial<
  Record<SourceChainId, Partial<Record<SettlementChainId, Partial<Record<SettlementChainId, string>>>>>
> = {
  [SOURCE_BASE_MAINNET]: {
    [AVALANCHE]: {
      [AVALANCHE]: getTokenBySymbol(AVALANCHE, "ETH").address,
    },
    [ARBITRUM]: {
      [ARBITRUM]: getTokenBySymbol(ARBITRUM, "ETH").address,
    },
  },
  [SOURCE_BSC_MAINNET]: {
    [ARBITRUM]: {
      [ARBITRUM]: getTokenBySymbol(ARBITRUM, "BNB").address,
    },
    [AVALANCHE]: {
      // This means on BSC->Avalanche, we will get BNB price from Arbitrum prices.
      [ARBITRUM]: getTokenBySymbol(ARBITRUM, "BNB").address,
    },
  },
  [SOURCE_SEPOLIA]: {
    [ARBITRUM_SEPOLIA]: {
      [ARBITRUM_SEPOLIA]: getTokenBySymbol(ARBITRUM_SEPOLIA, "ETH").address,
    },
  },
  [SOURCE_OPTIMISM_SEPOLIA]: {
    [ARBITRUM_SEPOLIA]: {
      [ARBITRUM_SEPOLIA]: getTokenBySymbol(ARBITRUM_SEPOLIA, "ETH").address,
    },
  },
};
