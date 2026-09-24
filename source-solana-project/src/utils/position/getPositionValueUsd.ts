import { Token } from '@/selectors/token/types';
import { convertTokenAmountToUsd } from '@/utils/legacy/convert';
import { BN } from '@coral-xyz/anchor';

export function getPositionValueUsd(p: {
  indexToken: Token;
  sizeInTokens: BN;
  markPrice: BN;
}) {
  const { indexToken, sizeInTokens, markPrice } = p;

  return convertTokenAmountToUsd(sizeInTokens, indexToken.decimals, markPrice);
}
