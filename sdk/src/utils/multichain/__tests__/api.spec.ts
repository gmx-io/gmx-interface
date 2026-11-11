import { decodeAbiParameters, decodeFunctionData, getAddress, zeroAddress } from "viem";
import { describe, expect, it } from "vitest";

import { abis } from "abis";
import ERC20PermitInterface from "abis/ERC20PermitInterface";
import { ARBITRUM, SOURCE_BASE_MAINNET } from "configs/chains";
import { getContract } from "configs/contracts";
import { CHAIN_ID_TO_ENDPOINT_ID } from "configs/multichain";
import {
  buildCrossChainWithdrawBridgeOutParams,
  buildSameChainDepositTxn,
  buildSameChainWithdrawBridgeOutParams,
  buildSameChainWithdrawTxn,
} from "utils/multichain/api";
import type { SignedTokenPermit } from "utils/tokens/types";

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const STARGATE_USDC_ARBITRUM = "0xe8CDF27AcD73a434D661C84887215F7598e7d0d3";
const ROUTER_ARBITRUM = getContract(ARBITRUM, "MultichainTransferRouter");
const VAULT_ARBITRUM = getContract(ARBITRUM, "MultichainVault");
const WETH_ARBITRUM = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";

const USDC_PERMIT: SignedTokenPermit = {
  token: USDC_ARBITRUM,
  owner: ACCOUNT,
  spender: getContract(ARBITRUM, "SyntheticsRouter"),
  value: 2n ** 256n - 1n,
  deadline: 2000000000n,
  v: 27,
  r: `0x${"11".repeat(32)}`,
  s: `0x${"22".repeat(32)}`,
  onchainParams: { name: "USD Coin", version: "2", nonce: 0n },
};

function decodeMulticall(data: string): string[] {
  const { args } = decodeFunctionData({ abi: abis.MultichainTransferRouter, data: data as `0x${string}` });
  return args![0] as string[];
}

describe("multichain api: buildSameChainDepositTxn", () => {
  it("encodes multicall(sendTokens + bridgeIn) for ERC20 deposit", () => {
    const result = buildSameChainDepositTxn({
      chainId: ARBITRUM,
      tokenAddress: USDC_ARBITRUM,
      amount: 1_000_000n,
      account: ACCOUNT,
    });

    expect(getAddress(result.to)).toBe(getAddress(ROUTER_ARBITRUM));
    expect(result.value).toBe(0n);

    const inner = decodeMulticall(result.data);
    expect(inner).toHaveLength(2);

    const sendTokensDecoded = decodeFunctionData({
      abi: abis.MultichainTransferRouter,
      data: inner[0] as `0x${string}`,
    });
    expect(sendTokensDecoded.functionName).toBe("sendTokens");
    expect(sendTokensDecoded.args).toEqual([getAddress(USDC_ARBITRUM), getAddress(VAULT_ARBITRUM), 1_000_000n]);

    const bridgeInDecoded = decodeFunctionData({
      abi: abis.MultichainTransferRouter,
      data: inner[1] as `0x${string}`,
    });
    expect(bridgeInDecoded.functionName).toBe("bridgeIn");
    expect(bridgeInDecoded.args).toEqual([getAddress(ACCOUNT), getAddress(USDC_ARBITRUM)]);
  });

  it("encodes multicall(sendWnt + bridgeIn) for native deposit", () => {
    const result = buildSameChainDepositTxn({
      chainId: ARBITRUM,
      tokenAddress: zeroAddress,
      amount: 10n ** 18n,
      account: ACCOUNT,
    });

    expect(result.value).toBe(10n ** 18n);

    const inner = decodeMulticall(result.data);
    expect(inner).toHaveLength(2);

    const sendWntDecoded = decodeFunctionData({
      abi: abis.MultichainTransferRouter,
      data: inner[0] as `0x${string}`,
    });
    expect(sendWntDecoded.functionName).toBe("sendWnt");
    expect(sendWntDecoded.args).toEqual([getAddress(VAULT_ARBITRUM), 10n ** 18n]);

    const bridgeInDecoded = decodeFunctionData({
      abi: abis.MultichainTransferRouter,
      data: inner[1] as `0x${string}`,
    });
    expect(bridgeInDecoded.functionName).toBe("bridgeIn");
    expect(bridgeInDecoded.args).toEqual([getAddress(ACCOUNT), getAddress(WETH_ARBITRUM)]);
  });

  it("sends a deposit with a permit as one ExchangeRouter multicall: permit, transfer to the vault, bridgeIn", () => {
    const result = buildSameChainDepositTxn({
      chainId: ARBITRUM,
      tokenAddress: USDC_ARBITRUM,
      amount: 1_000_000n,
      account: ACCOUNT,
      tokenPermits: [USDC_PERMIT],
    });

    expect(getAddress(result.to)).toBe(getAddress(getContract(ARBITRUM, "ExchangeRouter")));
    expect(result.value).toBe(0n);

    const { args } = decodeFunctionData({ abi: abis.ExchangeRouter, data: result.data });
    const calls = (args![0] as `0x${string}`[]).map((data) => decodeFunctionData({ abi: abis.ExchangeRouter, data }));

    expect(calls.map((call) => call.functionName)).toEqual(["makeExternalCalls", "sendTokens", "makeExternalCalls"]);

    const [permitTargets, permitCalls] = calls[0].args as unknown as [string[], `0x${string}`[]];
    expect(permitTargets).toEqual([getAddress(USDC_ARBITRUM)]);
    expect(decodeFunctionData({ abi: ERC20PermitInterface, data: permitCalls[0] }).args).toEqual([
      getAddress(ACCOUNT),
      getAddress(USDC_PERMIT.spender),
      USDC_PERMIT.value,
      USDC_PERMIT.deadline,
      USDC_PERMIT.v,
      USDC_PERMIT.r,
      USDC_PERMIT.s,
    ]);

    expect(calls[1].args).toEqual([getAddress(USDC_ARBITRUM), getAddress(VAULT_ARBITRUM), 1_000_000n]);

    const [bridgeInTargets, bridgeInCalls] = calls[2].args as unknown as [string[], `0x${string}`[]];
    expect(bridgeInTargets).toEqual([getAddress(ROUTER_ARBITRUM)]);
    const bridgeInDecoded = decodeFunctionData({ abi: abis.MultichainTransferRouter, data: bridgeInCalls[0] });
    expect(bridgeInDecoded.functionName).toBe("bridgeIn");
    expect(bridgeInDecoded.args).toEqual([getAddress(ACCOUNT), getAddress(USDC_ARBITRUM)]);
  });
});

