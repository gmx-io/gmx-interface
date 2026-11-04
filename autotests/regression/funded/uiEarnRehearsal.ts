import { expect } from "@playwright/test";
import { decodeFunctionData, encodeFunctionResult, getAddress, type Hex } from "viem";
import RewardReader from "../../../sdk/src/abis/RewardReader";
import RewardRouter from "../../../sdk/src/abis/RewardRouter";
import Reader from "../../../sdk/src/abis/ReaderV2";
import { getContract } from "../../../sdk/src/configs/contracts";
import type { AccountState } from "../fixtures/accountState";

export function uiEarnRehearsal(state: AccountState, weth: string) {
  let stake = 0n;
  let rewards = 100_000_000_000_000n;
  const gmx = getAddress(getContract(42161, "GMX"));
  const tracker = getAddress(getContract(42161, "StakedGmxTracker"));
  const feeTracker = getAddress(getContract(42161, "FeeGmxTracker"));
  state.balances.set(gmx, 10n ** 18n);
  state.allowances.set(gmx, new Map([[tracker, 0n]]));
  return {
    gmx,
    power: () => ({
      cumulativePower: stake * 10n,
      totalNetworkPower: 10n ** 30n,
      userSharePercent: 0,
      historicalMaxStaked: stake,
      currentStaked: stake,
      loyaltyRatio: stake > 0n ? 1 : null,
      lastPowerResetAt: null,
      powerResetCount: 0,
      projectedRewardShare: 0n,
      treasuryGmxBalance: 0n,
      powerAccrualStart: 1,
      loyaltyTrackingStart: 1,
    }),
    read(functionName: string, address: string) {
      if (functionName === "depositBalances") return stake;
      if (functionName === "claimable") return getAddress(address) === feeTracker ? rewards : 0n;
      return undefined;
    },
    contractRead(target: string, data: Hex): Hex | undefined {
      if (target === getAddress(getContract(42161, "Reader"))) {
        const call = decodeFunctionData({ abi: Reader, data });
        if (call.functionName === "getVestingInfo" && getAddress(call.args[0]) === state.address)
          return encodeFunctionResult({
            abi: Reader,
            functionName: call.functionName,
            result: call.args[1].flatMap(() => Array<bigint>(7).fill(0n)),
          });
        if (call.functionName === "getTokenBalancesWithSupplies" && getAddress(call.args[0]) === state.address)
          return encodeFunctionResult({
            abi: Reader,
            functionName: call.functionName,
            result: call.args[1].flatMap((token) => [
              getAddress(token) === tracker ? stake : state.balances.get(getAddress(token)) ?? 0n,
              20_000_000n * 10n ** 18n,
            ]),
          });
      }
      if (target !== getAddress(getContract(42161, "RewardReader"))) return;
      const call = decodeFunctionData({ abi: RewardReader, data });
      if (getAddress(call.args[0]) !== state.address) return;
      if (call.functionName === "getDepositBalances")
        return encodeFunctionResult({
          abi: RewardReader,
          functionName: call.functionName,
          result: call.args[1].map((token) =>
            [gmx, tracker, getAddress(getContract(42161, "ExtendedGmxTracker"))].includes(getAddress(token))
              ? stake
              : 0n
          ),
        });
      if (call.functionName === "getStakingInfo")
        return encodeFunctionResult({
          abi: RewardReader,
          functionName: call.functionName,
          result: call.args[1].flatMap((token) => [
            getAddress(token) === feeTracker ? rewards : 0n,
            0n,
            stake,
            0n,
            1_000_000n * 10n ** 18n,
          ]),
        });
    },
    transact(data: Hex) {
      const call = decodeFunctionData({ abi: RewardRouter, data });
      if (call.functionName === "handleRewards") {
        expect(call.args).toEqual([false, false, false, false, true, true, false]);
        state.balances.set(weth, (state.balances.get(weth) ?? 0n) + rewards);
        rewards = 0n;
      } else if (call.functionName === "stakeGmx") {
        expect(stake).toBe(0n);
        expect(state.allowances.get(gmx)!.get(tracker)).toBeGreaterThanOrEqual(call.args[0]);
        stake = call.args[0];
        state.balances.set(gmx, state.balances.get(gmx)! - stake);
        state.balances.set(feeTracker, stake);
      } else if (call.functionName === "unstakeGmx") {
        expect(call.args[0]).toBe(stake);
        state.balances.set(gmx, state.balances.get(gmx)! + stake);
        stake = 0n;
        state.balances.set(feeTracker, 0n);
      } else throw new Error("Unsupported simulated earn operation");
    },
  };
}
