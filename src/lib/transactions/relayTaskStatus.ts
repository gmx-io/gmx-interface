import { getUiApiUrl } from "config/api";
import { ContractsChainId } from "config/chains";
import { ErrorLike } from "lib/errors";
import type { GmxRelayTaskResult } from "sdk/utils/express";
import { StatusCode, waitForGmxRelayTask } from "sdk/utils/express";

export type RelayTaskOutcome = {
  statusCode: StatusCode;
  transactionHash?: string;
  message?: string;
  revertData?: string;
};

export function getGmxRelayStatusCode(result: Pick<GmxRelayTaskResult, "status" | "relayStatus">): StatusCode {
  if (result.status === "success") {
    return StatusCode.Success;
  }

  return result.relayStatus === "reverted" ? StatusCode.Reverted : StatusCode.Rejected;
}

/** Never rejects: `undefined` means the relay reached no determinate outcome and on-chain events must judge the operation. */
export async function waitForRelayTaskOutcome({
  chainId,
  taskId,
}: {
  chainId: ContractsChainId;
  taskId: string;
}): Promise<RelayTaskOutcome | undefined> {
  let result: GmxRelayTaskResult;

  try {
    result = await waitForGmxRelayTask({ chainId, taskId, apiUrl: getUiApiUrl(chainId) });
  } catch (error) {
    // a determinate refusal of the status request: the relay will never report a verdict for this
    // task, and the single failure event per operation is recorded upstream off this outcome
    const message = (error as ErrorLike)?.message ?? String(error);
    const traceId = (error as ErrorLike)?.data?.traceId;

    return {
      statusCode: StatusCode.Rejected,
      message: traceId ? `${message} (traceId: ${traceId})` : message,
    };
  }

  if (result.status === "pending") {
    return undefined;
  }

  return {
    statusCode: getGmxRelayStatusCode(result),
    transactionHash: result.transactionHash,
    message: result.message,
    revertData: result.revertData,
  };
}
