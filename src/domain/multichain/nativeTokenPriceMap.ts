import { AVALANCHE, SettlementChainId, SOURCE_BASE_MAINNET, SourceChainId } from "config/static/chains";
import { getTokenBySymbol } from "sdk/configs/tokens";

export const NATIVE_TOKEN_PRICE_MAP: Partial<Record<SourceChainId, Partial<Record<SettlementChainId, string>>>> = {
  [SOURCE_BASE_MAINNET]: {
    [AVALANCHE]: getTokenBySymbol(AVALANCHE, "ETH").address,
  },
};
