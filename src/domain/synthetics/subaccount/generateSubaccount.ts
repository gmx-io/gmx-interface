import { AES } from "crypto-js";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import type { SubaccountSerializedConfig } from "sdk/utils/subaccount";

import { SUBACCOUNT_CONFIG_VERSION } from "./subaccountConfigStorage";

export function generateSubaccount(account: string): SubaccountSerializedConfig {
  const privateKey = generatePrivateKey();

  return {
    version: SUBACCOUNT_CONFIG_VERSION,
    address: privateKeyToAccount(privateKey).address,
    privateKey: AES.encrypt(privateKey, account).toString(),
    isNew: true,
  };
}
