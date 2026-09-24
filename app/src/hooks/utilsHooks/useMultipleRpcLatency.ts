import useSWR, { SWRConfiguration } from 'swr';
import {
  selectCustomRpcUrl,
  selectRpcEndpointType,
} from '@/selectors/setting/baseSelectors';
import { useAppStore } from '@/zustand/useAppStore';
import { RpcEndpointType } from '@/zustand/slices/settingsSlice';
import { DEFAULT_CLUSTER } from '@/config/env';
import { getGmw357Enabled } from '@/config/featureFlagEnable';

const SOLANA_ENDPOINT = DEFAULT_CLUSTER;

export const getRpcEndpoint = (
  type: RpcEndpointType,
  customUrl: string
): string => {
  switch (type) {
    case 'helius':
      return SOLANA_ENDPOINT;
    case 'custom':
      return customUrl || SOLANA_ENDPOINT;
    default:
      return SOLANA_ENDPOINT;
  }
};

export interface LatencyResult {
  latency: number; // in milliseconds
  status: 'ok' | 'error';
  timestamp: number;
  endpoint: string;
  type: RpcEndpointType;
}

const DEFAULT_LATENCY_DATA: Record<RpcEndpointType, LatencyResult> = {
  helius: {
    latency: 0,
    status: 'ok',
    timestamp: Date.now(),
    endpoint: '',
    type: 'helius',
  },
  custom: {
    latency: 0,
    status: 'ok',
    timestamp: Date.now(),
    endpoint: '',
    type: 'custom',
  },
};

const fetcher = async (
  type: RpcEndpointType,
  endpoint: string
): Promise<LatencyResult> => {
  try {
    const startTime = performance.now();

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `helius-latency-check-${type}`,
        method: 'getLatestBlockhash',
        params: [],
      }),
    });

    const endTime = performance.now();
    const latency = endTime - startTime;

    if (!response.ok) {
      console.warn(`RPC latency check error for ${type} (${response.status})`);
      return {
        latency,
        status: 'error',
        timestamp: Date.now(),
        endpoint,
        type,
      };
    }

    return {
      latency,
      status: 'ok',
      timestamp: Date.now(),
      endpoint,
      type,
    };
  } catch (error) {
    console.warn(`Error checking RPC latency for ${type}:`, error);
    return {
      latency: 0,
      status: 'error',
      timestamp: Date.now(),
      endpoint,
      type,
    };
  }
};

export function useMultipleRpcLatency(
  isMenuOpen: boolean = false
): Record<RpcEndpointType, LatencyResult> {
  const customRpcUrl = useAppStore(selectCustomRpcUrl);
  const currentRpcType = useAppStore(selectRpcEndpointType);

  const heliusEndpoint = getRpcEndpoint('helius', '');
  const customEndpoint = getRpcEndpoint('custom', customRpcUrl);

  // For the currently selected RPC, always check latency
  // For other RPCs, only check when menu is open
  const shouldCheckHelius = currentRpcType === 'helius' || isMenuOpen;
  const shouldCheckCustom = currentRpcType === 'custom' || isMenuOpen;

  const { data: heliusData } = useSWR<LatencyResult, Error>(
    shouldCheckHelius ? 'rpc-latency-helius' : null, // Only fetch if we should check
    () => fetcher('helius', heliusEndpoint),
    {
      refreshInterval: 10000, // Check every 10 seconds
      fallbackData: DEFAULT_LATENCY_DATA.helius,
      revalidateOnFocus: false, // Don't revalidate on window focus
    } as SWRConfiguration<LatencyResult, Error>
  );

  const customLatencyKey =
    shouldCheckCustom && customRpcUrl
      ? getGmw357Enabled()
        ? ['rpc-latency-custom', customRpcUrl]
        : 'rpc-latency-custom'
      : null;

  const { data: customData } = useSWR<LatencyResult, Error>(
    customLatencyKey,
    () => {
      if (!customRpcUrl) {
        return Promise.resolve({
          ...DEFAULT_LATENCY_DATA.custom,
          status: 'ok',
          latency: 0,
          timestamp: Date.now(),
        });
      }
      return fetcher('custom', customEndpoint);
    },
    {
      refreshInterval: 10000, // Check every 10 seconds
      fallbackData: DEFAULT_LATENCY_DATA.custom,
      revalidateOnFocus: false, // Don't revalidate on window focus
    } as SWRConfiguration<LatencyResult, Error>
  );

  return {
    helius: heliusData ?? DEFAULT_LATENCY_DATA.helius,
    custom: customData ?? DEFAULT_LATENCY_DATA.custom,
  };
}

export function getRpcEndpointLabel(type: RpcEndpointType): string {
  switch (type) {
    case 'helius':
      return 'Helius RPC';
    case 'custom':
      return 'Custom RPC';
    default:
      return 'Helius RPC';
  }
}