describe("multichain api: same-chain withdraw helpers", () => {
  it("buildSameChainWithdrawBridgeOutParams returns zero-provider params", () => {
    const params = buildSameChainWithdrawBridgeOutParams({
      tokenAddress: USDC_ARBITRUM,
      amount: 500_000n,
    });

    expect(params).toEqual({
      token: USDC_ARBITRUM,
      amount: 500_000n,
      minAmountOut: 500_000n,
      data: "0x",
      provider: zeroAddress,
    });
  });

  it("buildSameChainWithdrawTxn encodes transferOut", () => {
    const bridgeOutParams = buildSameChainWithdrawBridgeOutParams({
      tokenAddress: USDC_ARBITRUM,
      amount: 500_000n,
    });

    const result = buildSameChainWithdrawTxn({ chainId: ARBITRUM, bridgeOutParams });

    expect(getAddress(result.to)).toBe(getAddress(ROUTER_ARBITRUM));
    expect(result.value).toBe(0n);

    const decoded = decodeFunctionData({
      abi: abis.MultichainTransferRouter,
      data: result.data as `0x${string}`,
    });
    expect(decoded.functionName).toBe("transferOut");
    expect(decoded.args).toEqual([
      {
        token: getAddress(USDC_ARBITRUM),
        amount: 500_000n,
        minAmountOut: 500_000n,
        data: "0x",
        provider: zeroAddress,
      },
    ]);
  });
});

describe("multichain api: buildCrossChainWithdrawBridgeOutParams", () => {
  it("encodes destination LayerZero endpoint id and applies slippage", () => {
    const params = buildCrossChainWithdrawBridgeOutParams({
      tokenAddress: USDC_ARBITRUM,
      amount: 1_000_000n,
      dstChainId: SOURCE_BASE_MAINNET,
      stargateAddress: STARGATE_USDC_ARBITRUM,
      slippageBps: 50,
    });

    expect(params.token).toBe(USDC_ARBITRUM);
    expect(params.amount).toBe(1_000_000n);
    expect(params.minAmountOut).toBe(995_000n);
    expect(params.provider).toBe(STARGATE_USDC_ARBITRUM);

    const [decodedDstEid] = decodeAbiParameters([{ type: "uint32" }], params.data as `0x${string}`);
    expect(decodedDstEid).toBe(CHAIN_ID_TO_ENDPOINT_ID[SOURCE_BASE_MAINNET]);
  });

  it("leaves 50 bps for the bridge fee when slippage is unspecified", () => {
    const params = buildCrossChainWithdrawBridgeOutParams({
      tokenAddress: USDC_ARBITRUM,
      amount: 1_000_000n,
      dstChainId: SOURCE_BASE_MAINNET,
      stargateAddress: STARGATE_USDC_ARBITRUM,
    });

    expect(params.minAmountOut).toBe(995_000n);
  });

  it("keeps minAmountOut equal to amount with zero slippage", () => {
    const params = buildCrossChainWithdrawBridgeOutParams({
      tokenAddress: USDC_ARBITRUM,
      amount: 1_000_000n,
      dstChainId: SOURCE_BASE_MAINNET,
      stargateAddress: STARGATE_USDC_ARBITRUM,
      slippageBps: 0,
    });

    expect(params.minAmountOut).toBe(1_000_000n);
  });
});
