import { getGmw307Enabled } from '@/config/featureFlagEnable';

export const TABLE_EMPTY_STATE_CLASS = {
  tradePrimary: 'table-empty-state table-empty-state--trade-primary',
  tradeClaims: 'table-empty-state table-empty-state--trade-claims',
  stakePositions: 'table-empty-state table-empty-state--stake-positions',
  stakeHistory: 'table-empty-state table-empty-state--stake-history',
  gtHistory: 'table-empty-state table-empty-state--gt-history',
} as const;

export function getTableEmptyStateClass(
  key: keyof typeof TABLE_EMPTY_STATE_CLASS
): string {
  return getGmw307Enabled()
    ? TABLE_EMPTY_STATE_CLASS[key]
    : 'relative min-h-[42rem]';
}
