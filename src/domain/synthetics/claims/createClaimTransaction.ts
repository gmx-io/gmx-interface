import { encodeFunctionData } from "viem";

import { getContract } from "config/contracts";
import { sendWalletTransaction, TxnCallback, WalletTxnCtx } from "lib/transactions";
import type { WalletSigner } from "lib/wallets";
import ClaimHandlerAbi from "sdk/abis/ClaimHandler";
import type { ContractsChainId } from "sdk/configs/chains";

import { ClaimableAmountsDataByDistributionId } from "./useUserClaimableAmounts";

export function getClaimTransactionCallData({
  selectedDistributionIds,
  claimableAmountsDataByDistributionId,
  account,
  signatures,
}: {
  selectedDistributionIds: string[];
  claimableAmountsDataByDistributionId: ClaimableAmountsDataByDistributionId;
  account: string;
  signatures: Record<string, string | undefined>;
}) {
  const params = selectedDistributionIds.flatMap((distributionId) => {
    return claimableAmountsDataByDistributionId[distributionId].amounts.map((amount) => ({
      token: amount.token.address,
      distributionId: BigInt(distributionId),
      termsSignature: signatures[distributionId] ?? "0x",
    }));
  });

  return encodeFunctionData({
    abi: ClaimHandlerAbi,
    functionName: "claimFunds",
    args: [params, account],
  });
}

export function createClaimAmountsTransaction(data: {
  selectedDistributionIds: string[];
  claimableAmountsDataByDistributionId: ClaimableAmountsDataByDistributionId;
  chainId: ContractsChainId;
  signer: WalletSigner;
  account: string;
  signatures: Record<string, string | undefined>;
  callback: TxnCallback<WalletTxnCtx>;
}) {
  const {
    selectedDistributionIds,
    claimableAmountsDataByDistributionId,
    chainId,
    signer,
    account,
    signatures,
    callback,
  } = data;

  const callData = getClaimTransactionCallData({
    selectedDistributionIds,
    claimableAmountsDataByDistributionId,
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
