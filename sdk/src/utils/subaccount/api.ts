import type { ContractsChainId } from "configs/chains";
import { IHttp } from "utils/http/types";
import { validateSubaccountApprovalTypedData } from "utils/orderTransactions/validateTypedData";
import type { IAbstractSigner, TypedDataDomain, TypedDataTypes } from "utils/signer";

export type SubaccountStatusRequest = {
  account: string;
  subaccountAddress: string;
};

export type SubaccountStatusResponse = {
  active: boolean;
  maxAllowedCount: string;
  currentActionsCount: string;
  remainingActions: string;
  expiresAt: string;
  approvalNonce: string;
  multichainApprovalNonce: string;
  integrationId: string | null;
};

export type SubaccountApprovalPrepareRequest = {
  account: string;
  subaccountAddress: string;
  shouldAdd?: boolean;
  expiresAt: string;
  maxAllowedCount: string;
  signingNetwork?: string;
};

export type SubaccountApprovalPrepareResponse = {
  domain: { name: string; version: string; chainId: number; verifyingContract: string };
  types: Record<string, { name: string; type: string }[]>;
  message: Record<string, any>;
  primaryType: string;
  relayRouterAddress: string;
  nonce: string;
};

export async function fetchSubaccountStatus(
  ctx: { api: IHttp },
  request: SubaccountStatusRequest
): Promise<SubaccountStatusResponse> {
  return ctx.api.postJson<SubaccountStatusResponse>("/subaccounts/status", request);
}

export async function prepareSubaccountApproval(
  ctx: { api: IHttp },
  request: SubaccountApprovalPrepareRequest
): Promise<SubaccountApprovalPrepareResponse> {
  return ctx.api.postJson<SubaccountApprovalPrepareResponse>("/subaccounts/approval/prepare", request);
}

export async function signSubaccountApproval(
  prepared: SubaccountApprovalPrepareResponse,
  signer: IAbstractSigner,
  options?: { chainId?: ContractsChainId; expectedSubaccountAddress?: string }
): Promise<string> {
  const domain = prepared.domain as TypedDataDomain;
  const types = prepared.types as TypedDataTypes;
  const message = prepared.message;

  if (options?.chainId !== undefined && options?.expectedSubaccountAddress !== undefined) {
    validateSubaccountApprovalTypedData(
      domain,
      message,
      options.chainId,
      signer.address,
      options.expectedSubaccountAddress
    );
  }

  return signer.signTypedData(domain, types, message);
}
