import { encodeFunctionData } from "viem";

import { getContract } from "config/contracts";
import { sendWalletTransaction, TxnCallback, WalletTxnCtx } from "lib/transactions";
import type { WalletSigner } from "lib/wallets";
import ClaimHandlerAbi from "sdk/abis/ClaimHandler";
import type { ContractsChainId } from "sdk/configs/chains";

import { ClaimableAmountsDataByDistributionId, ClaimsConfigurationData } from "./useUserClaimableAmounts";

export function getClaimTransactionCallData({
  selectedDistributionIds,
  claimableAmountsDataByDistributionId,
  claimsConfigByDistributionId,
  account,
  signatures,
}: {
  selectedDistributionIds: string[];
  claimableAmountsDataByDistributionId: ClaimableAmountsDataByDistributionId;
  claimsConfigByDistributionId: ClaimsConfigurationData;
  account: string;
  signatures: Record<string, string | undefined>;
}) {
  const params = selectedDistributionIds.flatMap((distributionId) => {
    const claimTerms = claimsConfigByDistributionId[distributionId]?.claimTerms || "";

    return claimableAmountsDataByDistributionId[distributionId].amounts.map((amount) => ({
      token: amount.token.address,
      distributionId: BigInt(distributionId),
      termsSignature: signatures[distributionId] ?? "0x",
      acceptedTerms: claimTerms,
    }));
  });

  return encodeFunctionData({
    abi: ClaimHandlerAbi,
    functionName: "acceptTermsAndClaim",
    args: [params, account],
  });
}

export function createClaimAmountsTransaction(data: {
  selectedDistributionIds: string[];
  claimableAmountsDataByDistributionId: ClaimableAmountsDataByDistributionId;
  claimsConfigByDistributionId: ClaimsConfigurationData;
  chainId: ContractsChainId;
  signer: WalletSigner;
  account: string;
  signatures: Record<string, string | undefined>;
  callback: TxnCallback<WalletTxnCtx>;
}) {
  const {
    selectedDistributionIds,
    claimableAmountsDataByDistributionId,
    claimsConfigByDistributionId,
    chainId,
    signer,
    account,
    signatures,
    callback,
  } = data;

  const callData = getClaimTransactionCallData({
    selectedDistributionIds,
    claimableAmountsDataByDistributionId,
    claimsConfigByDistributionId,
    account,
    signatures,
  });

  return sendWalletTransaction({
    chainId,
    signer,
    to: getContract(chainId, "ClaimHandler"),
    callData,
    value: 0n,
    callback,
  });
}
