import type { MarketsInfoData } from "domain/synthetics/markets/types";
import type { TokensData } from "domain/synthetics/tokens";
import type { TradeAction as SubsquidTradeAction } from "sdk/codegen/subsquid";
import { getWrappedToken } from "sdk/configs/tokens";
import { createRawTradeActionTransformer } from "sdk/utils/tradeHistory";
import type { TradeAction } from "sdk/utils/tradeHistory/types";

export function processRawTradeActions({
  chainId,
  rawActions,
  marketsInfoData,
  tokensData,
}: {
  chainId: number;
  rawActions: SubsquidTradeAction[] | undefined;
  marketsInfoData: MarketsInfoData | undefined;
  tokensData: TokensData | undefined;
}): TradeAction[] | undefined {
  if (!rawActions || !marketsInfoData || !tokensData) {
    return undefined;
  }

  const wrappedToken = getWrappedToken(chainId);
  const transformer = createRawTradeActionTransformer(marketsInfoData, wrappedToken, tokensData);

  return rawActions.map(transformer).filter(Boolean) as TradeAction[];
}
