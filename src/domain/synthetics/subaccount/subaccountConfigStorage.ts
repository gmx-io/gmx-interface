import { getLegacySubaccountConfigKey, getSubaccountConfigKey } from "config/localStorage";
import { readLocalStorageItem, removeLocalStorageItem, writeLocalStorageItem } from "lib/localStorage";
import type { SubaccountSerializedConfig } from "sdk/utils/subaccount";

export const SUBACCOUNT_CONFIG_VERSION = 2;

export function getIsLegacySubaccountConfig(config: SubaccountSerializedConfig): boolean {
  return config.version !== SUBACCOUNT_CONFIG_VERSION;
}

export function deserializeSubaccountConfig(stored: string): SubaccountSerializedConfig | undefined {
  if (!stored) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(stored);

    if (!parsed?.address || !parsed?.privateKey) {
      return undefined;
    }

    return parsed;
  } catch (e) {
    return undefined;
  }
}

function serializeSubaccountConfig(config: SubaccountSerializedConfig): string {
  return JSON.stringify(config);
}

export function readStoredSubaccountConfig(chainId: number, account: string): SubaccountSerializedConfig | undefined {
  return readLocalStorageItem(getSubaccountConfigKey(chainId, account), { deserializer: deserializeSubaccountConfig });
}

export function writeStoredSubaccountConfig(
  chainId: number,
  account: string,
  config: SubaccountSerializedConfig | undefined
): void {
  const key = getSubaccountConfigKey(chainId, account);

  if (!config) {
    removeLocalStorageItem(key);
    return;
  }

  writeLocalStorageItem(key, config, { serializer: serializeSubaccountConfig });
}

export function readStoredLegacySubaccountConfig(
  chainId: number,
  account: string
): SubaccountSerializedConfig | undefined {
  return readLocalStorageItem(getLegacySubaccountConfigKey(chainId, account), {
    deserializer: deserializeSubaccountConfig,
  });
}

export function keepLegacySubaccountConfig(chainId: number, account: string, config: SubaccountSerializedConfig): void {
  if (readStoredLegacySubaccountConfig(chainId, account)) {
    return;
  }

  writeLocalStorageItem(getLegacySubaccountConfigKey(chainId, account), config, {
    serializer: serializeSubaccountConfig,
  });
}
