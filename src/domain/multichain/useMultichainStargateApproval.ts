import { useCallback, useMemo, useState } from "react";
import { zeroAddress } from "viem";

import type { SourceChainId } from "config/chains";
import type { MultichainTokenId } from "config/multichain";
import { getNeedTokenApprove, useTokensAllowanceData } from "domain/synthetics/tokens";
import { approveTokens } from "domain/tokens";
import { EMPTY_ARRAY } from "lib/objects";
import { userAnalytics } from "lib/userAnalytics";
import type { TokenApproveClickEvent, TokenApproveResultEvent } from "lib/userAnalytics/types";
import useWallet from "lib/wallets/useWallet";

export type MultichainStargateApprovalResult = {
  needsApproval: boolean;
  isApproving: boolean;
  isAllowanceLoaded: boolean;
  handleApprove: () => Promise<void>;
};

export function useMultichainStargateApproval({
  srcChainId,
  sourceChainTokenId,
  amountToApprove,
}: {
  srcChainId: SourceChainId | undefined;
  sourceChainTokenId: MultichainTokenId | undefined;
  amountToApprove: bigint | undefined;
}): MultichainStargateApprovalResult {
  const { signer } = useWallet();
  const [isApproving, setIsApproving] = useState(false);

  const stargateSpenderAddress = sourceChainTokenId?.stargate;
  const sourceChainTokenAddress = sourceChainTokenId?.address;

  const { tokensAllowanceData, isLoaded: isAllowanceLoaded } = useTokensAllowanceData(srcChainId, {
    spenderAddress: stargateSpenderAddress,
    tokenAddresses: sourceChainTokenAddress ? [sourceChainTokenAddress] : [],
    skip: srcChainId === undefined || sourceChainTokenAddress === undefined || sourceChainTokenAddress === zeroAddress,
  });

  const needsApproval = useMemo(() => {
    if (sourceChainTokenAddress === zeroAddress) {
      return false;
    }
    return getNeedTokenApprove(tokensAllowanceData, sourceChainTokenAddress, amountToApprove, EMPTY_ARRAY);
  }, [tokensAllowanceData, sourceChainTokenAddress, amountToApprove]);

  const handleApprove = useCallback(async () => {
    if (!sourceChainTokenAddress || !stargateSpenderAddress || !srcChainId || !signer) {
      return;
    }

    userAnalytics.pushEvent<TokenApproveClickEvent>({
      event: "TokenApproveAction",
      data: {
        action: "ApproveClick",
      },
    });

    await approveTokens({
      setIsApproving,
      signer,
      tokenAddress: sourceChainTokenAddress,
      spender: stargateSpenderAddress,
      chainId: srcChainId,
      permitParams: undefined,
      approveAmount: undefined,
      onApproveFail: () => {
        userAnalytics.pushEvent<TokenApproveResultEvent>({
          event: "TokenApproveAction",
          data: {
            action: "ApproveFail",
          },
        });
      },
    });
  }, [sourceChainTokenAddress, stargateSpenderAddress, srcChainId, signer]);

  return {
    needsApproval,
    isApproving,
    isAllowanceLoaded,
    handleApprove,
  };
}
