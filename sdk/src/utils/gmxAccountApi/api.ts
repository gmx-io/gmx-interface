import type { SourceChainId } from "configs/chains";
import { IHttp } from "utils/http/types";
import type { BridgeOutParams } from "utils/multichain/api";
import type { IAbstractSigner, TypedDataDomain, TypedDataTypes } from "utils/signer";

export type CrossChainDepositPrepareRequest = {
  srcChainId: SourceChainId;
  account: string;
  amount: bigint;
  /** Pass either `tokenSymbol` ("USDC" | "USDT" | "ETH") or settlement-chain `tokenAddress`. */
  tokenSymbol?: string;
  tokenAddress?: string;
  /** Optional overrides; server resolves them from the registry by default. */
  sourceStargatePoolAddress?: string;
  destinationStargatePoolAddress?: string;
  isNativeOnSource?: boolean;
  /** Optional; when omitted, the API quotes Stargate `nativeFee` on the source chain. */
  nativeFee?: bigint;
  tokenKind?: "trade" | "platform";
  composeGas?: bigint;
  nativeDropAmount?: bigint;
  innerData?: string;
};

export type CrossChainDepositPrepareResponse = {
  payloadType: "transaction";
  payload: { to: string; data: string; value: bigint };
  composeGas: bigint;
  nativeFee: bigint;
  expiresAt: number;
};

export type CrossChainWithdrawPrepareRequest = {
  srcChainId: SourceChainId;
  account: string;
  bridgeOutParams: BridgeOutParams;
  /** Optional ERC-20 to pay relayer fee in. Defaults to chain's gas-payment token. */
  gasPaymentToken?: string;
};

export type GasPaymentParams = {
  relayerFeeTokenAddress: string;
  relayerFeeAmount: bigint;
  gasPaymentTokenAddress: string;
  gasPaymentTokenAmount: bigint;
};

export type CrossChainWithdrawPrepareResponse = {
  payloadType: "typed-data";
  /** Server-issued id; pass to submit() and use for polling status. */
  requestId: string;
  payload: {
    typedData: {
      domain: Record<string, unknown>;
      types: Record<string, { name: string; type: string }[]>;
      primaryType: "BridgeOut";
      message: Record<string, unknown>;
    };
    relayParams: Record<string, unknown>;
    relayRouterAddress: string;
    gasPaymentParams: GasPaymentParams;
  };
  expiresAt: number;
};

export type CrossChainWithdrawSubmitRequest = {
  srcChainId: SourceChainId;
  account: string;
  signature: string;
  bridgeOutParams: BridgeOutParams;
  relayParamsPayload: Record<string, unknown>;
  relayerFeeTokenAddress: string;
  relayerFeeAmount: bigint;
  requestId?: string;
};

export type CrossChainWithdrawSubmitResponse = {
  requestId: string;
  status: "relay_accepted" | "relay_failed";
  taskId?: string;
  error?: { code: string; message: string };
};

export type CrossChainWithdrawStatusResponse = {
  requestId: string;
  status: string;
  txHash?: string;
  taskId?: string;
  gelatoStatusCode?: number;
  error?: { code: string; message: string };
  createdAt: string;
  updatedAt: string;
};

function parseDepositPrepareResponse(raw: any): CrossChainDepositPrepareResponse {
  return {
    payloadType: "transaction",
    payload: {
      to: raw.payload.to,
      data: raw.payload.data,
      value: BigInt(raw.payload.value),
    },
    composeGas: BigInt(raw.composeGas),
    nativeFee: BigInt(raw.nativeFee),
    expiresAt: Number(raw.expiresAt),
  };
}

function parseWithdrawPrepareResponse(raw: any): CrossChainWithdrawPrepareResponse {
  const gp = raw.payload.gasPaymentParams;
  return {
    payloadType: "typed-data",
    requestId: raw.requestId,
    payload: {
      typedData: raw.payload.typedData,
      relayParams: raw.payload.relayParams,
      relayRouterAddress: raw.payload.relayRouterAddress,
      gasPaymentParams: {
        relayerFeeTokenAddress: gp.relayerFeeTokenAddress,
        relayerFeeAmount: BigInt(gp.relayerFeeAmount),
        gasPaymentTokenAddress: gp.gasPaymentTokenAddress,
        gasPaymentTokenAmount: BigInt(gp.gasPaymentTokenAmount),
      },
    },
    expiresAt: Number(raw.expiresAt),
  };
}

