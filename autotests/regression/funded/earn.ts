import assert from "node:assert/strict";
import { encodeFunctionData, erc20Abi, parseAbi } from "viem";

import { getContract } from "../../../sdk/src/configs/contracts";
import type { FundedSession } from "./session";

const trackerAbi = parseAbi(["function depositBalances(address,address) view returns (uint256)"]);
const routerAbi = parseAbi(["function unstakeGmx(uint256)"]);

export async function assertEmptyStakingPower(session: FundedSession) {
  const power = await session.sdk.fetchStakingPower({ address: session.address });
  assert.equal(power.currentStaked, 0n, "Existing GMX/esGMX stakes must not be changed");
  assert.equal(power.cumulativePower, 0n, "Existing staking power must not be reset");
  assert.equal(power.projectedRewardShare ?? 0n, 0n, "Existing staking rewards must not be reset");
}

export async function stakedGmx(session: FundedSession) {
  return session.rpc.readContract({
    address: getContract(42161, "StakedGmxTracker"),
    abi: trackerAbi,
    functionName: "depositBalances",
    args: [session.address, getContract(42161, "GMX")],
  });
}

export async function unstake(session: FundedSession) {
  const inventory = session.active.inventory;
  if (!inventory?.stakeAmount) return;
  const amount = await stakedGmx(session);
  if (amount) {
    assert.equal(amount, BigInt(inventory.stakeAmount), "Unexpected staked inventory");
    await session.nativeTransaction(
      {
        to: getContract(42161, "RewardRouter"),
        value: 0n,
        data: encodeFunctionData({ abi: routerAbi, functionName: "unstakeGmx", args: [amount] }),
      },
      "unstake",
      true
    );
  }
  assert.equal(await stakedGmx(session), 0n);
  const walletBalance = await session.rpc.readContract({
    address: getContract(42161, "GMX"),
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [session.address],
  });
  assert.equal(walletBalance, BigInt(inventory.stakeWalletBaseline));
}
