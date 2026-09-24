// Thin re-export of the Helius accountSubscribe path. The legacy 5s
// `getMultipleAccountsInfo` polling implementation lived in this file
// until the migration cleanup; consult git history if a reference is
// needed.
export { useHeliusTokenBalances as useTokenBalances } from '@/hooks/helius/useHeliusTokenBalances';
