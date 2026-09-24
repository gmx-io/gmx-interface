import { selectRpcEndpointType } from '@/selectors/setting/baseSelectors';
import { useAppStore } from '@/zustand/useAppStore';
import {
  LatencyResult,
  getRpcEndpointLabel as getEndpointLabel,
  useMultipleRpcLatency,
} from './useMultipleRpcLatency';

// Re-export the getRpcEndpointLabel function
export const getRpcEndpointLabel = getEndpointLabel;

// Keep this hook for backward compatibility
export function useRpcLatency(): LatencyResult {
  const rpcEndpointType = useAppStore(selectRpcEndpointType);
  const allRpcLatency = useMultipleRpcLatency();

  // Return latency information for the currently selected RPC endpoint
  return allRpcLatency[rpcEndpointType];
}
