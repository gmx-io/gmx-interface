import { useMemo } from "react";

import type { SettlementChainId, SourceChainId } from "config/chains";
import {
  CHAIN_ID_PREFERRED_DEPOSIT_TOKEN,
  getMappedTokenId,
  isSettlementChain,
  type MultichainTokenId,
} from "config/multichain";
import { useChainId } from "lib/chains";
import useWallet from "lib/wallets/useWallet";

import { useMultichainTradeTokensRequest } from "components/GmxAccountModal/hooks";

export function useMultichainReferralDepositToken(): {
  depositTokenAddress: string | undefined;
  sourceChainDepositTokenId: MultichainTokenId | undefined;
  hasNoTokensOnSourceChain: boolean;
  isLoading: boolean;
} {
  const { chainId, srcChainId } = useChainId();
  const { account } = useWallet();
  const { tokenChainDataArray: multichainTokens, isBalanceDataLoading } = useMultichainTradeTokensRequest(
    chainId,
    account
  );

  const depositTokenAddress = useMemo(() => {
    if (srcChainId === undefined) {
      return undefined;
    }

    const tokens = multichainTokens.filter(
      (token) =>
        token.sourceChainId === srcChainId && token.sourceChainBalance !== undefined && token.sourceChainBalance > 0n
    );

    if (tokens.length === 0) {
      return undefined;
    }

    const preferredToken = tokens.find((token) => token.address === CHAIN_ID_PREFERRED_DEPOSIT_TOKEN[chainId]);

    if (preferredToken) {
      return preferredToken.address;
    }

    return tokens[0].address;
  }, [chainId, multichainTokens, srcChainId]);

  const hasNoTokensOnSourceChain = useMemo(() => {
    if (srcChainId === undefined || isBalanceDataLoading) {
      return false;
    }

    return depositTokenAddress === undefined;
  }, [srcChainId, isBalanceDataLoading, depositTokenAddress]);

  const sourceChainDepositTokenId = useMemo(() => {
    if (depositTokenAddress === undefined || srcChainId === undefined || !isSettlementChain(chainId)) {
      return undefined;
    }

    return getMappedTokenId(chainId as SettlementChainId, depositTokenAddress, srcChainId as SourceChainId);
  }, [chainId, depositTokenAddress, srcChainId]);

  return {
    depositTokenAddress,
    sourceChainDepositTokenId,
    hasNoTokensOnSourceChain,
    isLoading: isBalanceDataLoading,
  };
}
