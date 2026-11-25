import {
  concat,
  createPublicClient,
  decodeFunctionData,
  erc20Abi,
  http,
  keccak256,
  numberToHex,
  pad,
  rpcSchema,
} from "viem";

import type { ParityContext } from "./context";

// eslint-disable-next-line no-restricted-globals -- test-only helper, never bundled into the client
const { PARITY_RPC_URL = "https://arb1.arbitrum.io/rpc" } = process.env;

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

const upstream = createPublicClient({
  transport: http(PARITY_RPC_URL, { retryCount: 5, retryDelay: 1000 }),
  rpcSchema: rpcSchema<[TraceCallRequest]>(),
});

/**
 * A transaction run at the context's block with debug_traceCall, as a call tree. The tree keeps the calls of
 * reverted frames, so a simulateExecute call that ends in EndOfOracleSimulation still shows what the execution
 * sent. Needs an RPC with debug_traceCall (Alchemy has it, the public Arbitrum RPC does not).
 */
export function traceCall(
  ctx: ParityContext,
  tx: { from: string; to: string; data: string; value: bigint },
  stateOverrides: StateOverrides
) {
  const call = { ...tx, value: numberToHex(tx.value), gas: numberToHex(30_000_000n) };
  const config = { tracer: "callTracer" as const, stateOverrides };

  return upstream.request({ method: "debug_traceCall", params: [call, numberToHex(ctx.blockNumber), config] });
}

/** The token amount a call tree sends to the receiver through ERC20 transfer calls */
export function getTransfersTo(call: TraceCall, token: string, receiver: string): bigint {
  const nested = (call.calls ?? []).reduce((sum, child) => sum + getTransfersTo(child, token, receiver), 0n);

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

const mappingSlot = (key: string, slot: bigint | string) =>
  keccak256(concat([pad(key), typeof slot === "bigint" ? pad(numberToHex(slot)) : slot]));

const balanceSlots = new Map<string, Promise<bigint>>();

// Finds the slot of the token's balances mapping: the first one whose override shows up in balanceOf
async function findBalanceSlot(ctx: ParityContext, token: string) {
  const probe = "0x00000000000000000000000000000000000c0ffe";

  for (let slot = 0n; slot < 50n; slot++) {
    const balance = await upstream.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [probe],
      blockNumber: ctx.blockNumber,
      stateOverride: [
        { address: token, stateDiff: [{ slot: mappingSlot(probe, slot), value: pad(numberToHex(12345n)) }] },
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
  if (!balanceSlots.has(p.token)) {
    balanceSlots.set(p.token, findBalanceSlot(ctx, p.token));
  }

  const balanceSlot = await balanceSlots.get(p.token)!;
  // OpenZeppelin keeps the allowances mapping right after the balances
  const allowanceSlot = mappingSlot(p.spender, mappingSlot(p.account, balanceSlot + 1n));
  const stateDiff = {
    [mappingSlot(p.account, balanceSlot)]: pad(numberToHex(p.amount)),
    [allowanceSlot]: pad(numberToHex(p.amount)),
  };

  return { [p.token]: { stateDiff } };
}
