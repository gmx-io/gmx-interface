import { ValidationResult } from '@/utils/validation/types';
import { t } from '@lingui/macro';

export function getCommonError(p: { isConnected: boolean }): ValidationResult {
  const { isConnected } = p;

  if (!isConnected) {
    return [t`Connect Wallet`];
  }

  return [undefined];
}
