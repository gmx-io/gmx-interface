import { GMX_SOLANA_API_ENDPOINT } from '@/config/url';
import { fetchWithTimeoutLog } from '@/utils/fetchWithTimeoutLog';

type GMGlVPriceItem = {
  timeStamp: number;
  ydata: string;
};

export const getGmGlvPrice = async (
  marketToken: string,
  duration: string = '30',
  type: string = 'GM'
) => {
  const url = `${GMX_SOLANA_API_ENDPOINT}/v2/cache/daily/${type === 'GM' ? 'gmPrices' : 'glvPrices'}?token=${marketToken}&duration=${duration}&type=${type}`;
  const res = await fetchWithTimeoutLog(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json = (await res.json()) as Array<GMGlVPriceItem>;
  return json;
};
