import assert from "node:assert/strict";
import { encodeFunctionData, erc20Abi, parseAbi } from "viem";

import { getContract } from "../../../sdk/src/configs/contracts";
import { USD } from "./economy";
import type { FundedSession } from "./session";
import { eventually } from "./trading";

const trackerAbi = parseAbi([
  "function depositBalances(address,address) view returns (uint256)",
  "function claimable(address) view returns (uint256)",
]);
const routerAbi = parseAbi([
  "function stakeGmx(uint256)",
  "function unstakeGmx(uint256)",
  "function handleRewards(bool,bool,bool,bool,bool,bool,bool)",
]);

export async function stakedGmx(session: FundedSession) {
  return session.rpc.readContract({
    address: getContract(42161, "StakedGmxTracker"),
    abi: trackerAbi,
    functionName: "depositBalances",
    args: [session.address, getContract(42161, "GMX")],
  });
}

export async function stake(session: FundedSession) {
  const inventory = (session.active.inventory ??= {});
  const token = getContract(42161, "GMX");
  if (inventory.stakeAmount === undefined) {
    assert.equal(await stakedGmx(session), 0n, "Existing stakes/loyalty state must not be changed by regression");
    const [walletBalance, tokens] = await Promise.all([
      session.rpc.readContract({ abi: erc20Abi, address: token, functionName: "balanceOf", args: [session.address] }),
      session.sdk.fetchTokensData(),
    ]);
    const gmx = tokens.find((t) => t.symbol === "GMX");
    if (!gmx || gmx.prices.maxPrice <= 0n || walletBalance === 0n)
      throw new Error("BLOCKED: staking requires an existing GMX balance; no automatic GMX purchase");
    const limit = (USD * 10n ** 18n) / gmx.prices.maxPrice;
    inventory.stakeAmount = (walletBalance < limit ? walletBalance : limit).toString();
    inventory.stakeWalletBaseline = walletBalance.toString();
    await session.save();
  }
  const amount = BigInt(inventory.stakeAmount);
  assert.ok(amount > 0n);
  await session.allowance({ address: token }, amount, false, getContract(42161, "StakedGmxTracker"));
  await session.nativeTransaction(
    {
      to: getContract(42161, "RewardRouter"),
      value: 0n,
      data: encodeFunctionData({ abi: routerAbi, functionName: "stakeGmx", args: [amount] }),
    },
    "stake",
    false
  );
  assert.equal(await stakedGmx(session), amount);
  return amount;
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

export async function claimRewards(session: FundedSession) {
  const before = await session.remember("balances", async () => ({
    wrappedAmount: (await session.snapshot()).wrappedAmount,
  }));
  const claimable = await session.remember("claimable", async () => {
    const amounts = await Promise.all(
      ["FeeGmxTracker", "FeeGlpTracker"].map((name) =>
        session.rpc.readContract({
          address: getContract(42161, name as "FeeGmxTracker" | "FeeGlpTracker"),
          abi: trackerAbi,
          functionName: "claimable",
          args: [session.address],
        })
      )
    );
    return amounts.reduce((sum, value) => sum + value, 0n);
  });
  if (claimable === 0n) throw new Error("BLOCKED: this wallet has no staking rewards to claim");
  const state = await session.snapshot();
  if ((claimable * state.weth.prices.maxPrice) / 10n ** 18n > 2n * USD)
    throw new Error("BLOCKED: claim exceeds the $2 economy reward limit");
  await session.nativeTransaction(
    {
      to: getContract(42161, "RewardRouter"),
      value: 0n,
      data: encodeFunctionData({
        abi: routerAbi,
        functionName: "handleRewards",
        args: [false, false, false, false, false, true, false],
      }),
    },
    "claim-rewards",
    false
  );
  await eventually(
    () => session.snapshot(),
    (s) => s.wrappedAmount >= before.wrappedAmount + claimable
  );
  return claimable;
}
