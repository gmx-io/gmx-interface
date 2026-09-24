import { Token } from '@/selectors/token/types';

export function getMarketPoolName({
  longToken,
  shortToken,
}: {
  longToken: Token;
  shortToken: Token;
}) {
  if (longToken.address.equals(shortToken.address)) {
    return `${longToken.symbol}-${shortToken.symbol}`;
  } 
  // else {
  //   return `${longToken.symbol}-${shortToken.symbol}`;
  // }
}
