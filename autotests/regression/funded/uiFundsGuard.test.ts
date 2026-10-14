import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeFunctionData, getAddress, zeroAddress, zeroHash, type Hex } from "viem";
import ExchangeRouter from "../../../sdk/src/abis/ExchangeRouter";
import MultichainTransferRouter from "../../../sdk/src/abis/MultichainTransferRouter";
import IStargate from "../../../sdk/src/abis/IStargate";
import RewardRouter from "../../../sdk/src/abis/RewardRouter";
import { getContract } from "../../../sdk/src/configs/contracts";
import { getMultichainTransferSendParams } from "../../../sdk/src/utils/multichain/sendParams";
import { address, usdc, weth } from "../fixtures/fundedQuote";
import { inspectUiAccount } from "./uiAccount";
import { inspectUiEarn } from "./uiEarn";
import { inspectUiLiquidity, type UiLiquidityIntent } from "./uiLiquidityGuard";
import { inspectUiBridgeDeposit, basePool } from "./uiBridgeGuard";
import { assertRelayEndpoint } from "./uiRelay";
import { USD } from "./economy";
import { assertEmptyStakingPower } from "./earn";
import type { FundedSession } from "./session";

const market = getAddress("0x70d95587d40A2caf56bd97485aB3Eec10Bee6336");
const vault = getContract(42161, "DepositVault");
const fee = 100_000_000_000_000n;

test("staking cannot reset an existing stake, power, or reward entitlement", async () => {
  const empty = { currentStaked: 0n, cumulativePower: 0n, projectedRewardShare: 0n };
  const session = (power: typeof empty) =>
    ({
      address,
      sdk: { fetchStakingPower: async () => power },
    }) as unknown as FundedSession;
  await assertEmptyStakingPower(session(empty));
  for (const key of Object.keys(empty)) {
    await assert.rejects(assertEmptyStakingPower(session({ ...empty, [key]: 1n })), /must not be/);
  }
});

test("account UI guard binds amount, receiver, vault and operation", () => {
  const calls = [
    encodeFunctionData({
      abi: MultichainTransferRouter,
      functionName: "sendTokens",
      args: [usdc.address, getContract(42161, "MultichainVault"), 1_000_000n],
    }),
    encodeFunctionData({ abi: MultichainTransferRouter, functionName: "bridgeIn", args: [address, usdc.address] }),
  ];
  const tx = {
    to: getContract(42161, "MultichainTransferRouter"),
    value: 0n,
    data: encodeFunctionData({ abi: MultichainTransferRouter, functionName: "multicall", args: [calls] }),
  };
  assert.deepEqual(inspectUiAccount(tx, address, usdc.address, 1_000_000n, false), { extraFeeUsd: 0n });
  for (const changed of [
    { ...tx, to: address },
    { ...tx, value: 1n },
    {
      ...tx,
      data: encodeFunctionData({
        abi: MultichainTransferRouter,
        functionName: "multicall",
        args: [
          [
            calls[0],
            encodeFunctionData({
              abi: MultichainTransferRouter,
              functionName: "bridgeIn",
              args: [weth.address, usdc.address],
            }),
          ],
        ],
      }),
    },
  ])
    assert.throws(() => inspectUiAccount(changed, address, usdc.address, 1_000_000n, false));
  assert.throws(() => inspectUiAccount(tx, address, usdc.address, 2_000_000n, false));
  assert.throws(() => inspectUiAccount(tx, address, usdc.address, 1_000_000n, true));
});

test("claim UI guard permits only the bounded WETH claim flags and no ETH conversion", () => {
  const flags = [false, false, false, false, true, true, false] as const;
  const tx = {
    to: getContract(42161, "RewardRouter"),
    value: 0n,
    data: encodeFunctionData({ abi: RewardRouter, functionName: "handleRewards", args: flags }),
  };
  inspectUiEarn(tx, "handleRewards");
  for (const index of [0, 1, 2, 3, 5, 6]) {
    const args = [...flags];
    args[index] = !args[index];
    assert.throws(() =>
      inspectUiEarn(
        {
          ...tx,
          data: encodeFunctionData({
            abi: RewardRouter,
            functionName: "handleRewards",
            args: args as unknown as typeof flags,
          }),
        },
        "handleRewards"
      )
    );
  }
  assert.throws(() => inspectUiEarn({ ...tx, value: 1n }, "handleRewards"));
});

