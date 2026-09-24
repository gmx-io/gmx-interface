import { MAX_SUPPLY } from '@/config/constants';
import { TokenMetadatas } from '@/selectors/token/types';
import useSocketStore, { TokenMintPayload } from '@/zustand/socketStore';
import { Address } from '@coral-xyz/anchor';
import { toBN } from 'gmsol';
import { useMemo } from 'react';

function toTokenMetadata(tokenMint: TokenMintPayload | undefined) {
  if (!tokenMint) return undefined;

  const totalSupply = toBN(tokenMint.supply);
  return {
    decimals: tokenMint.decimals,
    totalSupply,
    maxMintable: MAX_SUPPLY.sub(totalSupply),
  };
}

export function useMarinTokenMetadatas(tokens: Address[] | undefined) {
  const tokenMints = useSocketStore((state) => state.tokenMints);

  return useMemo(() => {
    if (!tokens || tokens.length === 0) {
      return {
        tokenMetadatas: {},
        isLoading: false,
      };
    }

    const tokenMetadatas: TokenMetadatas = {};
    let missingTokenCount = 0;

    for (const token of tokens) {
      const tokenAddress = token.toString();
      const metadata = toTokenMetadata(tokenMints[tokenAddress]);

      if (metadata) {
        tokenMetadatas[tokenAddress] = metadata;
      } else {
        missingTokenCount += 1;
      }
    }

    return {
      tokenMetadatas,
      isLoading: missingTokenCount > 0,
    };
  }, [tokenMints, tokens]);
}
