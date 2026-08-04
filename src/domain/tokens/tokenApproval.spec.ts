import { decodeFunctionData, maxUint256 } from "viem";
import { describe, expect, it } from "vitest";

import TokenAbi from "sdk/abis/Token";

import { buildTokenApprovalCall, mergeTokenApprovals } from "./tokenApproval";

describe("mergeTokenApprovals", () => {
  it("merges duplicate token amounts while preserving their address casing and order", () => {
    expect(
      mergeTokenApprovals([
        { tokenAddress: "0xAbC", amount: 2n },
        { tokenAddress: "0xDef", amount: 3n },
        { tokenAddress: "0xAbC", amount: 5n },
      ])
    ).toEqual([
      { tokenAddress: "0xAbC", amount: 7n },
      { tokenAddress: "0xDef", amount: 3n },
    ]);
  });

  it("does not lowercase addresses when identifying duplicates", () => {
    expect(
      mergeTokenApprovals([
        { tokenAddress: "0xAbC", amount: 2n },
        { tokenAddress: "0xabc", amount: 5n },
      ])
    ).toEqual([
      { tokenAddress: "0xAbC", amount: 2n },
      { tokenAddress: "0xabc", amount: 5n },
    ]);
  });

  it("ignores empty addresses and treats missing amounts as zero", () => {
    expect(
      mergeTokenApprovals([
        { tokenAddress: "", amount: 10n },
        { tokenAddress: "0xAbC", amount: undefined },
        { tokenAddress: "0xAbC", amount: 4n },
      ])
    ).toEqual([{ tokenAddress: "0xAbC", amount: 4n }]);
  });
});

describe("buildTokenApprovalCall", () => {
  const tokenAddress = "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
  const spender = "0x111111125421cA6dc452d289314280a0f8842A65";

  it("encodes an unlimited ERC20 approval by default", () => {
    const call = buildTokenApprovalCall({ tokenAddress, spender });

    expect(call.to).toBe(tokenAddress);
    expect(call.value).toBe(0n);
    expect(decodeFunctionData({ abi: TokenAbi, data: call.data })).toEqual({
      functionName: "approve",
      args: [spender, maxUint256],
    });
  });

  it("encodes an explicitly requested approval amount", () => {
    const call = buildTokenApprovalCall({ tokenAddress, spender, amount: 123n });

    expect(decodeFunctionData({ abi: TokenAbi, data: call.data })).toEqual({
      functionName: "approve",
      args: [spender, 123n],
    });
  });
});
