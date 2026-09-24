import { BN_ZERO } from '@/config/constants';
import { TokensData } from '@/selectors/token/types';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';

export function getGmInfoTotal(marketTokensData?: TokensData) {
  const defaultResult = {
    balance: BN_ZERO,
    balanceUsd: BN_ZERO,
  };

  if (!marketTokensData) {
    return defaultResult;
  }

  const tokens = Object.values(marketTokensData).filter(
    (token) => token.symbol === 'GM'
  );

  return tokens.reduce((acc, token) => {
    const balanceUsd = convertTokenAmountToUsd(
      token.balance ?? BN_ZERO,
      token.decimals,
      token.prices.minPrice
    );
    acc.balance = acc.balance.add(token.balance || BN_ZERO);
    acc.balanceUsd = acc.balanceUsd.add(balanceUsd || BN_ZERO);
    return acc;
  }, defaultResult);
}

export function getGlvInfoTotal(glvTokensData?: TokensData) {
  const defaultResult = {
    balance: BN_ZERO,
    balanceUsd: BN_ZERO,
  };

  if (!glvTokensData) {
    return defaultResult;
  }

  const tokens = Object.values(glvTokensData).filter(
    (token) => token.symbol === 'GLV'
  );

  return tokens.reduce((acc, token) => {
    const balanceUsd = convertTokenAmountToUsd(
      token.balance ?? BN_ZERO,
      token.decimals,
      token.prices.minPrice
    );
    acc.balance = acc.balance.add(token.balance || BN_ZERO);
    acc.balanceUsd = acc.balanceUsd.add(balanceUsd || BN_ZERO);
    return acc;
  }, defaultResult);
}