function liquidity() {
  const intent: UiLiquidityIntent = {
    kind: "gm",
    withdraw: false,
    account: address,
    market,
    lpToken: market,
    usdc: usdc.address,
    weth: weth.address,
    amount: 1_000_000n,
    minLp: 490_000_000_000_000_000n,
    nativePrice: 2500n * USD,
  };
  const params = {
    addresses: {
      receiver: address,
      callbackContract: zeroAddress as string,
      uiFeeReceiver: zeroAddress,
      market,
      initialLongToken: weth.address,
      initialShortToken: usdc.address,
      longTokenSwapPath: [],
      shortTokenSwapPath: [],
    },
    minMarketTokens: 495_000_000_000_000_000n,
    shouldUnwrapNativeToken: false,
    executionFee: fee,
    callbackGasLimit: 0n,
    dataList: [] as Hex[],
  };
  const encode = (p = params, additional: Hex[] = []) => ({
    to: getContract(42161, "ExchangeRouter"),
    value: fee,
    data: encodeFunctionData({
      abi: ExchangeRouter,
      functionName: "multicall",
      args: [
        [
          encodeFunctionData({ abi: ExchangeRouter, functionName: "sendWnt", args: [vault, fee] }),
          encodeFunctionData({
            abi: ExchangeRouter,
            functionName: "sendTokens",
            args: [usdc.address, vault, intent.amount],
          }),
          encodeFunctionData({ abi: ExchangeRouter, functionName: "createDeposit", args: [p] }),
          ...additional,
        ],
      ],
    }),
  });
  return { intent, params, encode };
}

test("LP guard rejects diverted proceeds, excess approval routing, callbacks and insufficient output", () => {
  const { intent, params, encode } = liquidity();
  assert.ok(inspectUiLiquidity(encode(), intent).extraFeeUsd > 0n);
  for (const paramsChange of [
    { ...params, addresses: { ...params.addresses, receiver: weth.address } },
    { ...params, addresses: { ...params.addresses, market: weth.address } },
    { ...params, addresses: { ...params.addresses, callbackContract: address } },
    { ...params, minMarketTokens: 1n },
    { ...params, executionFee: fee + 1n },
    { ...params, shouldUnwrapNativeToken: true },
    { ...params, dataList: [zeroHash] },
  ])
    assert.throws(() => inspectUiLiquidity(encode(paramsChange), intent));
  assert.throws(() =>
    inspectUiLiquidity(
      encode(params, [
        encodeFunctionData({ abi: ExchangeRouter, functionName: "sendTokens", args: [usdc.address, address, 1n] }),
      ]),
      intent
    )
  );
});

test("bridge-in guard binds destination, deposit payload, refund and loss limit", () => {
  const send = {
    ...getMultichainTransferSendParams({
      srcChainId: 8453,
      dstChainId: 42161,
      account: address,
      amountLD: 3_000_000n,
      composeGas: 500_000n,
      isToGmx: true,
    }),
    minAmountLD: 2_985_000n,
  };
  const encode = (p = send, refund = address) => ({
    to: basePool,
    value: fee,
    data: encodeFunctionData({
      abi: IStargate,
      functionName: "sendToken",
      args: [p, { nativeFee: fee, lzTokenFee: 0n }, refund],
    }),
  });
  inspectUiBridgeDeposit(encode(), address, 2500n * USD);
  for (const change of [
    { ...send, dstEid: send.dstEid + 1 },
    { ...send, to: zeroHash },
    { ...send, amountLD: 4_000_000n },
    { ...send, minAmountLD: 1n },
    { ...send, composeMsg: "0x" },
  ])
    assert.throws(() => inspectUiBridgeDeposit(encode(change), address, 2500n * USD));
  assert.throws(() => inspectUiBridgeDeposit(encode(send, weth.address), address, 2500n * USD));
});

test("UI relay cannot post to an arbitrary API or add URL credentials or query parameters", () => {
  assert.equal(assertRelayEndpoint("https://arbitrum.gmxapi.io/v1/relay/submit"), "https://arbitrum.gmxapi.io");
  for (const url of [
    "http://arbitrum.gmxapi.io/v1/relay/submit",
    "https://arbitrum.gmxapi.io.evil.example/v1/relay/submit",
    "https://arbitrum.gmxapi.io/v1/relay/submit?to=someone",
    "https://user@arbitrum.gmxapi.io/v1/relay/submit",
    "https://arbitrum.gmxapi.io/v1/orders",
  ])
    assert.throws(() => assertRelayEndpoint(url));
});
