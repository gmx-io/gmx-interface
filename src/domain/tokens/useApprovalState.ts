import { useCallback, useEffect, useState } from "react";

import type { TokenToSpendParams } from "domain/synthetics/tokens/types";
import type { WalletSigner } from "lib/wallets";
import type { ContractsChainId } from "sdk/configs/chains";

import { useApproveToken } from "./useApproveTokens";

interface UseApprovalStateParams {
  tokensToApprove: TokenToSpendParams[];
}

interface UseApprovalStateReturn {
  isApproving: boolean;
  handleApprove: (params: { chainId: ContractsChainId; signer: WalletSigner; allowPermit: boolean }) => void;
}

export function useApprovalState({ tokensToApprove }: UseApprovalStateParams): UseApprovalStateReturn {
  const [isApproving, setIsApproving] = useState(false);
  const { approveToken } = useApproveToken();

  useEffect(() => {
    if (tokensToApprove.length === 0 && isApproving) {
      setIsApproving(false);
    }
  }, [isApproving, tokensToApprove.length]);

  const handleApprove = useCallback(
    ({ chainId, signer, allowPermit }: { chainId: ContractsChainId; signer: WalletSigner; allowPermit: boolean }) => {
      if (!tokensToApprove.length || isApproving) return;

      approveToken({
        tokenAddress: tokensToApprove[0].tokenAddress,
        chainId,
        signer,
        allowPermit,
        setIsApproving,
      });
    },
    [approveToken, isApproving, tokensToApprove]
  );

  return { isApproving, handleApprove };
}
