import {
  ARBITRUM,
  AVALANCHE,
  SettlementChainId,
  SOURCE_BASE_MAINNET,
  SOURCE_BSC_MAINNET,
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
      [ARBITRUM]: getTokenBySymbol(ARBITRUM, "BNB").address,
    },
  },
};
