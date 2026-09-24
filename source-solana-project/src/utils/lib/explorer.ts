import { Address } from '@coral-xyz/anchor';

import { getGmw465Enabled } from '@/config/featureFlagEnable';

export const EXPLORER_URL = 'https://solscan.io/';
export const SOLSCAN_URL = 'https://solscan.io/';

export function getTransactionUrl(signature: string, cluster: string) {
  if (getGmw465Enabled()) {
    return `${EXPLORER_URL}tx/${signature}?cluster=${cluster}`;
  }
  return `${EXPLORER_URL}/tx/${signature}?cluster=${cluster}`;
}

export function getAddressUrl(address: Address) {
  if (getGmw465Enabled()) {
    return `${EXPLORER_URL}account/${address.toString()}`;
  }
  return `${EXPLORER_URL}/address/${address.toString()}`;
}
