import { Wallet } from "ethers";

import { SubaccountOnchainData } from "./useSubaccountOnchainData";

export type SubaccountSerializedConfig = {
  privateKey: string;
  address: string;
};

export type Subaccount = {
  address: string;
  signer: Wallet;
  signedApproval: SignedSubbacountApproval;
  onchainData: SubaccountOnchainData;
};

export type SubaccountApproval = {
  subaccount: string;
  nonce: bigint;
  shouldAdd: boolean;
  expiresAt: bigint;
  maxAllowedCount: bigint;
  actionType: string;
  deadline: bigint;
};

export type SignedSubbacountApproval = SubaccountApproval & {
  signature: string;
  signedAt: number;
};

export type SubaccountValidations = {
  isExpired: boolean;
  isActionsExceeded: boolean;
  isNonceExpired: boolean;
  isValid: boolean;
};
