import { DEFAULT_CU, DEFAULT_CU_PRICE } from '@/config/constants';
import { GMX_SOLANA_STORE_ADDRESS } from '@/config/program';
import { DEFAULT_SWR_REFRESH_INTERVAL_15S } from '@/config/ui';
import { useCurrentRpcUrl } from '@/hooks/utilsHooks/useCurrentRpcUrl';
import { selectComputeUnitMode } from '@/selectors/setting/baseSelectors';
import { useAppStore } from '@/zustand/useAppStore';
import useSWR, { SWRConfiguration } from 'swr';

interface PriorityFeeResponse {
  priorityFeeLevels: {
    min: number;
    low: number;
    medium: number;
    high: number;
    veryHigh: number;
  };
}

interface JsonRpcResponse<T> {
  jsonrpc: '2.0';
  id: string;
  result?: T;
  error?: {
    code: number;
    message: string;
  };
}

interface PriorityFeeResult {
  priorityFeeLevels: {
    min: number;
    low: number;
    medium: number;
    high: number;
    veryHigh: number;
  };
}

interface ComputeUnitsResult {
  computeUnits: number;
  computeUnitPrice: number;
  prices: {
    medium: number;
    high: number;
    veryHigh: number;
  };
}

function isPriorityFeeLevels(
  obj: unknown
): obj is PriorityFeeResponse['priorityFeeLevels'] {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'min' in obj &&
    typeof obj.min === 'number' &&
    'low' in obj &&
    typeof obj.low === 'number' &&
    'medium' in obj &&
    typeof obj.medium === 'number' &&
    'high' in obj &&
    typeof obj.high === 'number' &&
    'veryHigh' in obj &&
    typeof obj.veryHigh === 'number'
  );
}

function isPriorityFeeResponse(data: unknown): data is PriorityFeeResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'priorityFeeLevels' in data &&
    isPriorityFeeLevels(
      (data as { priorityFeeLevels: unknown }).priorityFeeLevels
    )
  );
}

const DEFAULT_PRIORITY_FEE_DATA: PriorityFeeResponse = {
  priorityFeeLevels: {
    min: DEFAULT_CU_PRICE,
    low: DEFAULT_CU_PRICE,
    medium: DEFAULT_CU_PRICE,
    high: DEFAULT_CU_PRICE,
    veryHigh: DEFAULT_CU_PRICE,
  },
};

// Default compute unit price
export function useComputeUnits(): ComputeUnitsResult {
  const currentRpcEndpoint = useCurrentRpcUrl();
  const setPriorityFees = useAppStore((s) => s.setPriorityFees);
  const priorityFees = useAppStore((s) => s.priorityFees);
  const fetcher = async (): Promise<PriorityFeeResponse> => {
    try {
      const response = await fetch(currentRpcEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'helius-priority-fee',
          method: 'getPriorityFeeEstimate',
          params: [
            {
              accountKeys: [
                GMX_SOLANA_STORE_ADDRESS.toBase58(), // Main program store
              ],
              options: {
                includeAllPriorityFeeLevels: true,
              },
            },
          ],
        }),
      });

      if (!response.ok) {
        console.warn(
          `Priority fee API error (${response.status}), using default values`
        );
        return DEFAULT_PRIORITY_FEE_DATA;
      }

      const result =
        (await response.json()) as JsonRpcResponse<PriorityFeeResult>;

      if (result.error) {
        console.warn('Priority fee API error:', result.error.message);
        return DEFAULT_PRIORITY_FEE_DATA;
      }

      if (!result.result) {
        console.warn('No result in priority fee response');
        return DEFAULT_PRIORITY_FEE_DATA;
      }

      const data = result.result;
      if (!isPriorityFeeResponse(data)) {
        console.warn(
          'Invalid response format from priority fee API, using default values'
        );
        return DEFAULT_PRIORITY_FEE_DATA;
      }

      return data;
    } catch (error) {
      console.warn(
        'Error fetching priority fees, using default values:',
        error
      );
      return DEFAULT_PRIORITY_FEE_DATA;
    }
  };

  useSWR<PriorityFeeResponse, Error>(
    ['priority-fee', currentRpcEndpoint],
    fetcher,
    {
    refreshInterval: DEFAULT_SWR_REFRESH_INTERVAL_15S,
    fallbackData: DEFAULT_PRIORITY_FEE_DATA,
    onSuccess(data) {
      setPriorityFees({
        medium: data.priorityFeeLevels.medium,
        high: data.priorityFeeLevels.high,
        veryHigh: data.priorityFeeLevels.veryHigh,
      });
    }
  } as SWRConfiguration<PriorityFeeResponse, Error>);

  const computeUnitMode = useAppStore(selectComputeUnitMode);

  const prices = {
    medium: Math.min(priorityFees.medium, 1000000),
    high: Math.min(priorityFees.high, 1000000),
    veryHigh: Math.min(priorityFees.veryHigh, 1000000),
  };

  return {
    computeUnits: DEFAULT_CU,
    computeUnitPrice: prices[computeUnitMode],
    prices,
  };
}
