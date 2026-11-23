import { decodeFunctionData, encodeFunctionResult, erc20Abi, type CallParameters, type Hex } from "viem";
import { describe, expect, it, vi } from "vitest";

import { abis } from "sdk/abis";
import type { SignedTokenPermit } from "sdk/utils/tokens/types";

import { checkTokenPermits, MULTICALL3_ADDRESS } from "./checkTokenPermits";

const OWNER = "0x0000000000000000000000000000000000000001";
const ROUTER = "0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6";
const USDC = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const WETH = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";

function permit(token: string, value: bigint): SignedTokenPermit {
  return {
    token,
    owner: OWNER,
    spender: ROUTER,
    value,
    deadline: 2000000000n,
    v: 27,
    r: `0x${"11".repeat(32)}`,
    s: `0x${"22".repeat(32)}`,
    onchainParams: { name: "Token", version: "1", nonce: 0n },
  };
}

type CallResult = { success: boolean; returnData: `0x${string}` };

function allowanceData(amount: bigint) {
  return encodeFunctionResult({ abi: erc20Abi, functionName: "allowance", result: amount }) as `0x${string}`;
}

function nonceData(nonce: bigint) {
  return encodeFunctionResult({
    abi: abis.ERC20PermitInterface,
    functionName: "nonces",
    result: nonce,
  }) as `0x${string}`;
}

function mockClient(results: CallResult[]) {
  return {
    call: vi.fn(async (_request: CallParameters) => ({
      data: encodeFunctionResult({ abi: abis.Multicall, functionName: "aggregate3", result: results }),
    })),
  };
}

describe("checkTokenPermits", () => {
  it("runs every permit between its allowance reads in a single Multicall3 call", async () => {
    const usdcPermit = permit(USDC, 100n);
    const wethPermit = permit(WETH, 5n);
    const client = mockClient([
      { success: true, returnData: allowanceData(1000n) },
      { success: true, returnData: nonceData(0n) },
      { success: false, returnData: "0x" },
      { success: true, returnData: allowanceData(1000n) },
      { success: true, returnData: allowanceData(0n) },
      { success: true, returnData: nonceData(0n) },
      { success: true, returnData: "0x" },
      { success: true, returnData: allowanceData(5n) },
    ]);

    await expect(
      checkTokenPermits({
        client,
        permits: [usdcPermit, wethPermit],
        requiredAmounts: { [USDC]: 100n, [WETH]: 5n },
      })
    ).resolves.toEqual({
      validPermits: [wethPermit],
      stalePermits: [usdcPermit],
      failedPermits: [],
      outdatedPermits: [],
    });

    expect(client.call).toHaveBeenCalledTimes(1);

    const { to, data } = client.call.mock.calls[0][0];
    expect(to).toBe(MULTICALL3_ADDRESS);

    const { args } = decodeFunctionData({ abi: abis.Multicall, data: data! });
    const calls = args[0] as { target: string; allowFailure: boolean; callData: Hex }[];

    expect(calls.map((call) => call.target)).toEqual([USDC, USDC, USDC, USDC, WETH, WETH, WETH, WETH]);
    expect(calls.every((call) => call.allowFailure)).toBe(true);
    expect(
      [calls[1], calls[2]].map(
        (call) => decodeFunctionData({ abi: abis.ERC20PermitInterface, data: call.callData }).functionName
      )
    ).toEqual(["nonces", "permit"]);
    [calls[0], calls[3]].forEach((call) =>
      expect(decodeFunctionData({ abi: erc20Abi, data: call.callData })).toEqual({
        functionName: "allowance",
        args: [OWNER, ROUTER],
      })
    );
  });

  it.each([
    { name: "executes and covers the spend", before: 0n, permitOk: true, allowance: 100n, expected: "validPermits" },
    { name: "reverts, allowance stays short", before: 0n, permitOk: false, allowance: 0n, expected: "failedPermits" },
    // another dapp's permit took the nonce: a new permit still works, so the token must keep its permits
    {
      name: "reverts, nonce used elsewhere",
      before: 0n,
      nonce: 1n,
      permitOk: false,
      allowance: 0n,
      expected: "outdatedPermits",
    },
    {
      name: "executes, allowance below the spend",
      before: 0n,
      permitOk: true,
      allowance: 50n,
      expected: "failedPermits",
    },
    {
      name: "allowance can't be read",
      before: undefined,
      permitOk: true,
      allowance: undefined,
      expected: "failedPermits",
    },
    {
      name: "reverts, existing allowance covers the spend",
      before: 1000n,
      permitOk: false,
      allowance: 1000n,
      expected: "stalePermits",
    },
    // an unlimited permit must not overwrite a newer, smaller approval that already covers the spend
    {
      name: "executes, but the allowance already covers the spend",
      before: 1000n,
      permitOk: true,
      allowance: 2n ** 256n - 1n,
      expected: "stalePermits",
    },
  ])("permit $name -> $expected", async ({ before, nonce = 0n, permitOk, allowance, expected }) => {
    const usdcPermit = permit(USDC, 100n);
    const read = (amount: bigint | undefined): CallResult =>
      amount === undefined
        ? { success: false, returnData: "0x" }
        : { success: true, returnData: allowanceData(amount) };
    const client = mockClient([
      read(before),
      { success: true, returnData: nonceData(nonce) },
      { success: permitOk, returnData: "0x" },
      read(allowance),
    ]);

    await expect(
      checkTokenPermits({ client, permits: [usdcPermit], requiredAmounts: { [USDC]: 100n } })
    ).resolves.toEqual({
      validPermits: [],
      stalePermits: [],
      failedPermits: [],
      outdatedPermits: [],
      [expected]: [usdcPermit],
    });
  });
});
