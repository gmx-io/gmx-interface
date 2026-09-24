import { DEFAULT_CLUSTER } from '@/config/env';
import { selectCurrentRpcUrl } from '@/selectors/setting/baseSelectors';
import { useAppStore } from '@/zustand/useAppStore';

/**
 * Hook to get the current RPC URL from the global state
 * Falls back to DEFAULT_ENDPOINT if not set
 */
export function useCurrentRpcUrl(): string {
  const currentRpcUrl = useAppStore(selectCurrentRpcUrl);
  return currentRpcUrl || DEFAULT_CLUSTER;
}
