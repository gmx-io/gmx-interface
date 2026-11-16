import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { APIResponse } from "@playwright/test";
import { getAddress, keccak256, type Hex } from "viem";
import { getApiUrl } from "../../../sdk/src/configs/api";
import { waitForGmxRelayTask } from "../../../sdk/src/utils/express/utils/gmxRelayUtils";
import type { FundedAction } from "./journal";
import type { FundedSession } from "./session";
import { registerUiOrderReceipt } from "./uiOrderReceipt";

export type UiRelayPayload = { to: string; data: Hex };
export type UiRelayResponse = Pick<APIResponse, "ok" | "json">;

export function assertRelayEndpoint(url: string) {
  const parsed = new URL(url);
  assert.ok([getApiUrl(42161), getApiUrl(42161, "test")].includes(parsed.origin));
  assert.equal(parsed.pathname, "/v1/relay/submit");
  assert.equal(parsed.search, "");
  assert.equal(parsed.username + parsed.password + parsed.hash, "");
  return parsed.origin;
}

export async function reconcileUiRelay(session: FundedSession, action: FundedAction) {
  const relay = action.uiRelay!;
  assert.ok(relay.taskId, "Relay submission has an uncertain outcome; it must not be submitted again");
  const status = await waitForGmxRelayTask({ chainId: 42161, taskId: relay.taskId, apiUrl: relay.apiUrl });
  if (status.status === "failed") {
    action.state = "failed";
    action.failureReason = `UI relay ${status.relayStatus}; the action must not be resubmitted`;
    action.finishedAt = new Date().toISOString();
    await session.save();
    throw new Error(action.failureReason);
  }
  assert.equal(status.status, "success", "UI relay outcome is pending; do not resubmit");
  assert.ok(status.transactionHash && /^0x[\da-fA-F]{64}$/.test(status.transactionHash));
  action.txHash = status.transactionHash as `0x${string}`;
  await session.save();
  const receipt = await session.rpc.waitForTransactionReceipt({ hash: action.txHash, timeout: 120_000 });
  assert.equal(receipt.status, "success", "UI relay transaction reverted");
  if (action.uiOrder) registerUiOrderReceipt(session.active, action, receipt);
  action.state = "settled";
  action.finishedAt = new Date().toISOString();
  await session.save();
}

export async function submitUiRelay<T extends UiRelayResponse>(
  session: FundedSession,
  url: string,
  payload: UiRelayPayload,
  purpose: string,
  cleanup: boolean,
  extraFeeUsd: bigint,
  step: string | undefined,
  send: () => Promise<T>,
  uiOrder?: FundedAction["uiOrder"]
): Promise<{ action: FundedAction; response?: T }> {
  const apiUrl = assertRelayEndpoint(url);
  const previous = await session.previousAction(purpose);
  if (previous) return { action: previous };
  await session.gate(extraFeeUsd, cleanup);
  const action: FundedAction = {
    id: randomUUID(),
    purpose,
    feeUsd: extraFeeUsd.toString(),
    state: "pending",
    step,
    startedAt: new Date().toISOString(),
    chainId: 42161,
    uiOrder,
    uiRelay: { apiUrl, to: getAddress(payload.to), calldataHash: keccak256(payload.data) },
  };
  session.active.actions.push(action);
  // Persist before the write. A lost HTTP response must never cause a second payment on retry.
  await session.save();
  const response = await send();
  assert.ok(response.ok(), "UI relay refused the request; inspect its saved action before retrying");
  const result = (await response.json()) as { taskId?: unknown };
  assert.ok(typeof result.taskId === "string" && result.taskId.length > 0 && result.taskId.length <= 200);
  action.uiRelay!.taskId = result.taskId;
  await session.save();
  return { action, response };
}
