import { useFilteredTokens } from '@/hooks/tokenHooks/useFilteredTokens';
import { TokenData } from '@/selectors/token/types';
import { useState } from 'react';

export const useTokenSearch = (availableTokens: TokenData[] | undefined) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const filteredTokens = useFilteredTokens(
    availableTokens || [],
    searchKeyword
  );

  const handleSearchChange = (value: string) => {
    setSearchKeyword(value);
  };

  const resetSearch = () => {
    setSearchKeyword('');
  };

  return {
    searchKeyword,
    filteredTokens: filteredTokens || [],
    handleSearchChange,
    resetSearch,
  };
};
