import { useMemo } from "react";
import { zeroAddress } from "viem";

import type { SettlementChainId, SourceChainId } from "config/chains";
import { getMappedTokenId, isSettlementChain } from "config/multichain";
import { useTokenApproval } from "domain/tokens/useTokenApproval";
import { useChainId } from "lib/chains";

export type MultichainStargateApprovalResult = {
  needsApproval: boolean;
  isApproving: boolean;
  isAllowanceLoaded: boolean;
  handleApprove: () => void;
};

export function useMultichainStargateApproval({
  depositTokenAddress,
  amountToApprove,
}: {
  depositTokenAddress: string | undefined;
  amountToApprove: bigint | undefined;
}): MultichainStargateApprovalResult {
  const { chainId, srcChainId } = useChainId();

  const sourceChainTokenId = useMemo(() => {
    if (
      depositTokenAddress === undefined ||
      srcChainId === undefined ||
      chainId === undefined ||
      !isSettlementChain(chainId)
    ) {
      return undefined;
    }

    return getMappedTokenId(chainId as SettlementChainId, depositTokenAddress, srcChainId as SourceChainId);
  }, [chainId, depositTokenAddress, srcChainId]);

  const stargateSpenderAddress = sourceChainTokenId?.stargate;
  const sourceChainTokenAddress = sourceChainTokenId?.address;

  const tokens = useMemo(
    () => (sourceChainTokenAddress ? [{ tokenAddress: sourceChainTokenAddress, amount: amountToApprove }] : []),
    [sourceChainTokenAddress, amountToApprove]
  );

  const {
    needsApproval: needsTokenApproval,
    isApproving,
    isAllowanceLoaded,
    handleApprove,
  } = useTokenApproval({
    chainId: srcChainId,
    spenderAddress: stargateSpenderAddress,
    tokens,
    approveAmount: amountToApprove,
    skip: srcChainId === undefined || sourceChainTokenAddress === undefined || sourceChainTokenAddress === zeroAddress,
  });

  const needsApproval = sourceChainTokenAddress !== zeroAddress && needsTokenApproval;

  return {
    needsApproval,
    isApproving,
    isAllowanceLoaded,
    handleApprove,
  };
}
