import assert from "node:assert/strict";
import { decodeFunctionData, encodeFunctionResult, getAddress, type Hex } from "viem";
import IStargate from "../../../sdk/src/abis/IStargate";
import MultichainTransferRouter from "../../../sdk/src/abis/MultichainTransferRouter";
import { getContract } from "../../../sdk/src/configs/contracts";
import type { AccountState } from "../fixtures/accountState";
import { basePool, baseUsdc, arbitrumPool, bridgeAmount } from "./uiBridgeGuard";
import type { UiTransaction } from "./uiOrderGuard";
import type { UiRelayPayload } from "./uiRelay";

export function uiBridgeRehearsal(state: AccountState, usdc: string) {
  state.balances.set(baseUsdc, bridgeAmount);
  state.allowances.set(baseUsdc, new Map([[basePool, 0n]]));
  return {
    contractRead(target: string, data: Hex): Hex | undefined {
      if (![basePool, arbitrumPool].includes(target)) return;
      const call = decodeFunctionData({ abi: IStargate, data });
      if (call.functionName === "quoteSend")
        return encodeFunctionResult({
          abi: IStargate,
          functionName: call.functionName,
          result: { nativeFee: 10_000_000_000_000n, lzTokenFee: 0n },
        });
      if (call.functionName === "quoteOFT")
        return encodeFunctionResult({
          abi: IStargate,
          functionName: call.functionName,
          result: [
            { minAmountLD: 0n, maxAmountLD: 1_000_000_000n },
            [],
            { amountSentLD: call.args[0].amountLD, amountReceivedLD: call.args[0].amountLD },
          ],
        });
    },
    deposit(tx: UiTransaction) {
      assert.equal(getAddress(tx.to), basePool);
      const call = decodeFunctionData({ abi: IStargate, data: tx.data });
      if (call.functionName !== "sendToken") throw new Error("Expected simulated bridge-in");
      const amount = call.args[0].amountLD;
      assert.ok(state.allowances.get(baseUsdc)!.get(basePool)! >= amount);
      assert.equal(state.gmxBalances.get(usdc) ?? 0n, 0n);
      state.balances.set(baseUsdc, state.balances.get(baseUsdc)! - amount);
      state.gmxBalances.set(usdc, amount);
    },
    relay(payload: UiRelayPayload) {
      assert.equal(getAddress(payload.to), getAddress(getContract(42161, "MultichainTransferRouter")));
      const call = decodeFunctionData({ abi: MultichainTransferRouter, data: payload.data });
      if (call.functionName !== "bridgeOut") throw new Error("Expected simulated bridge-out");
      const [relay, account, source, params] = call.args;
      assert.equal(getAddress(account), state.address);
      assert.equal(source, 8453n);
      assert.equal(getAddress(params.token), getAddress(usdc));
      assert.ok(state.gmxBalances.get(usdc)! >= params.amount + relay.fee.feeAmount);
      state.gmxBalances.set(usdc, state.gmxBalances.get(usdc)! - params.amount - relay.fee.feeAmount);
      state.balances.set(baseUsdc, state.balances.get(baseUsdc)! + params.amount);
      const weth = getContract(42161, "NATIVE_TOKEN");
      const bridgeFee = 13_000_000_000_000n;
      assert.ok(state.gmxBalances.get(weth)! >= bridgeFee);
      state.gmxBalances.set(weth, state.gmxBalances.get(weth)! - bridgeFee);
    },
  };
}
