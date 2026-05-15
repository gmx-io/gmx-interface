import type { SourceChainId } from "configs/chains";
import { IHttp } from "utils/http/types";
import type { BridgeOutParams } from "utils/multichain/api";
import type { IAbstractSigner, TypedDataDomain, TypedDataTypes } from "utils/signer";

export type CrossChainDepositPrepareRequest = {
  srcChainId: SourceChainId;
  account: string;
  tokenAddress: string;
  sourceStargatePoolAddress: string;
  /**
   * Destination-chain Stargate pool address (settlement-side OApp delivering `lzCompose`).
   * Required for compose-gas estimation when the API has no built-in registry for this token.
   */
  destinationStargatePoolAddress?: string;
  isNativeOnSource: boolean;
  amount: bigint;
  /**
   * Caller-provided LayerZero native fee hint. Optional — when omitted, the API quotes it
   * server-side. Currently the API does NOT yet quote it, so passing a hint is the safe path.
   */
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
      value: BigInt(raw.payload.value ?? "0"),
    },
    composeGas: BigInt(raw.composeGas ?? "0"),
    nativeFee: BigInt(raw.nativeFee ?? "0"),
    expiresAt: Number(raw.expiresAt ?? 0),
  };
}

function parseWithdrawPrepareResponse(raw: any): CrossChainWithdrawPrepareResponse {
  const gp = raw.payload.gasPaymentParams ?? {};
  return {
    payloadType: "typed-data",
    requestId: String(raw.requestId ?? ""),
    payload: {
      typedData: raw.payload.typedData,
      relayParams: raw.payload.relayParams,
      relayRouterAddress: raw.payload.relayRouterAddress,
      gasPaymentParams: {
        relayerFeeTokenAddress: gp.relayerFeeTokenAddress,
        relayerFeeAmount: BigInt(gp.relayerFeeAmount ?? "0"),
        gasPaymentTokenAddress: gp.gasPaymentTokenAddress,
        gasPaymentTokenAmount: BigInt(gp.gasPaymentTokenAmount ?? "0"),
      },
    },
    expiresAt: Number(raw.expiresAt ?? 0),
  };
}

export async function prepareCrossChainDeposit(
  ctx: { api: IHttp },
  request: CrossChainDepositPrepareRequest
): Promise<CrossChainDepositPrepareResponse> {
  return ctx.api.postJson<CrossChainDepositPrepareResponse>(
    "/multichain-transfer/deposit/cross-chain/prepare",
    request,
    { transform: parseDepositPrepareResponse }
  );
}

export async function prepareCrossChainWithdraw(
  ctx: { api: IHttp },
  request: CrossChainWithdrawPrepareRequest
): Promise<CrossChainWithdrawPrepareResponse> {
  return ctx.api.postJson<CrossChainWithdrawPrepareResponse>(
    "/multichain-transfer/withdraw/cross-chain/prepare",
    request,
    { transform: parseWithdrawPrepareResponse }
  );
}

export async function submitCrossChainWithdraw(
  ctx: { api: IHttp },
  request: CrossChainWithdrawSubmitRequest
): Promise<CrossChainWithdrawSubmitResponse> {
  return ctx.api.postJson<CrossChainWithdrawSubmitResponse>(
    "/multichain-transfer/withdraw/cross-chain/submit",
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
  request: CrossChainWithdrawPrepareRequest,
  signer: IAbstractSigner
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
  return ctx.api.postJson<CrossChainWithdrawStatusResponse>("/multichain-transfer/withdraw/cross-chain/status", {
    requestId,
  });
}
