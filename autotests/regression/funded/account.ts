import assert from "node:assert/strict";
import { parseAbi } from "viem";

import { getContract } from "../../../sdk/src/configs/contracts";
import { multichainBalanceKey } from "../../../sdk/src/configs/dataStore";
import type { FundedSession } from "./session";
import { eventually } from "./trading";

export async function accountBalance(session: FundedSession, token: string) {
  return session.rpc.readContract({
    address: getContract(42161, "DataStore"),
    abi: parseAbi(["function getUint(bytes32) view returns (uint256)"]),
    functionName: "getUint",
    args: [multichainBalanceKey(session.address, token) as `0x${string}`],
  });
}

export async function withdrawAccount(session: FundedSession) {
  const inventory = session.active.inventory;
  if (inventory?.accountBaseline === undefined) return;
  const state = await session.snapshot();
  const baseline = BigInt(inventory.accountBaseline);
  const current = await accountBalance(session, state.usdc.address);
  const before = await session.remember("account-withdrawal", async () => ({
    amount: current - baseline,
    stableAmount: state.stableAmount,
  }));
  const amount = before.amount;
  if (amount === 0n) return;
  assert.ok(amount > 0n && amount <= BigInt(inventory.accountAmount), "Unexpected GMX Account inventory");
  if (current !== baseline) {
    assert.equal(current - baseline, amount, "GMX Account inventory changed during withdrawal");
    const bridgeOutParams = session.sdk.buildSameChainWithdrawBridgeOutParams({
      tokenAddress: state.usdc.address,
      amount,
    });
    await session.nativeTransaction(
      session.sdk.buildSameChainWithdrawTxn({ bridgeOutParams }),
      "account-withdraw",
      true
    );
  }
  await eventually(
    () => accountBalance(session, state.usdc.address),
    (value) => value === baseline
  );
  const after = await session.snapshot();
  assert.equal(after.stableAmount - before.stableAmount, amount, "Same-chain withdrawal did not reach the wallet");
}

export async function withdrawBridgeGas(session: FundedSession) {
  const inventory = session.active.inventory;
  if (inventory?.bridgeGasBaseline !== "0") return;
  const token = (await session.snapshot()).weth.address;
  const current = await accountBalance(session, token);
  if (!current) return;
  assert.ok(current <= BigInt(inventory.bridgeGasAmount), "Unexpected GMX Account WETH inventory");
  const params = session.sdk.buildSameChainWithdrawBridgeOutParams({ tokenAddress: token, amount: current });
  await session.nativeTransaction(
    session.sdk.buildSameChainWithdrawTxn({ bridgeOutParams: params }),
    "bridge-gas-withdraw",
    true
  );
  await eventually(
    () => accountBalance(session, token),
    (value) => value === 0n
  );
}
