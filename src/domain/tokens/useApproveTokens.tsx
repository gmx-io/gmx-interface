import { useCallback } from "react";

import { useTokenPermitsContext } from "context/TokenPermitsContext/TokenPermitsContextProvider";
import { userAnalytics } from "lib/userAnalytics";
import type { TokenApproveClickEvent, TokenApproveResultEvent } from "lib/userAnalytics/types";
import type { WalletSigner } from "lib/wallets";
import type { ContractsChainId } from "sdk/configs/chains";
import { getContract } from "sdk/configs/contracts";

import { approveTokens as approveTokensFn } from "./approveTokens";

export function useApproveToken() {
  const { addTokenPermit, isPermitsDisabled: isPermitsDisabled, setIsPermitsDisabled } = useTokenPermitsContext();

  const approveToken = useCallback(
    ({
      chainId,
      tokenAddress,
      setIsApproving,
      signer,
      allowPermit,
    }: {
      chainId: ContractsChainId;
      tokenAddress: string;
      signer: WalletSigner;
      allowPermit: boolean;
      setIsApproving: (isApproving: boolean) => void;
    }) => {
      userAnalytics.pushEvent<TokenApproveClickEvent>({
        event: "TokenApproveAction",
        data: {
          action: "ApproveClick",
        },
      });

      approveTokensFn({
        setIsApproving,
        signer,
        tokenAddress,
        spender: getContract(chainId, "SyntheticsRouter"),
        pendingTxns: [],
        setPendingTxns: () => null,
        infoTokens: {},
        chainId,
        permitParams: allowPermit
          ? {
              addTokenPermit,
              setIsPermitsDisabled,
              isPermitsDisabled,
            }
          : undefined,
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
    },
    [addTokenPermit, isPermitsDisabled, setIsPermitsDisabled]
  );

  return {
    approveToken,
  };
}
