import { BN_ZERO } from '@/config/constants';
import { MarketInfo } from '@/selectors/market/types';
import { TokenData } from '@/selectors/token/types';
import { getGmDepositCapacityAmount } from '@/utils/gm/getGmDepositCapacityAmount';
import { getGmDepositCapacityUsd } from '@/utils/gm/getGmDepositCapacityUsd';
import { convertUsdToMarketTokenAmount } from '@/utils/legacy/convert';

export function getGmMintableMarketToken(
  marketInfo: MarketInfo,
  marketToken: TokenData
) {
  const longDepositCapacityAmount = getGmDepositCapacityAmount(
    marketInfo,
    true
  );
  const shortDepositCapacityAmount = getGmDepositCapacityAmount(
    marketInfo,
    false
  );

  const longDepositCapacityUsd = getGmDepositCapacityUsd(marketInfo, true);
  const shortDepositCapacityUsd = getGmDepositCapacityUsd(marketInfo, false);

  const mintableUsd = longDepositCapacityUsd.add(shortDepositCapacityUsd);
  const mintableAmount = convertUsdToMarketTokenAmount(
    marketInfo,
    marketToken,
    mintableUsd
  );

  return {
    mintableAmount: mintableAmount ?? BN_ZERO,
    mintableUsd,
    longDepositCapacityUsd,
    shortDepositCapacityUsd,
    longDepositCapacityAmount,
    shortDepositCapacityAmount,
  };
}
