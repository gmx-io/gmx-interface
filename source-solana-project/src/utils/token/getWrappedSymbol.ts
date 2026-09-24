import { Token } from '@/selectors/token/types';

export const getWrappedSymbol = (token: Token) => {
  return `W${token.symbol}`;
};
