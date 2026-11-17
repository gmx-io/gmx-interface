import { useCallback, useMemo, useReducer } from "react";

import {
  getIsTransitApprovalProposed,
  removeTransitApprovalProposal,
  type TransitApproval,
} from "./transitWalletProposals";

export function useTransitApprovalProposal({
  chainId,
  account,
  tokenAddress,
  spender,
  amount,
  isEnabled,
}: {
  chainId: number;
  account: string | undefined;
  tokenAddress: string | undefined;
  spender: string | undefined;
  amount: bigint;
  isEnabled: boolean;
}) {
  const [, refreshApprovalProposal] = useReducer((version: number) => version + 1, 0);

  const approval = useMemo((): TransitApproval | undefined => {
    if (!isEnabled || !account || !tokenAddress || !spender) {
      return undefined;
    }

    return { chainId, account, tokenAddress, spender, amount };
  }, [account, amount, chainId, isEnabled, spender, tokenAddress]);

  const isApprovalProposalPending = approval !== undefined && getIsTransitApprovalProposed(approval);

  const onProposeNewApproval = useCallback(() => {
    if (approval) {
      removeTransitApprovalProposal(approval);
      refreshApprovalProposal();
    }
  }, [approval]);

  return { isApprovalProposalPending, onProposeNewApproval };
}
