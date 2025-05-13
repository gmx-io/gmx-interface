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
  optimisticActive: boolean;
  optimisticMaxAllowedCount: bigint;
  optimisticExpiresAt: bigint;
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
