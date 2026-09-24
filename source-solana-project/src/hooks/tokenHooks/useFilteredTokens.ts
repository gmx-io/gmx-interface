import { TokenData } from '@/selectors/token/types';

export const useFilteredTokens = (
  options: TokenData[] | undefined,
  searchKeyword: string
) =>
  options?.filter((item) =>
    item.symbol.toLowerCase().includes(searchKeyword.toLowerCase())
  );
