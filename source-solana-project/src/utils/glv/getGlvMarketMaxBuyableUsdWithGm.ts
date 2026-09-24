import { GlvMarket } from '@/selectors/glv/types';
import { MarketInfo } from '@/selectors/market/types';
import { TokenData } from '@/selectors/token/types';
import { getGmMintableMarketToken } from '@/utils/gm/getGmMintableMarketToken';
import { getGlvMarketMaxBuyableUsd } from '@/utils/glv/getGlvMarketMaxBuyableUsd';
import { BN } from '@coral-xyz/anchor';

export function getGlvMarketMaxBuyableUsdWithGm(
  glvMarket: GlvMarket,
  gmMarketInfo: MarketInfo,
  gmMarketToken: TokenData
): BN {
  const mintableInGmMarket = getGmMintableMarketToken(
    gmMarketInfo,
    gmMarketToken
  );
  const maxUsdInGmGlv = getGlvMarketMaxBuyableUsd(glvMarket, gmMarketToken);

  return mintableInGmMarket?.mintableUsd.lt(maxUsdInGmGlv)
    ? mintableInGmMarket?.mintableUsd
    : maxUsdInGmGlv;
}
