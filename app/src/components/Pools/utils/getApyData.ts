import { GMX_SOLANA_API_ENDPOINT } from '@/config/url';
import { fetchWithTimeoutLog } from '@/utils/fetchWithTimeoutLog';

export type apyDataResp = Array<apyDataItem>;

export type apyDataItem = {
  annualized: number;
  lineCharts: Array<{
    timeStamp: number;
    yData: number;
  }>;
  tokenAddress: string;
};

export const getApyData = async (duration: string = '180') => {
  const url = `${GMX_SOLANA_API_ENDPOINT}/v2/cache/daily/feeApy?duration=${duration}`;
  const res = await fetchWithTimeoutLog(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const country = res?.headers?.get('x-user-country') || '';
  sessionStorage.setItem('country', country);
  const json = (await res.json()) as apyDataResp;
  return json;
};

export const isRestrictedArea = () => {
  return false;
};
