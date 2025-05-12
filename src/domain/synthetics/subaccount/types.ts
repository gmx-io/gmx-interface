import type { Wallet } from "ethers";

import type { SubaccountOnchainData } from "./useSubaccountFromContractsRequest";
import type { SignedSubbacountApproval } from "./utils";

export type SubaccountSerializedConfig = {
  privateKey: string;
  address: string;
};

export type SubaccountParams = {
  topUp: bigint | null;
  maxAutoTopUpAmount: bigint | null;
  wntForAutoTopUps: bigint | null;
  maxAllowedActions: bigint | null;
};

export type Subaccount = {
  address: string;
  signedApproval: SignedSubbacountApproval | undefined;
  onchainData: SubaccountOnchainData;
  signer: Wallet;
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
