import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeFunctionData, getAddress, hashTypedData } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import MultichainTransferRouter from "../../../sdk/src/abis/MultichainTransferRouter";
import { getContract } from "../../../sdk/src/configs/contracts";
import { getBridgeOutTypedData } from "../../../sdk/src/utils/express/utils/bridgeOutUtils";
import { getGelatoRelayRouterDomain } from "../../../sdk/src/utils/express/utils/relayParamsUtils";
import { getSubaccountApprovalTypedData } from "../../../sdk/src/utils/subaccount/getSubaccountApprovalTypedData";
import { usdc, weth, marketAddress } from "./fundedQuote";
import { bridgeReturnParams, inspectUiBridgeReturn, inspectUiBridgeSignature } from "./uiBridgeGuard";
import { minifiedUiTypedData, refuseUiOneClickRemoval, uiOneClickRemovalRefused } from "./uiOneClickGuard";
import type { FundedSession } from "./session";

test("bridge minified signature binds a decoded bounded UI simulation and the submitted relay", async () => {
  const signer = privateKeyToAccount(generatePrivateKey());
  const session = {
    address: signer.address,
    active: { inventory: { bridgeGasAmount: "100000000000000" } },
  } as unknown as FundedSession;
  const state = { usdc, weth, market: { marketTokenAddress: marketAddress } } as unknown as Awaited<
    ReturnType<FundedSession["snapshot"]>
  >;
  const relay = {
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
    fee: { feeToken: usdc.address, feeAmount: 100_000n, feeSwapPath: [] },
    userNonce: 1n,
    signature: "0x" as `0x${string}`,
  };
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

test("1CT removal signatures are always refused without signing, and unexpected requests are reported", async () => {
  const signer = privateKeyToAccount(generatePrivateKey());
  const router = getContract(42161, "SubaccountGelatoRelayRouter");
  const domain = getGelatoRelayRouterDomain(42161, router);
  const digest = `0x${"ab".repeat(32)}`;
  const minified = {
    domain,
    primaryType: "Minified",
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      Minified: [{ name: "digest", type: "bytes32" }],
    },
    message: { digest },
  };
  const request = (data: unknown, address: string = signer.address) => ({
    method: "eth_signTypedData_v4",
    params: [address, JSON.stringify(data)],
  });
  const approval = getSubaccountApprovalTypedData({
    chainId: 42161,
    subaccountAddress: usdc.address,
    shouldAdd: true,
    expiresAt: 1n,
    maxAllowedCount: 100n,
    nonce: 0n,
  });
  const expected = [
    request(minified),
    request({ ...minified, domain: { ...domain, verifyingContract: router.toLowerCase(), chainId: "42161" } }),
  ];
  const unexpected = [
    request(minified, usdc.address),
    request({ ...minified, domain: { ...domain, version: "2" } }),
    request({
      ...minified,
      domain: { ...domain, verifyingContract: getContract(42161, "MultichainSubaccountRouter") },
    }),
    request({ ...minified, domain: { ...domain, chainId: 8453 } }),
    request({ ...approval, primaryType: "SubaccountApproval" }),
    request({ ...minified, primaryType: "SubaccountApproval" }),
    request({ ...minified, types: { ...minified.types, Minified: [{ name: "digest", type: "bytes" }] } }),
    request({ ...minified, message: { digest, subaccount: usdc.address } }),
    { method: "personal_sign", params: [digest, signer.address] },
  ];
  for (const [r, problem] of [
    ...expected.map((r) => [r, false] as const),
    ...unexpected.map((r) => [r, true] as const),
  ]) {
    const refusal = refuseUiOneClickRemoval(signer.address);
    await assert.rejects(refusal.sign(r), new Error(uiOneClickRemovalRefused));
    assert.equal(refusal.refused, true);
    assert.equal(refusal.problem !== undefined, problem, JSON.stringify(r));
  }
  const refusal = refuseUiOneClickRemoval(signer.address);
  await assert.rejects(refusal.sign(request(minified)), new Error(uiOneClickRemovalRefused));
  await assert.rejects(refusal.sign(request(minified)), new Error(uiOneClickRemovalRefused));
  assert.match(refusal.problem!, /second 1CT removal signature/);
});
