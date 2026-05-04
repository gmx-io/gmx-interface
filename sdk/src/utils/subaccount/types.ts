import type { AnyChainId, ContractsChainId } from "configs/chains";
import type { IAbstractSigner } from "utils/signer";

export type SubaccountOnchainData = {
  active: boolean;
  maxAllowedCount: bigint;
  currentActionsCount: bigint;
  expiresAt: bigint;
  approvalNonce: bigint;
  multichainApprovalNonce: bigint;
  integrationId: string | undefined;
};

export type SubaccountSerializedConfig = {
  privateKey: string;
  address: string;
  isNew?: boolean;
};

export type SubaccountApproval = {
  subaccount: string;
  nonce: bigint;
  shouldAdd: boolean;
  expiresAt: bigint;
  maxAllowedCount: bigint;
  actionType: string;
  desChainId: bigint;
  deadline: bigint;
  integrationId: string;
};

export type SignedSubaccountApproval = SubaccountApproval & {
  signature: string;
  signedAt: number;
  signatureChainId: AnyChainId;
  subaccountRouterAddress: string;
};

export type Subaccount = {
  address: string;
  chainId: ContractsChainId;
  signerChainId: AnyChainId;
  signer: IAbstractSigner;
  signedApproval: SignedSubaccountApproval;
  onchainData: SubaccountOnchainData;
};

export type SubaccountValidations = {
  isExpired: boolean;
  isActionsExceeded: boolean;
  isNonceExpired: boolean;
  isApprovalInvalid: boolean;
  isValid: boolean;
};

export type SubaccountSession = {
  address: string;
  approval?: {
    message: Record<string, any>;
    signature: string;
  };
};
