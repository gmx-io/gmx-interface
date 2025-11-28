import uniqBy from "lodash/uniqBy";

import { selectChainId, selectMarketsInfoData } from "context/SyntheticsStateContext/selectors/globalSelectors";
import { createSelector } from "context/SyntheticsStateContext/utils";
import { Token, getGmToken } from "domain/tokens";
import { getTokenSymbolByMarket } from "sdk/configs/markets";
import { getNativeToken, getToken } from "sdk/configs/tokens";

import { selectPoolsDetailsPaySource } from "./baseSelectors";
import {
  selectPoolsDetailsFlags,
  selectPoolsDetailsGlvInfo,
  selectPoolsDetailsLongTokenAddress,
  selectPoolsDetailsShortTokenAddress,
} from "./poolsDetailsDerivedSelectors";
import { selectMultichainMarketTokenBalances } from "./selectMultichainMarketTokenBalances";

export const selectPoolsDetailsTokenOptions = createSelector((q): Array<Token & { isMarketToken?: boolean }> => {
  const chainId = q(selectChainId);
  const paySource = q(selectPoolsDetailsPaySource);

  const longTokenAddress = q(selectPoolsDetailsLongTokenAddress);
  const shortTokenAddress = q(selectPoolsDetailsShortTokenAddress);
  const glvInfo = q(selectPoolsDetailsGlvInfo);
  const { isPair, isDeposit } = q(selectPoolsDetailsFlags);
  const marketsInfoData = q(selectMarketsInfoData);
  const multichainMarketTokensBalances = q(selectMultichainMarketTokenBalances);

  if (!longTokenAddress || !shortTokenAddress) return [];

  const nativeToken = getNativeToken(chainId);

  const result: Token[] = [];

  for (const sideTokenAddress of [longTokenAddress, shortTokenAddress]) {
    const sideToken = getToken(chainId, sideTokenAddress);
    if ((paySource === "sourceChain" && sideToken.isWrapped) || sideToken.isNative) {
      result.push(nativeToken, sideToken);
    } else if (paySource !== "gmxAccount" && paySource !== "sourceChain" && sideToken.isWrapped) {
      result.push(sideToken, nativeToken);
    } else {
      result.push(sideToken);
    }
  }

  if (glvInfo && !isPair && isDeposit) {
    result.push(
      ...glvInfo.markets
        .map((m): (Token & { isMarketToken?: boolean }) | undefined => {
          const token = getGmToken(chainId, m.address);
          const indexTokenSymbol = getTokenSymbolByMarket(chainId, m.address, "index");
          const market = marketsInfoData?.[m.address];

          const hasSomeBalance = (multichainMarketTokensBalances[m.address]?.totalBalance ?? 0n) > 0n;

          if (!market || market.isDisabled || !hasSomeBalance) {
            return;
          }

          if (token) {
            return {
              ...token,
              isMarketToken: true,
              name: `${indexTokenSymbol}: ${market.name}`,
              symbol: indexTokenSymbol,
            };
          }
        })
        .filter(Boolean as unknown as FilterOutFalsy)
    );

    return result;
  }

  return uniqBy(result, (token) => token.address);
});
