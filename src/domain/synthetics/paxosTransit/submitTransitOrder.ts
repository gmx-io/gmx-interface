import { type Address, decodeFunctionData, erc20Abi, type Hex, maxUint256 } from "viem";

import { sendTokenApprovalMetric } from "domain/tokens/tokenApprovalMetric";
import { helperToast } from "lib/helperToast";
import { getTxnErrorOutcome } from "lib/metrics/txnErrorOutcome";
import { sleep } from "lib/sleep";
import { sendWalletTransaction } from "lib/transactions/sendWalletTransaction";
import type { WalletSigner } from "lib/wallets";
import { AccountType, getAccountType } from "lib/wallets/useAccountType";
import { getPublicClientWithRpc } from "lib/wallets/walletConfig";
import type { ContractsChainId } from "sdk/configs/chains";
import type { TransitQuote, TransitQuoteParams } from "sdk/utils/paxos/types";

import { MOCK_CONVERSION_MS, mockTransitApi } from "./mockTransitApi";
import { getSubmittedTransitOrderId, TRANSIT_RECENT_ORDERS_PAGE_SIZE } from "./transitOrders";
import type { PaxosTransitConversion } from "./transitRouteProgress";
import {
  getIsTransitApprovalProposed,
  getIsTransitConversionProposed,
  getTransitApprovalKey,
  removeTransitApprovalProposal,
  removeTransitConversionProposal,
  storeTransitApprovalProposal,
  storeTransitConversionProposal,
  type TransitApproval,
} from "./transitWalletProposals";
import type { TransitApi } from "./types";

export type TransitSubmitStep = "approving" | "submitting";

const ALLOWANCE_POLL_INTERVAL_MS = 3_000;
const APPROVAL_WAIT_TIMEOUT_MS = 30 * 60_000;

export class TransitApprovalPendingError extends Error {
  constructor() {
    super("The approval has not executed yet. Convert again after it executes.");
  }
}

export class TransitApprovalClaimedError extends Error {
  constructor() {
    super("Another conversion flow already continues after this approval.");
  }
}

export class TransitConversionPendingError extends Error {
  constructor() {
    super("A conversion is already waiting in your wallet. Try again after it executes.");
  }
}

const conversionFlows = new Map<string, Set<object>>();
const cancelledConversionFlows = new WeakSet<object>();
const sendingConversionKeys = new Set<string>();

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
  const isSmartAccount =
    !isMocked &&
    (await getAccountType(account, getPublicClientWithRpc(chainId)).catch(() => AccountType.EOA)) ===
      AccountType.SmartAccount;

  if (isSmartAccount && getIsTransitConversionProposed({ chainId, account })) {
    throw new TransitConversionPendingError();
  }
  const approvalQuote = await api.fetchTransitQuote(params);
  const approval: TransitApproval = {
    chainId,
    account,
    tokenAddress: params.offerAsset,
    spender: approvalQuote.transaction.to,
    amount: params.offerAmount,
  };
  const conversionFlow = isSmartAccount ? startConversionFlow(approval) : undefined;
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

    if (!isSmartAccount || !getIsTransitApprovalProposed(approval)) {
      if (isSmartAccount) {
        storeTransitApprovalProposal(approval);
      }

      const approveTxn = await sendWalletTransaction({
        chainId,
        signer,
        to: params.offerAsset,
        callData: approveMethod.transaction.encoded,
      }).catch((error) => {
        if (isSmartAccount) {
          removeTransitApprovalProposal(approval);
        }

        sendTokenApprovalMetric({ ...approvalMetric, outcome: getTxnErrorOutcome(error), error });
        throw error;
      });
      sendTokenApprovalMetric({ ...approvalMetric, outcome: "accepted" });

      if (!isSmartAccount) {
        await approveTxn.wait();
      }
    }

    if (conversionFlow) {
      await waitForTransitAllowance(approval);
      removeTransitApprovalProposal(approval);

      if (cancelledConversionFlows.has(conversionFlow)) {
        throw new TransitApprovalClaimedError();
      }
    }
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
  } else if (conversionFlow) {
    const knownOrderIds = await api
      .fetchTransitOrders({ userAddress: account, pageSize: TRANSIT_RECENT_ORDERS_PAGE_SIZE })
      .then(({ orders }) => orders.map((order) => order.id))
      .catch(() => undefined);

    claimConversionFlow(approval, conversionFlow);
    removeTransitApprovalProposal(approval);
    const submittedAt = Date.now();
    const sendingKey = getTransitApprovalKey(approval);

    storeTransitConversionProposal({ chainId, account }, submittedAt);
    sendingConversionKeys.add(sendingKey);

    await sendWalletTransaction({
      chainId,
      signer,
      to: submitQuote.transaction.to,
      callData: submitQuote.transaction.data,
      value: submitQuote.transaction.value,
    })
      .catch((error) => {
        removeTransitConversionProposal({ chainId, account });
        throw error;
      })
      .finally(() => sendingConversionKeys.delete(sendingKey));

    return {
      orderId: undefined,
      txnHash: undefined,
      offerAmount: params.offerAmount,
      isMocked,
      submittedAt,
      knownOrderIds,
    };
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

function startConversionFlow(approval: TransitApproval): object {
  const key = getTransitApprovalKey(approval);
  const flow = {};

  conversionFlows.set(key, new Set([...(conversionFlows.get(key) ?? []), flow]));

  return flow;
}

function claimConversionFlow(approval: TransitApproval, flow: object) {
  const key = getTransitApprovalKey(approval);

  if (cancelledConversionFlows.has(flow)) {
    throw new TransitApprovalClaimedError();
  }

  if (sendingConversionKeys.has(key) || getIsTransitConversionProposed(approval)) {
    throw new TransitConversionPendingError();
  }

  conversionFlows.get(key)?.forEach((otherFlow) => {
    if (otherFlow !== flow) {
      cancelledConversionFlows.add(otherFlow);
    }
  });
  conversionFlows.delete(key);
}

async function waitForTransitAllowance(approval: TransitApproval) {
  const client = getPublicClientWithRpc(approval.chainId);
  const deadline = Date.now() + APPROVAL_WAIT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const allowance = await client
      .readContract({
        address: approval.tokenAddress as Address,
        abi: erc20Abi,
        functionName: "allowance",
        args: [approval.account as Address, approval.spender as Address],
      })
      .catch(() => undefined);

    if (allowance !== undefined && allowance >= approval.amount) {
      return;
    }

    await sleep(ALLOWANCE_POLL_INTERVAL_MS);
  }

  throw new TransitApprovalPendingError();
}

function decodeApproveCall(callData: string) {
  try {
    const { functionName, args } = decodeFunctionData({ abi: erc20Abi, data: callData as Hex });

    return functionName === "approve" ? { spender: args[0], amount: args[1] } : undefined;
  } catch {
    return undefined;
  }
}
