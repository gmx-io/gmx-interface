import { useAppStore } from '@/zustand/useAppStore';

export const useMultipMarketBase64 = () =>
  useAppStore((state) => state.markets.marketBase64Map);
