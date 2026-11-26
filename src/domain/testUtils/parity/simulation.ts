import { decodeFunctionData, EIP1193RequestFn, erc20Abi, numberToHex, pad } from "viem";

import { tryDecodeCustomError } from "sdk/utils/errors/parseError";

import { getMappingEntrySlot, LIVE_STATE, ParityContext } from "./context";

export type TraceCall = { to?: string; input?: string; output?: string; error?: string; calls?: TraceCall[] };

export type StateOverrides = Record<string, { balance?: string; stateDiff?: Record<string, string> }>;

type TraceCallRequest = {
  Method: "debug_traceCall";
  Parameters: [
    call: Record<string, string>,
    block: string,
    config: { tracer: "callTracer"; stateOverrides: StateOverrides },
  ];
  ReturnType: TraceCall;
};

// debug_traceCall and the balance slot probe take their own state overrides, not the scenario's
function assertLiveState(ctx: ParityContext) {
  if (ctx.state !== LIVE_STATE) {
    throw new Error(`Simulations run on the live state only, not in "${ctx.state}"`);
  }
}

/**
 * A transaction run at the context's block with debug_traceCall, as a call tree. The tree keeps the calls of
 * reverted frames, so a simulateExecute call that ends in EndOfOracleSimulation still shows what the execution
 * sent.
 */
export function traceCall(
  ctx: ParityContext,
  tx: { from: string; to: string; data: string; value: bigint },
  stateOverrides: StateOverrides
) {
  assertLiveState(ctx);

  const call = { ...tx, value: numberToHex(tx.value), gas: numberToHex(30_000_000n) };
  const config = { tracer: "callTracer" as const, stateOverrides };
  const request = ctx.client.request as EIP1193RequestFn<[TraceCallRequest]>;

  return request({ method: "debug_traceCall", params: [call, numberToHex(ctx.blockNumber), config] });
}

/** The revert a simulateExecute call ends in: makeExternalCalls wraps it in ExternalCallFailed */
export function getSimulationRevert(trace: TraceCall) {
  const outer = trace.output ? tryDecodeCustomError(trace.output) : undefined;

  return outer?.name === "ExternalCallFailed" && outer.args?.data ? tryDecodeCustomError(outer.args.data) : outer;
}

/** The token amount a call tree sends to the receiver through ERC20 transfer calls */
export function getTransferredAmountTo(call: TraceCall, token: string, receiver: string): bigint {
  const nested = (call.calls ?? []).reduce((sum, child) => sum + getTransferredAmountTo(child, token, receiver), 0n);

  if (call.to?.toLowerCase() !== token.toLowerCase() || !call.input?.startsWith("0xa9059cbb")) {
    return nested;
  }

  const decoded = decodeFunctionData({ abi: erc20Abi, data: call.input });

  if (decoded.functionName !== "transfer") {
    return nested;
  }

  const [to, amount] = decoded.args;

  return to.toLowerCase() === receiver.toLowerCase() ? nested + amount : nested;
}

const balanceSlots = new Map<string, Promise<bigint>>();

// Finds the slot of the token's balances mapping: the first one whose override shows up in balanceOf
async function findBalanceSlot(ctx: ParityContext, token: string) {
  const probe = "0x00000000000000000000000000000000000c0ffe";

  for (let slot = 0n; slot < 50n; slot++) {
    const balance = await ctx.client.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [probe],
      stateOverride: [
        { address: token, stateDiff: [{ slot: getMappingEntrySlot(probe, slot), value: pad(numberToHex(12345n)) }] },
      ],
    });

    if (balance === 12345n) {
      return slot;
    }
  }

  throw new Error(`No balances slot found for ${token}`);
}

/** Gives the account an ERC20 balance and an allowance for the spender, for OpenZeppelin ERC20 storage */
export async function getErc20Overrides(
  ctx: ParityContext,
  p: { token: string; account: string; amount: bigint; spender: string }
): Promise<StateOverrides> {
  assertLiveState(ctx);

  if (!balanceSlots.has(p.token)) {
    balanceSlots.set(p.token, findBalanceSlot(ctx, p.token));
  }

  const balanceSlot = await balanceSlots.get(p.token)!;
  // OpenZeppelin keeps the allowances mapping right after the balances
  const allowanceSlot = getMappingEntrySlot(p.spender, getMappingEntrySlot(p.account, balanceSlot + 1n));
  const stateDiff = {
    [getMappingEntrySlot(p.account, balanceSlot)]: pad(numberToHex(p.amount)),
    [allowanceSlot]: pad(numberToHex(p.amount)),
  };

  return { [p.token]: { stateDiff } };
}
