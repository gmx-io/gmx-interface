import { BN_ZERO } from '@/config/constants';
import { TokenData } from '@/selectors/token/types';
import { GlvMarket } from '@/selectors/glv/types';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { BN } from '@coral-xyz/anchor';

export function getGlvMarketMaxCappedUsd(
  glvMarket: GlvMarket,
  gmToken?: TokenData
): BN {
  if (!gmToken) {
    return BN_ZERO;
  }
  const maxMarketTokenBalanceUsd = glvMarket.maxMarketTokenBalanceUsd;
  const glvMaxMarketTokenBalanceUsd =
    convertTokenAmountToUsd(
      glvMarket.glvMaxMarketTokenBalanceAmount,
      gmToken.marketDecimals,
      new BN(gmToken.marketPrice)
    ) ?? BN_ZERO;

  return BN.min(maxMarketTokenBalanceUsd, glvMaxMarketTokenBalanceUsd);
}
