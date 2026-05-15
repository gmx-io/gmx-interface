import { decodeAbiParameters, decodeFunctionData, encodeAbiParameters, getAddress, zeroAddress } from "viem";
import { describe, expect, it, vi } from "vitest";

import { abis } from "abis";
import { ARBITRUM, SOURCE_BASE_MAINNET } from "configs/chains";
import { getContract } from "configs/contracts";
import { CHAIN_ID_TO_ENDPOINT_ID } from "configs/multichain";
import {
  buildCrossChainDepositTxn,
  buildCrossChainWithdrawBridgeOutParams,
  buildSameChainDepositTxn,
  buildSameChainWithdrawBridgeOutParams,
  buildSameChainWithdrawTxn,
} from "utils/multichain/api";
import type { IRpc } from "utils/rpc";

const ACCOUNT = "0x1111111111111111111111111111111111111111";
const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const STARGATE_USDC_BASE = "0x27a16dc786820B16E5c9028b75B99F6f604b5d26";
const ROUTER_ARBITRUM = getContract(ARBITRUM, "MultichainTransferRouter");
const VAULT_ARBITRUM = getContract(ARBITRUM, "MultichainVault");
const WETH_ARBITRUM = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";

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
      stargateAddress: STARGATE_USDC_BASE,
      slippageBps: 50,
    });

    expect(params.token).toBe(USDC_ARBITRUM);
    expect(params.amount).toBe(1_000_000n);
    expect(params.minAmountOut).toBe(995_000n);
    expect(params.provider).toBe(STARGATE_USDC_BASE);

    const [decodedDstEid] = decodeAbiParameters([{ type: "uint32" }], params.data as `0x${string}`);
    expect(decodedDstEid).toBe(CHAIN_ID_TO_ENDPOINT_ID[SOURCE_BASE_MAINNET]);
  });

  it("defaults minAmountOut to amount when slippage is unspecified", () => {
    const params = buildCrossChainWithdrawBridgeOutParams({
      tokenAddress: USDC_ARBITRUM,
      amount: 1_000_000n,
      dstChainId: SOURCE_BASE_MAINNET,
      stargateAddress: STARGATE_USDC_BASE,
    });

    expect(params.minAmountOut).toBe(1_000_000n);
  });
});

describe("multichain api: buildCrossChainDepositTxn", () => {
  function makeRpc({ nativeFee }: { nativeFee: bigint }): IRpc {
    const encodedQuoteSendResult = encodeAbiParameters(
      [
        {
          type: "tuple",
          components: [
            { type: "uint256", name: "nativeFee" },
            { type: "uint256", name: "lzTokenFee" },
          ],
        },
      ],
      [{ nativeFee, lzTokenFee: 0n }]
    );

    return {
      estimateGas: vi.fn().mockResolvedValue(200_000n),
      call: vi.fn().mockResolvedValue(encodedQuoteSendResult),
    } as unknown as IRpc;
  }

  it("returns Stargate sendToken txn with composeGas + nativeFee for ERC20 deposit", async () => {
    const stubRpc = makeRpc({ nativeFee: 12_345n });

    const result = await buildCrossChainDepositTxn(
      {
        chainId: ARBITRUM,
        srcChainId: SOURCE_BASE_MAINNET,
        account: ACCOUNT,
        tokenAddress: USDC_ARBITRUM,
        sourceStargatePoolAddress: STARGATE_USDC_BASE,
        isNativeOnSource: false,
        amount: 1_000_000n,
        composeGas: 500_000n,
      },
      { sourceRpc: stubRpc }
    );

    expect(result.composeGas).toBe(500_000n);
    expect(result.nativeFee).toBe(12_345n);
    expect(result.value).toBe(12_345n);
    expect(getAddress(result.to)).toBe(getAddress(STARGATE_USDC_BASE));

    const decoded = decodeFunctionData({ abi: abis.IStargate, data: result.data as `0x${string}` });
    expect(decoded.functionName).toBe("sendToken");

    expect(result.sendParams.dstEid).toBe(CHAIN_ID_TO_ENDPOINT_ID[ARBITRUM]);
    expect(result.sendParams.amountLD).toBe(1_000_000n);
    expect(result.sendParams.extraOptions).not.toBe("0x");

    // composeMsg = abi.encode(address account, bytes data) — no composeFrom prefix
    const [decodedAccount, decodedInner] = decodeAbiParameters(
      [{ type: "address" }, { type: "bytes" }],
      result.sendParams.composeMsg as `0x${string}`
    );
    expect(getAddress(decodedAccount)).toBe(getAddress(ACCOUNT));
    expect(decodedInner).toBe("0x");
  });

  it("forwards innerData into composeMsg", async () => {
    const stubRpc = makeRpc({ nativeFee: 1_000n });
    const innerData = "0xdeadbeef";

    const result = await buildCrossChainDepositTxn(
      {
        chainId: ARBITRUM,
        srcChainId: SOURCE_BASE_MAINNET,
        account: ACCOUNT,
        tokenAddress: USDC_ARBITRUM,
        sourceStargatePoolAddress: STARGATE_USDC_BASE,
        isNativeOnSource: false,
        amount: 1_000_000n,
        composeGas: 500_000n,
        innerData,
      },
      { sourceRpc: stubRpc }
    );

    const [, decodedInner] = decodeAbiParameters(
      [{ type: "address" }, { type: "bytes" }],
      result.sendParams.composeMsg as `0x${string}`
    );
    expect(decodedInner).toBe(innerData);
  });

  it("works without rpcs when both composeGas and nativeFee are precomputed (server-side prep)", async () => {
    const result = await buildCrossChainDepositTxn(
      {
        chainId: ARBITRUM,
        srcChainId: SOURCE_BASE_MAINNET,
        account: ACCOUNT,
        tokenAddress: USDC_ARBITRUM,
        sourceStargatePoolAddress: STARGATE_USDC_BASE,
        isNativeOnSource: false,
        amount: 1_000_000n,
        composeGas: 500_000n,
        nativeFee: 7_777n,
      },
      {}
    );

    expect(result.composeGas).toBe(500_000n);
    expect(result.nativeFee).toBe(7_777n);
    expect(result.value).toBe(7_777n);
  });

  it("adds amount to value when source token is native", async () => {
    const stubRpc = makeRpc({ nativeFee: 5_000n });

    const result = await buildCrossChainDepositTxn(
      {
        chainId: ARBITRUM,
        srcChainId: SOURCE_BASE_MAINNET,
        account: ACCOUNT,
        tokenAddress: WETH_ARBITRUM,
        sourceStargatePoolAddress: STARGATE_USDC_BASE,
        isNativeOnSource: true,
        amount: 10n ** 17n,
        composeGas: 500_000n,
      },
      { sourceRpc: stubRpc }
    );

    expect(result.value).toBe(5_000n + 10n ** 17n);
  });
});
