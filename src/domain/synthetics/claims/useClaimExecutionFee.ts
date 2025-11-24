import { useMemo } from "react";
import useSWR from "swr";

import { getContract } from "config/contracts";
import { estimateGasLimit } from "lib/gas/estimateGasLimit";
import type { WalletSigner } from "lib/wallets";
import type { ContractsChainId } from "sdk/configs/chains";

import { useGasPrice } from "../fees";
import { getClaimTransactionCallData } from "./createClaimTransaction";

export const useClaimExecutionFee = ({
  account,
  claimableTokens,
  chainId,
  claimTermsAcceptedSignature,
  signer,
  distributionId,
  claimTerms,
  isSmartAccount,
  isContractOwnersSigned,
}: {
  account: string | undefined;
  claimableTokens: string[];
  chainId: ContractsChainId;
  claimTermsAcceptedSignature: string | undefined;
  signer: WalletSigner | undefined;
  distributionId: bigint;
  claimTerms: string;
  isSmartAccount: boolean;
  isContractOwnersSigned: boolean;
}) => {
  const gasPrice = useGasPrice(chainId);
  const enabled = useMemo(() => {
    const hasSignature = isSmartAccount ? isContractOwnersSigned : claimTermsAcceptedSignature;
    return Boolean(hasSignature && signer && account && claimableTokens.length > 0 && gasPrice !== undefined);
  }, [claimTermsAcceptedSignature, signer, account, claimableTokens, gasPrice, isSmartAccount, isContractOwnersSigned]);

  return useSWR(enabled ? [account, claimableTokens, chainId, claimTermsAcceptedSignature, claimTerms, signer] : null, {
    refreshInterval: undefined,
    fetcher: async () => {
      const callData = getClaimTransactionCallData(
        claimableTokens,
        account!,
        claimTermsAcceptedSignature!,
        distributionId,
        claimTerms
      );
      const gasLimit = await estimateGasLimit(signer!.provider!, {
        to: getContract(chainId, "ClaimHandler"),
        data: callData,
        from: account!,
        value: undefined,
      });

      return gasLimit * gasPrice!;
    },
  });
};
