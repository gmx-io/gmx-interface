import assert from "node:assert/strict";
import {
  decodeFunctionData,
  encodeFunctionData,
  encodeFunctionResult,
  getAddress,
  keccak256,
  parseAbi,
  zeroAddress,
  zeroHash,
  type Abi,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import DataStore from "../../../sdk/src/abis/DataStore";
import ExchangeRouter from "../../../sdk/src/abis/ExchangeRouter";
import SubaccountGelatoRelayRouter from "../../../sdk/src/abis/SubaccountGelatoRelayRouter";
import { getContract } from "../../../sdk/src/configs/contracts";
import {
  maxAllowedSubaccountActionCountKey,
  SUBACCOUNT_ORDER_ACTION,
  subaccountActionCountKey,
  subaccountExpiresAtKey,
  subaccountIntegrationIdKey,
  subaccountListKey,
} from "../../../sdk/src/configs/dataStore";
import type { AccountState } from "../fixtures/accountState";
import type { UiRelayPayload } from "./uiRelay";

export function uiOneClickRehearsal(state: AccountState) {
  let subaccount: string | undefined;
  let active = false,
    expiresAt = 0n,
    maxAllowed = 0n,
    count = 0n,
    nonce = 0n;
  const nonceAbi = parseAbi(["function subaccountApprovalNonces(address) view returns(uint256)"]);
  const removeAbi = parseAbi(["function removeSubaccount(address)"]);
  function read(functionName: string, args: readonly unknown[]) {
    if (functionName === "subaccountApprovalNonces" && getAddress(String(args[0])) === state.address) return nonce;
    if (!subaccount) return;
    if (
      functionName === "containsAddress" &&
      args[0] === subaccountListKey(state.address) &&
      getAddress(String(args[1])) === subaccount
    )
      return active;
    if (functionName === "getUint") {
      if (args[0] === maxAllowedSubaccountActionCountKey(state.address, subaccount, SUBACCOUNT_ORDER_ACTION))
        return maxAllowed;
      if (args[0] === subaccountActionCountKey(state.address, subaccount, SUBACCOUNT_ORDER_ACTION)) return count;
      if (args[0] === subaccountExpiresAtKey(state.address, subaccount, SUBACCOUNT_ORDER_ACTION)) return expiresAt;
    }
    if (functionName === "getBytes32" && args[0] === subaccountIntegrationIdKey(state.address, subaccount))
      return zeroHash;
  }
  function chargeFee(fee: { feeToken: string; feeAmount: bigint }) {
    const feeToken = getAddress(fee.feeToken);
    const spender = getAddress(getContract(42161, "SyntheticsRouter"));
    assert.ok((state.balances.get(feeToken) ?? 0n) >= fee.feeAmount);
    assert.ok((state.allowances.get(feeToken)?.get(spender) ?? 0n) >= fee.feeAmount);
    state.balances.set(feeToken, state.balances.get(feeToken)! - fee.feeAmount);
    state.allowances.get(feeToken)!.set(spender, state.allowances.get(feeToken)!.get(spender)! - fee.feeAmount);
  }
  return {
    read,
    generated(signature: Hex) {
      subaccount = privateKeyToAccount(keccak256(signature) as `0x${string}`).address;
    },
    contractRead(target: string, data: Hex): Hex | undefined {
      let abi: Abi;
      if (target === getAddress(getContract(42161, "DataStore"))) abi = DataStore;
      else if (
        [
          getAddress(getContract(42161, "SubaccountGelatoRelayRouter")),
          getAddress(getContract(42161, "MultichainSubaccountRouter")),
        ].includes(target)
      )
        abi = nonceAbi;
      else return;
      const call = decodeFunctionData({ abi, data });
      const value = read(call.functionName, call.args ?? []);
      if (value !== undefined) return encodeFunctionResult({ abi, functionName: call.functionName, result: value });
    },
    remove(data: Hex) {
      const call = decodeFunctionData({ abi: removeAbi, data });
      assert.deepEqual(call.args, [subaccount]);
      assert.ok(active);
      active = false;
    },
    relay(payload: UiRelayPayload) {
      const call = decodeFunctionData({ abi: SubaccountGelatoRelayRouter, data: payload.data });
      if (call.functionName === "removeSubaccount") {
        const [relay, account, removed] = call.args;
        assert.equal(getAddress(account), state.address);
        chargeFee(relay.fee);
        // Settles through the same simulated SubaccountRouter removal as the wallet transaction.
        return {
          to: getAddress(getContract(42161, "SubaccountRouter")),
          data: encodeFunctionData({ abi: removeAbi, functionName: "removeSubaccount", args: [removed] }),
          value: 0n,
        };
      }
      assert.equal(call.functionName, "batch");
      if (call.functionName !== "batch") throw new Error("Expected simulated 1CT batch");
      const [relay, approval, account, sender, batch] = call.args;
      assert.equal(getAddress(account), state.address);
      assert.equal(getAddress(sender), subaccount);
      if (approval.signature !== "0x") {
        assert.equal(approval.nonce, nonce);
        active = true;
        expiresAt = approval.expiresAt;
        maxAllowed = approval.maxAllowedCount;
        nonce++;
      }
      assert.ok(active && expiresAt > BigInt(Math.floor(Date.now() / 1000)));
      count += BigInt(batch.createOrderParamsList.length + batch.cancelOrderKeys.length);
      assert.ok(count <= maxAllowed);
      chargeFee(relay.fee);
      const calls: Hex[] = [];
      let value = 0n;
      for (const order of batch.createOrderParamsList) {
        value += order.numbers.executionFee;
        calls.push(
          encodeFunctionData({
            abi: ExchangeRouter,
            functionName: "createOrder",
            args: [
              {
                ...order,
                addresses: {
                  ...order.addresses,
                  receiver: order.addresses.receiver === zeroAddress ? account : order.addresses.receiver,
                },
              },
            ],
          })
        );
      }
      for (const key of batch.cancelOrderKeys)
        calls.push(encodeFunctionData({ abi: ExchangeRouter, functionName: "cancelOrder", args: [key] }));
      return {
        to: getAddress(getContract(42161, "ExchangeRouter")),
        data: encodeFunctionData({ abi: ExchangeRouter, functionName: "multicall", args: [calls] }),
        value,
      };
    },
  };
}
