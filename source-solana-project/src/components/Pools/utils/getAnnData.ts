import { GMX_SOLANA_API_ENDPOINT } from '@/config/url';
import { fetchWithTimeoutLog } from '@/utils/fetchWithTimeoutLog';

export type TokenAprHistoryPoint = {
  timeStamp: number;
  ydata: number;
};

export type TokenAprHistory = {
  tokenAddress: string;
  annualized: number;
  lineCharts: TokenAprHistoryPoint[] | null;
};

export type TokenAprHistoryResponse = TokenAprHistory[];

export const getAnnData = async (duration: string = '180') => {
  const url = `${GMX_SOLANA_API_ENDPOINT}/v2/cache/daily/annPerformance?duration=${duration}`;
  const res = await fetchWithTimeoutLog(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json = (await res.json()) as TokenAprHistoryResponse;
  return json;
};
