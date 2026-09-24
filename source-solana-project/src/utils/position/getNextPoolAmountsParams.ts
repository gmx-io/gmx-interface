import { TokenData } from '@/selectors/token/types';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { getMarketMidPrice } from '@/utils/market/getMarketMidPrice';
import { BN } from '@coral-xyz/anchor';

export function getNextPoolAmountsParams(p: {
  longToken: TokenData;
  shortToken: TokenData;
  longPoolAmount: BN;
  shortPoolAmount: BN;
  longDeltaUsd: BN;
  shortDeltaUsd: BN;
}) {
  const {
    longToken,
    shortToken,
    longPoolAmount,
    shortPoolAmount,
    longDeltaUsd,
    shortDeltaUsd,
  } = p;

  const longPrice = getMarketMidPrice(longToken.prices);
  const shortPrice = getMarketMidPrice(shortToken.prices);

  const longPoolUsd = convertTokenAmountToUsd(
    longPoolAmount,
    longToken.decimals,
    longPrice
  );
  const shortPoolUsd = convertTokenAmountToUsd(
    shortPoolAmount,
    shortToken.decimals,
    shortPrice
  );

  const nextLongPoolUsd = longPoolUsd.add(longDeltaUsd);
  const nextShortPoolUsd = shortPoolUsd.add(shortDeltaUsd);

  return {
    longPoolUsd,
    shortPoolUsd,
    nextLongPoolUsd,
    nextShortPoolUsd,
  };
}
