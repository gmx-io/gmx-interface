import assert from "node:assert/strict";
import { Options } from "@layerzerolabs/lz-v2-utilities";
import {
  decodeFunctionData,
  encodeAbiParameters,
  getAddress,
  hashTypedData,
  recoverTypedDataAddress,
  type Hex,
} from "viem";
import IStargate from "../../../sdk/src/abis/IStargate";
import MultichainTransferRouter from "../../../sdk/src/abis/MultichainTransferRouter";
import { getContract } from "../../../sdk/src/configs/contracts";
import { getLayerZeroEndpointId } from "../../../sdk/src/configs/multichain";
import { getMultichainTransferSendParams } from "../../../sdk/src/utils/multichain/sendParams";
import { getBridgeOutTypedData } from "../../../sdk/src/utils/express/utils/bridgeOutUtils";
import type { RelayParamsPayload } from "../../../sdk/src/utils/express/types";
import type { WalletRequest } from "../fixtures/injectedWallet";
import { USD } from "./economy";
import type { FundedSession } from "./session";
import type { UiTransaction } from "./uiOrderGuard";
import { inspectUiRelayFees, walletTypedData, minifiedUiTypedData } from "./uiOneClickGuard";
import type { UiRelayPayload } from "./uiRelay";

export const baseUsdc = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const basePool = "0x27a16dc786820B16E5c9028b75B99F6f604b5d26";
export const arbitrumPool = "0xe8CDF27AcD73a434D661C84887215F7598e7d0d3";
export const bridgeAmount = 3_000_000n;
export const bridgeReturnAmount = 2_000_000n;

export function inspectUiBridgeDeposit(tx: UiTransaction, account: string, nativePrice: bigint) {
  assert.equal(getAddress(tx.to), basePool);
  const call = decodeFunctionData({ abi: IStargate, data: tx.data });
  assert.equal(call.functionName, "sendToken");
  if (call.functionName !== "sendToken") throw new Error("Expected Stargate deposit");
  const [send, fee, refund] = call.args;
  assert.equal(getAddress(refund), getAddress(account));
  assert.equal(fee.lzTokenFee, 0n);
  assert.equal(fee.nativeFee, tx.value);
  assert.ok(tx.value > 0n);
  const compose = Options.fromOptions(send.extraOptions).decodeExecutorComposeOption();
  assert.equal(compose.length, 1);
  assert.equal(compose[0].index, 0);
  assert.ok(compose[0].gas > 0n && compose[0].gas <= 3_000_000n);
  assert.equal(compose[0].value, 0n);
  const expected = getMultichainTransferSendParams({
    srcChainId: 8453,
    dstChainId: 42161,
    account,
    amountLD: bridgeAmount,
    composeGas: compose[0].gas,
    isToGmx: true,
  });
  assert.ok(send.minAmountLD >= (bridgeAmount * 9_950n) / 10_000n && send.minAmountLD <= bridgeAmount);
  assert.deepEqual(send, { ...expected, minAmountLD: send.minAmountLD });
  return { extraFeeUsd: (tx.value * nativePrice) / 10n ** 18n + USD / 50n };
}

export function bridgeReturnParams(token: string, minAmountOut = (bridgeReturnAmount * 9_950n) / 10_000n) {
  assert.ok(minAmountOut >= (bridgeReturnAmount * 9_950n) / 10_000n && minAmountOut <= bridgeReturnAmount);
  return {
    token: getAddress(token),
    amount: bridgeReturnAmount,
    minAmountOut,
    provider: arbitrumPool,
    data: encodeAbiParameters([{ type: "uint32" }], [getLayerZeroEndpointId(8453)!]),
  };
}

export function inspectUiBridgeSignature(
  request: WalletRequest,
  session: FundedSession,
  state: Awaited<ReturnType<FundedSession["snapshot"]>>,
  simulations: readonly UiTransaction[]
) {
  const typed = walletTypedData(request, session.address);
  const now = BigInt(Math.floor(Date.now() / 1000));
  for (const tx of [...simulations].reverse()) {
    const call = decodeFunctionData({ abi: MultichainTransferRouter, data: tx.data });
    if (call.functionName !== "bridgeOut") continue;
    const [relay, account, source, params] = call.args;
    if (getAddress(account) !== session.address || source !== 8453n || params.amount !== bridgeReturnAmount) continue;
    assert.equal(tx.value, 0n);
    assert.deepEqual(params, bridgeReturnParams(state.usdc.address, params.minAmountOut));
    assert.equal(getAddress(relay.fee.feeToken), getAddress(state.usdc.address));
    inspectUiRelayFees(relay as unknown as RelayParamsPayload, state);
    for (let lag = 0n; lag <= 120n; lag++) {
      const expected = getBridgeOutTypedData({
        chainId: 42161,
        srcChainId: 8453,
        params,
        relayParams: { ...relay, deadline: now + 3600n - lag } as unknown as RelayParamsPayload,
      });
      if (hashTypedData(typed as never) === hashTypedData(minifiedUiTypedData(expected) as never))
        return { typed, rawDigest: hashTypedData(expected as never) };
    }
  }
  throw new Error("Bridge signature does not match a bounded UI simulation");
}

export async function inspectUiBridgeReturn(
  payload: UiRelayPayload,
  session: FundedSession,
  state: Awaited<ReturnType<FundedSession["snapshot"]>>,
  signedHash: Hex
) {
  assert.equal(getAddress(payload.to), getAddress(getContract(42161, "MultichainTransferRouter")));
  const call = decodeFunctionData({ abi: MultichainTransferRouter, data: payload.data });
  assert.equal(call.functionName, "bridgeOut");
  if (call.functionName !== "bridgeOut") throw new Error("Expected bridge withdrawal");
  const [relay, account, source, params] = call.args;
  assert.equal(getAddress(account), session.address);
  assert.equal(source, 8453n);
  assert.deepEqual(params, bridgeReturnParams(state.usdc.address, params.minAmountOut));
  assert.equal(getAddress(relay.fee.feeToken), getAddress(state.usdc.address));
  const extraFeeUsd = inspectUiRelayFees(relay as unknown as RelayParamsPayload, state);
  const td = getBridgeOutTypedData({
    chainId: 42161,
    srcChainId: 8453,
    params,
    relayParams: relay as unknown as RelayParamsPayload,
  });
  assert.equal(hashTypedData(td as never), signedHash, "Relay differs from the signed UI withdrawal");
  assert.equal(
    getAddress(await recoverTypedDataAddress({ ...minifiedUiTypedData(td), signature: relay.signature } as never)),
    session.address
  );
  const gasReserve = (BigInt(session.active.inventory!.bridgeGasAmount) * state.weth.prices.maxPrice) / 10n ** 18n;
  assert.ok(gasReserve > 0n && gasReserve <= USD);
  // Reserve the entire deposited bridge gas: the protocol charges it separately from the relay fee.
  return { extraFeeUsd: extraFeeUsd + gasReserve };
}