export async function prepareCrossChainDeposit(
  ctx: { api: IHttp },
  request: CrossChainDepositPrepareRequest
): Promise<CrossChainDepositPrepareResponse> {
  return ctx.api.postJson<CrossChainDepositPrepareResponse>(
    "/gmx-account/deposit/cross-chain/prepare",
    request,
    { transform: parseDepositPrepareResponse }
  );
}

export type ExecuteCrossChainDepositResult = {
  txnHash: string;
  composeGas: bigint;
  nativeFee: bigint;
};

export async function executeCrossChainDeposit(
  ctx: { api: IHttp },
  signer: IAbstractSigner,
  request: CrossChainDepositPrepareRequest
): Promise<ExecuteCrossChainDepositResult> {
  if (!signer.sendTransaction) {
    throw new Error("Signer does not support sendTransaction; use prepareCrossChainDeposit and submit via your wallet.");
  }
  const prepared = await prepareCrossChainDeposit(ctx, request);
  const sent = await signer.sendTransaction({
    to: prepared.payload.to,
    data: prepared.payload.data,
    value: prepared.payload.value,
  });
  return {
    txnHash: typeof sent === "string" ? sent : sent.hash,
    composeGas: prepared.composeGas,
    nativeFee: prepared.nativeFee,
  };
}

export async function prepareCrossChainWithdraw(
  ctx: { api: IHttp },
  request: CrossChainWithdrawPrepareRequest
): Promise<CrossChainWithdrawPrepareResponse> {
  return ctx.api.postJson<CrossChainWithdrawPrepareResponse>(
    "/gmx-account/withdraw/cross-chain/prepare",
    request,
    { transform: parseWithdrawPrepareResponse }
  );
}

export async function submitCrossChainWithdraw(
  ctx: { api: IHttp },
  request: CrossChainWithdrawSubmitRequest
): Promise<CrossChainWithdrawSubmitResponse> {
  return ctx.api.postJson<CrossChainWithdrawSubmitResponse>(
    "/gmx-account/withdraw/cross-chain/submit",
    request
  );
}

export async function signCrossChainWithdrawPrepared(
  prepared: CrossChainWithdrawPrepareResponse,
  signer: IAbstractSigner
): Promise<string> {
  const td = prepared.payload.typedData;
  return signer.signTypedData(
    td.domain as TypedDataDomain,
    td.types as TypedDataTypes,
    td.message as Record<string, unknown>
  );
}

export async function executeCrossChainWithdraw(
  ctx: { api: IHttp },
  signer: IAbstractSigner,
  request: CrossChainWithdrawPrepareRequest
): Promise<CrossChainWithdrawSubmitResponse> {
  const prepared = await prepareCrossChainWithdraw(ctx, request);
  const signature = await signCrossChainWithdrawPrepared(prepared, signer);
  return submitCrossChainWithdraw(ctx, {
    srcChainId: request.srcChainId,
    account: request.account,
    signature,
    bridgeOutParams: request.bridgeOutParams,
    relayParamsPayload: prepared.payload.relayParams,
    relayerFeeTokenAddress: prepared.payload.gasPaymentParams.relayerFeeTokenAddress,
    relayerFeeAmount: prepared.payload.gasPaymentParams.relayerFeeAmount,
    requestId: prepared.requestId,
  });
}

export async function getCrossChainWithdrawStatus(
  ctx: { api: IHttp },
  requestId: string
): Promise<CrossChainWithdrawStatusResponse> {
  return ctx.api.postJson<CrossChainWithdrawStatusResponse>("/gmx-account/withdraw/cross-chain/status", {
    requestId,
  });
}
