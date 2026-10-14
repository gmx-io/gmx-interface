import assert from "node:assert/strict";
import {
  decodeFunctionData,
  encodeFunctionData,
  getAddress,
  hashTypedData,
  recoverTypedDataAddress,
  zeroAddress,
  maxUint256,
  type Hex,
} from "viem";
import ExchangeRouter from "../../../sdk/src/abis/ExchangeRouter";
import SubaccountGelatoRelayRouter from "../../../sdk/src/abis/SubaccountGelatoRelayRouter";
import { getContract } from "../../../sdk/src/configs/contracts";
import { getSubaccountApprovalTypedData } from "../../../sdk/src/utils/subaccount/getSubaccountApprovalTypedData";
import { getEmptySubaccountApproval } from "../../../sdk/src/utils/subaccount/getEmptySubaccountApproval";
import { hashSubaccountApproval } from "../../../sdk/src/utils/subaccount/hashSubaccountApproval";
import { getBatchTypedData } from "../../../sdk/src/utils/express/utils/batchOrderUtils";
import type { RelayParamsPayload } from "../../../sdk/src/utils/express/types";
import type { WalletRequest } from "../fixtures/injectedWallet";
import { USD } from "./economy";
import type { FundedSession } from "./session";
import { inspectUiOrder, type UiOrderIntent } from "./uiOrderGuard";
import type { UiRelayPayload } from "./uiRelay";

export function walletTypedData(request: WalletRequest, address: string) {
  assert.equal(request.method, "eth_signTypedData_v4");
  assert.equal(request.params?.length, 2);
  assert.equal(getAddress(String(request.params[0])), getAddress(address));
  const data = typeof request.params[1] === "string" ? JSON.parse(request.params[1]) : request.params[1];
  assert.ok(data && typeof data === "object" && data.domain && data.types && data.message);
  return data as {
    domain: Record<string, unknown>;
    types: Record<string, { name: string; type: string }[]>;
    primaryType: string;
    message: Record<string, string>;
  };
}

export function minifiedUiTypedData(typed: {
  domain: unknown;
  types: unknown;
  message: unknown;
  primaryType?: string;
}) {
  return {
    domain: typed.domain,
    primaryType: "Minified",
    types: { Minified: [{ name: "digest", type: "bytes32" }] },
    message: { digest: hashTypedData(typed as never) },
  };
}

export function inspectUiRelayFees(relay: RelayParamsPayload, state: Awaited<ReturnType<FundedSession["snapshot"]>>) {
  const now = BigInt(Math.floor(Date.now() / 1000));
  assert.equal(BigInt(relay.desChainId), 42161n);
  assert.ok(BigInt(relay.deadline) > now && BigInt(relay.deadline) <= now + 3600n);
  assert.deepEqual(relay.tokenPermits, [], "Unexpected token permit");
  for (const value of Object.values(relay.externalCalls)) assert.deepEqual(value, [], "Unexpected external call");
  const token = [state.usdc, state.weth].find((t) => getAddress(t.address) === getAddress(relay.fee.feeToken));
  assert.ok(token);
  const feeUsd = (BigInt(relay.fee.feeAmount) * token.prices.maxPrice) / 10n ** BigInt(token.decimals);
  assert.ok(feeUsd > 0n && feeUsd <= USD, "Relay fee exceeds the action limit");
  assert.ok(relay.fee.feeSwapPath.length <= 1);
  for (const market of relay.fee.feeSwapPath)
    assert.equal(getAddress(market), getAddress(state.market.marketTokenAddress));
  return feeUsd + USD / 50n;
}

