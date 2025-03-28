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
