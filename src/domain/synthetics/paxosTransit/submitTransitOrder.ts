import { decodeFunctionData, erc20Abi, type Hex, maxUint256 } from "viem";

import { sendTokenApprovalMetric } from "domain/tokens/tokenApprovalMetric";
import { helperToast } from "lib/helperToast";
import { getTxnErrorOutcome } from "lib/metrics/txnErrorOutcome";
import { sendWalletTransaction } from "lib/transactions/sendWalletTransaction";
import type { WalletSigner } from "lib/wallets";
import type { ContractsChainId } from "sdk/configs/chains";
import type { TransitQuote, TransitQuoteParams } from "sdk/utils/paxos/types";

import { MOCK_CONVERSION_MS, mockTransitApi } from "./mockTransitApi";
import { getSubmittedTransitOrderId } from "./transitOrders";
import type { PaxosTransitConversion } from "./transitRouteProgress";
import type { TransitApi } from "./types";

export type TransitSubmitStep = "approving" | "submitting";

export async function submitTransitOrder({
  api,
  chainId,
  signer,
  account,
  params,
  isMocked,
  onStep,
  validateSubmitQuote,
}: {
  api: TransitApi;
  chainId: ContractsChainId;
  signer: WalletSigner;
  account: string;
  params: TransitQuoteParams;
  isMocked: boolean;
  onStep: (step: TransitSubmitStep) => void;
  validateSubmitQuote?: (quote: TransitQuote) => void;
}): Promise<PaxosTransitConversion> {
  onStep("approving");
  const approvalQuote = await api.fetchTransitQuote(params);
  const authorization = await api.fetchTransitAuthorization({
    userAddress: account,
    tokenAddress: params.offerAsset,
    spenderAddress: approvalQuote.transaction.to,
    amount: params.offerAmount,
    chainId,
  });

  if (!authorization.alreadyApproved) {
    const approveMethod = authorization.methods.find((method) => method.type === "erc20_approve");

    if (approveMethod?.type !== "erc20_approve") {
      throw new Error("Paxos Transit returned no approval transaction");
    }

    const approveCall = decodeApproveCall(approveMethod.transaction.encoded);
    const approvalMetric = {
      metric: { flow: "paxosTransit" },
      method: "transaction",
      chainId,
      tokenAddress: params.offerAsset,
      spender: approveCall?.spender ?? approvalQuote.transaction.to,
      isUnlimited: approveCall ? approveCall.amount === maxUint256 : undefined,
    } as const;

    const approveTxn = await sendWalletTransaction({
      chainId,
      signer,
      to: params.offerAsset,
      callData: approveMethod.transaction.encoded,
    }).catch((error) => {
      sendTokenApprovalMetric({ ...approvalMetric, outcome: getTxnErrorOutcome(error), error });
      throw error;
    });
    sendTokenApprovalMetric({ ...approvalMetric, outcome: "accepted" });
    await approveTxn.wait();
  }

  onStep("submitting");
  // the fee tier and deadline are fixed at quote time, so quote again right before sending
  const submitQuote = await api.fetchTransitQuote(params);

  validateSubmitQuote?.(submitQuote);

  if (!submitQuote.transaction.data) {
    throw new Error("Paxos Transit quote has no calldata");
  }

  let submittedOrderId: string | undefined;
  let submitTxnHash: string | undefined;

  if (isMocked) {
    submittedOrderId = mockTransitApi.submitOrder(params);
    helperToast.info(`Mock conversion, no real transaction. Ready in ~${MOCK_CONVERSION_MS / 1000}s.`);
  } else {
    const submitTxn = await sendWalletTransaction({
      chainId,
      signer,
      to: submitQuote.transaction.to,
      callData: submitQuote.transaction.data,
      value: submitQuote.transaction.value,
    });

    const receipt = await submitTxn.wait();

    if (receipt.status !== "success" || !receipt.transactionHash) {
      throw new Error("Paxos Transit order transaction failed");
    }

    submitTxnHash = receipt.transactionHash;

    submittedOrderId = await getSubmittedTransitOrderId({
      chainId,
      txnHash: receipt.transactionHash,
      stationAddress: submitQuote.transaction.to,
    });
  }

  if (!submittedOrderId) {
    throw new Error("Paxos Transit order transaction has no OrderSubmitted event");
  }

  return { orderId: submittedOrderId, txnHash: submitTxnHash, offerAmount: params.offerAmount, isMocked };
}

function decodeApproveCall(callData: string) {
  try {
    const { functionName, args } = decodeFunctionData({ abi: erc20Abi, data: callData as Hex });

    return functionName === "approve" ? { spender: args[0], amount: args[1] } : undefined;
  } catch {
    return undefined;
  }
}
