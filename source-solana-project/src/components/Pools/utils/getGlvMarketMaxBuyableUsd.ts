import { BN_ZERO } from '@/config/constants';
import { TokenData } from '@/selectors/token/types';
import { GlvMarket } from '@/selectors/glv/types';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { BN } from '@coral-xyz/anchor';

export function getGlvMarketMaxBuyableUsd(
  glvMarket: GlvMarket,
  gmToken: TokenData | undefined
): BN {

  if (!gmToken) {
    return BN_ZERO;
  }

  const gmBalanceUsd =
    convertTokenAmountToUsd(
      glvMarket.gmBalance,
      Number(gmToken.marketDecimals),
      new BN(gmToken.marketPrice)
    ) ?? BN_ZERO;

  const maxMarketTokenBalanceUsd = glvMarket.maxMarketTokenBalanceUsd;
  const glvMaxMarketTokenBalanceUsd =
    convertTokenAmountToUsd(
      glvMarket.glvMaxMarketTokenBalanceAmount,
      Number(gmToken.marketDecimals),
      new BN(gmToken.marketPrice)
    ) ?? BN_ZERO;

  return maxMarketTokenBalanceUsd.lt(glvMaxMarketTokenBalanceUsd)
    ? maxMarketTokenBalanceUsd.sub(gmBalanceUsd)
    : glvMaxMarketTokenBalanceUsd.sub(gmBalanceUsd);
}
