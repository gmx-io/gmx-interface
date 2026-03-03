import { useCallback, useEffect, useMemo, useState } from "react";

import type { TokenToSpendParams } from "domain/synthetics/tokens/types";
import { getApprovalRequirements } from "domain/synthetics/tokens/utils";
import type { WalletSigner } from "lib/wallets";
import type { ContractsChainId } from "sdk/configs/chains";
import type { SignedTokenPermit } from "sdk/utils/tokens/types";

import { useApproveToken } from "./useApproveTokens";

const EMPTY_RESULT: { tokensToApprove: TokenToSpendParams[]; isAllowanceLoaded: boolean } = {
  tokensToApprove: [],
  isAllowanceLoaded: true,
};

const LOADING_RESULT: { tokensToApprove: TokenToSpendParams[]; isAllowanceLoaded: boolean } = {
  tokensToApprove: [],
  isAllowanceLoaded: false,
};

interface UseApprovalStateParams {
  chainId: ContractsChainId;
  signer: WalletSigner | undefined;
  allowPermit: boolean;
  payTokenParamsList: TokenToSpendParams[];
  gasPaymentTokenParams: TokenToSpendParams | undefined;
  permits: SignedTokenPermit[];
  /** When true, no approval is needed (e.g. GMX Account, multichain close). Returns isAllowanceLoaded: true. */
  skip?: boolean;
  /** When true, required data is not yet available. Returns isAllowanceLoaded: false. */
  isLoading?: boolean;
}

interface UseApprovalStateReturn {
  tokensToApprove: TokenToSpendParams[];
  isAllowanceLoaded: boolean;
  isApproving: boolean;
  handleApprove: () => void;
}

export function useApprovalState({
  chainId,
  signer,
  allowPermit,
  payTokenParamsList,
  gasPaymentTokenParams,
  permits,
  skip = false,
  isLoading = false,
}: UseApprovalStateParams): UseApprovalStateReturn {
  const [isApproving, setIsApproving] = useState(false);
  const { approveToken } = useApproveToken();

  const { tokensToApprove, isAllowanceLoaded } = useMemo(() => {
    if (skip) return EMPTY_RESULT;
    if (isLoading) return LOADING_RESULT;

    return getApprovalRequirements({
      chainId,
      payTokenParamsList,
      gasPaymentTokenParams,
      permits,
    });
  }, [skip, isLoading, chainId, payTokenParamsList, gasPaymentTokenParams, permits]);

  useEffect(() => {
    if (tokensToApprove.length === 0 && isApproving) {
      setIsApproving(false);
    }
  }, [isApproving, tokensToApprove.length]);

  const handleApprove = useCallback(() => {
    if (!tokensToApprove.length || isApproving || !signer) return;

    approveToken({
      tokenAddress: tokensToApprove[0].tokenAddress,
      chainId,
      signer,
      allowPermit,
      setIsApproving,
    });
  }, [approveToken, isApproving, tokensToApprove, signer, chainId, allowPermit]);

  return { tokensToApprove, isAllowanceLoaded, isApproving, handleApprove };
}
