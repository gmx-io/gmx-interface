import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeFunctionData, getAddress, hashTypedData } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import MultichainTransferRouter from "../../../sdk/src/abis/MultichainTransferRouter";
import SubaccountGelatoRelayRouter from "../../../sdk/src/abis/SubaccountGelatoRelayRouter";
import { getContract } from "../../../sdk/src/configs/contracts";
import { getBridgeOutTypedData } from "../../../sdk/src/utils/express/utils/bridgeOutUtils";
import { getGelatoRelayRouterDomain, hashRelayParams } from "../../../sdk/src/utils/express/utils/relayParamsUtils";
import { usdc, weth, marketAddress } from "./fundedQuote";
import { bridgeReturnParams, inspectUiBridgeReturn, inspectUiBridgeSignature } from "./uiBridgeGuard";
import { inspectUiOneClickRemoval, inspectUiOneClickRemovalSignature, minifiedUiTypedData } from "./uiOneClickGuard";
import type { FundedSession } from "./session";

const relayParams = (fee: bigint) => ({
  oracleParams: { tokens: [], providers: [], data: [] },
  desChainId: 42161n,
  deadline: BigInt(Math.floor(Date.now() / 1000)) + 3590n,
  tokenPermits: [],
  externalCalls: {
    sendTokens: [],
    sendAmounts: [],
    externalCallTargets: [],
    externalCallDataList: [],
    refundTokens: [],
    refundReceivers: [],
  },
  fee: { feeToken: usdc.address, feeAmount: fee, feeSwapPath: [] },
  userNonce: 1n,
  signature: "0x" as `0x${string}`,
});

test("bridge minified signature binds a decoded bounded UI simulation and the submitted relay", async () => {
  const signer = privateKeyToAccount(generatePrivateKey());
  const session = {
    address: signer.address,
    active: { inventory: { bridgeGasAmount: "100000000000000" } },
  } as unknown as FundedSession;
  const state = { usdc, weth, market: { marketTokenAddress: marketAddress } } as unknown as Awaited<
    ReturnType<FundedSession["snapshot"]>
  >;
  const relay = relayParams(100_000n);
  const params = bridgeReturnParams(usdc.address);
  const typed = getBridgeOutTypedData({ chainId: 42161, srcChainId: 8453, params, relayParams: relay as never });
  const minified = minifiedUiTypedData(typed);
  const request = { method: "eth_signTypedData_v4", params: [signer.address, minified] };
  const to = getAddress(getContract(42161, "MultichainTransferRouter"));
  const data = encodeFunctionData({
    abi: MultichainTransferRouter,
    functionName: "bridgeOut",
    args: [relay as never, signer.address, 8453n, params],
  });
  const checked = inspectUiBridgeSignature(request, session, state, [{ to, value: 0n, data }]);
  assert.equal(checked.rawDigest, hashTypedData(typed as never));
  assert.throws(() =>
    inspectUiBridgeSignature({ ...request, params: [usdc.address, minified] }, session, state, [
      { to, value: 0n, data },
    ])
  );
  assert.throws(() => inspectUiBridgeSignature(request, session, state, []));
  const signature = await signer.signTypedData(minified as never);
  const encode = (amount = params.amount) =>
    encodeFunctionData({
      abi: MultichainTransferRouter,
      functionName: "bridgeOut",
      args: [{ ...relay, signature } as never, signer.address, 8453n, { ...params, amount }],
    });
  await inspectUiBridgeReturn({ to, data: encode() }, session, state, checked.rawDigest);
  await assert.rejects(
    inspectUiBridgeReturn({ to, data: encode(params.amount + 1n) }, session, state, checked.rawDigest)
  );
});

test("signed 1CT removal relays only the signed removal of the run's subaccount within the fee limit", async () => {
  const signer = privateKeyToAccount(generatePrivateKey());
  const subaccount = privateKeyToAccount(generatePrivateKey()).address;
  const session = { address: signer.address, active: { inventory: { subaccount } } } as unknown as FundedSession;
  const state = { usdc, weth, market: { marketTokenAddress: marketAddress } } as unknown as Awaited<
    ReturnType<FundedSession["snapshot"]>
  >;
  const to = getAddress(getContract(42161, "SubaccountGelatoRelayRouter"));
  const typed = (fee: bigint, removed = subaccount) =>
    minifiedUiTypedData({
      domain: getGelatoRelayRouterDomain(42161, to),
      types: {
        RemoveSubaccount: [
          { name: "subaccount", type: "address" },
          { name: "relayParams", type: "bytes32" },
        ],
      },
      primaryType: "RemoveSubaccount",
      message: { subaccount: removed, relayParams: hashRelayParams(relayParams(fee) as never) },
    });
  const request = (data: unknown) => ({ method: "eth_signTypedData_v4", params: [signer.address, data] });
  const { signedHash } = inspectUiOneClickRemovalSignature(request(typed(100_000n)), signer.address);
  assert.throws(() =>
    inspectUiOneClickRemovalSignature(
      request({ ...typed(100_000n), domain: getGelatoRelayRouterDomain(42161, usdc.address) }),
      signer.address
    )
  );
  const payload = async (fee: bigint, removed = subaccount) => ({
    to,
    data: encodeFunctionData({
      abi: SubaccountGelatoRelayRouter,
      functionName: "removeSubaccount",
      args: [
        { ...relayParams(fee), signature: await signer.signTypedData(typed(fee, removed) as never) } as never,
        signer.address,
        removed,
      ],
    }),
  });
  const checked = await inspectUiOneClickRemoval(session, await payload(100_000n), state, signedHash);
  assert.ok(checked.extraFeeUsd > 0n);
  await assert.rejects(inspectUiOneClickRemoval(session, await payload(200_000n), state, signedHash));
  await assert.rejects(inspectUiOneClickRemoval(session, await payload(100_000n, usdc.address), state, signedHash));
  const expensive = typed(2_000_000n);
  await assert.rejects(
    inspectUiOneClickRemoval(session, await payload(2_000_000n), state, hashTypedData(expensive as never))
  );
});