export async function inspectUiOneClickRelay(
  session: FundedSession,
  payload: UiRelayPayload,
  intent: UiOrderIntent,
  state: Awaited<ReturnType<FundedSession["snapshot"]>>
) {
  const inventory = session.active.inventory!;
  assert.ok(inventory.subaccount && inventory.uiSubaccountApprovalHash);
  assert.equal(getAddress(payload.to), getAddress(getContract(42161, "SubaccountGelatoRelayRouter")));
  const call = decodeFunctionData({ abi: SubaccountGelatoRelayRouter, data: payload.data });
  assert.equal(call.functionName, "batch");
  if (call.functionName !== "batch") throw new Error("Expected 1CT batch");
  const [relay, approval, account, subaccount, batch] = call.args;
  assert.equal(getAddress(account), getAddress(session.address));
  assert.equal(getAddress(subaccount), getAddress(inventory.subaccount));
  if (approval.signature === "0x") {
    assert.deepEqual(approval, {
      ...getEmptySubaccountApproval(42161, subaccount),
      shouldAdd: false,
      deadline: maxUint256,
    });
    assert.ok(await session.subaccountActive(subaccount));
  } else {
    const td = getSubaccountApprovalTypedData({
      chainId: 42161,
      subaccountAddress: approval.subaccount,
      shouldAdd: approval.shouldAdd,
      expiresAt: approval.expiresAt,
      maxAllowedCount: approval.maxAllowedCount,
      nonce: approval.nonce,
    });
    assert.equal(hashTypedData(td as never), inventory.uiSubaccountApprovalHash);
    const { signature, ...unsigned } = approval;
    assert.equal(hashTypedData({ ...td, message: unsigned } as never), inventory.uiSubaccountApprovalHash);
    assert.equal(
      getAddress(await recoverTypedDataAddress({ ...minifiedUiTypedData(td), signature } as never)),
      session.address
    );
  }
  const extraFeeUsd = inspectUiRelayFees(relay as unknown as RelayParamsPayload, state);
  assert.equal(batch.updateOrderParamsList.length, 0);
  const td = getBatchTypedData({
    chainId: 42161,
    relayRouterAddress: payload.to,
    account,
    relayParams: relay as unknown as RelayParamsPayload,
    subaccountApprovalHash: hashSubaccountApproval(approval),
    batchParams: {
      createOrderParams: batch.createOrderParamsList.map((orderPayload) => ({ orderPayload })),
      updateOrderParams: [],
      cancelOrderParams: batch.cancelOrderKeys.map((orderKey) => ({ orderKey })),
    } as never,
  });
  assert.equal(
    getAddress(
      await recoverTypedDataAddress({
        ...minifiedUiTypedData({ ...td, primaryType: "Batch" }),
        signature: relay.signature,
      } as never)
    ),
    getAddress(subaccount)
  );
  // Normalize only for the common guard. The original UI relay payload is what gets sent.
  const calls: Hex[] = [];
  let value = 0n;
  for (const order of batch.createOrderParamsList) {
    assert.ok(order.addresses.receiver === zeroAddress || getAddress(order.addresses.receiver) === session.address);
    value += order.numbers.executionFee;
    calls.push(
      encodeFunctionData({
        abi: ExchangeRouter,
        functionName: "sendTokens",
        args: [
          order.addresses.initialCollateralToken,
          getContract(42161, "OrderVault"),
          order.numbers.initialCollateralDeltaAmount,
        ],
      })
    );
    calls.push(
      encodeFunctionData({
        abi: ExchangeRouter,
        functionName: "createOrder",
        args: [{ ...order, addresses: { ...order.addresses, receiver: session.address } }],
      })
    );
  }
  if (value)
    calls.unshift(
      encodeFunctionData({
        abi: ExchangeRouter,
        functionName: "sendWnt",
        args: [getContract(42161, "OrderVault"), value],
      })
    );
  for (const key of batch.cancelOrderKeys)
    calls.push(encodeFunctionData({ abi: ExchangeRouter, functionName: "cancelOrder", args: [key] }));
  const checked = inspectUiOrder(
    {
      to: getContract(42161, "ExchangeRouter"),
      data: encodeFunctionData({ abi: ExchangeRouter, functionName: "multicall", args: [calls] }),
      value,
    },
    intent,
    {
      address: session.address,
      marketAddress: state.market.marketTokenAddress,
      usdc: state.usdc,
      weth: state.weth,
      ownedOrderKeys: session.active.ownedOrderKeys,
      express: true,
    }
  );
  return {
    extraFeeUsd,
    uiOrder: {
      createdCount: checked.createdCount,
      marketAddress: state.market.marketTokenAddress,
      sizeDeltaUsd: checked.sizeDeltaUsd.toString(),
      ...(intent.kind === "cancel" ? { cancelledKeys: intent.keys } : {}),
    },
  };
}
