import { IS_DEVELOPMENT } from '@/config/env';
import { EXPLORER_URL } from './explorer';

export function getTransactionUrl(signature: string) {
  if (IS_DEVELOPMENT) {
    return `${EXPLORER_URL}tx/${signature}?cluster=devnet`;
  }
  return `${EXPLORER_URL}tx/${signature}`;
}
