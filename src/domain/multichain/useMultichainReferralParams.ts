import { useMemo } from "react";

import type { SettlementChainId, SourceChainId } from "config/chains";
import {
  CHAIN_ID_PREFERRED_DEPOSIT_TOKEN,
  getMappedTokenId,
  isSettlementChain,
  RANDOM_WALLET,
  type MultichainTokenId,
} from "config/multichain";
import useWallet from "lib/wallets/useWallet";

import { useMultichainTradeTokensRequest } from "components/GmxAccountModal/hooks";

export type MultichainReferralParams = {
  depositTokenAddress: string | undefined;
  sourceChainTokenId: MultichainTokenId | undefined;
  // REVIEW: Just AbstractSigner
  simulationSigner: ReturnType<typeof RANDOM_WALLET.connect> | undefined;
};

// REVIEW: this hook clusters seemingly unrelated data lets remove simulationSigner
// as for sourceChainTokenId, lets try removing it also and only pass depositTokenAddress,
// and map it to source chain idonly where needed
export function useMultichainReferralParams({
  chainId,
  srcChainId,
}: {
  chainId: SettlementChainId;
  srcChainId: SourceChainId | undefined;
}): MultichainReferralParams {
  const { account, signer } = useWallet();
  // REVIEW: lets use selector here
  // which one?
  const { tokenChainDataArray: multichainTokens } = useMultichainTradeTokensRequest(chainId, account);

  const simulationSigner = useMemo(() => {
    if (!signer?.provider) {
      return undefined;
    }

    return RANDOM_WALLET.connect(signer.provider);
  }, [signer?.provider]);

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

  const sourceChainTokenId = useMemo(() => {
    if (depositTokenAddress === undefined || srcChainId === undefined || !isSettlementChain(chainId)) {
      return undefined;
    }

    return getMappedTokenId(chainId, depositTokenAddress, srcChainId);
  }, [chainId, depositTokenAddress, srcChainId]);

  return {
    depositTokenAddress,
    sourceChainTokenId,
    simulationSigner,
  };
}
