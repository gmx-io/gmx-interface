import { getGmw235Enabled, getGmw422Enabled } from '@/config/featureFlagEnable';
import {
  isBareTradePath,
  resolveSlugFromPathname,
  SOL_DEFAULT_MINT,
} from '@/utils/market/marketSlug';
import { getSelectedIndexToken } from '@/utils/market/selectedIndexToken';
import { SliceCreator } from '@/zustand/types';

function getInitialIndexToken(): string {
  if (!getGmw235Enabled()) {
    if (getGmw422Enabled()) {
      return getSelectedIndexToken() || SOL_DEFAULT_MINT;
    }
    return (
      sessionStorage.getItem('selectedIndexToken') ||
      'So1Zu7vPQQxrguzUehKAyVLpjcc769zxgBuDAsxTUMH'
    );
  }

  if (typeof window === 'undefined') {
    return SOL_DEFAULT_MINT;
  }

  const fromUrl = resolveSlugFromPathname(window.location.pathname);
  if (fromUrl) {
    return fromUrl;
  }

  if (isBareTradePath(window.location.pathname)) {
    return SOL_DEFAULT_MINT;
  }

  if (getGmw422Enabled()) {
    return getSelectedIndexToken() || SOL_DEFAULT_MINT;
  }
  return sessionStorage.getItem('selectedIndexToken') || SOL_DEFAULT_MINT;
}

interface indexTokenDataProps {
  price?: string;
  indexToken?: string;
  percentChange24h?: string;
  maxLeverage?: string;
}

interface IndexTokens {
  indexToken: string;
  indexTokenData: indexTokenDataProps;
  sortedIndexTokens: any[];
  hasIndexTokenChange: boolean;
  setIndexToken: (indexToken: string) => void;
  setIndexTokenData: (indexTokenData: any) => void;
  setSortedIndexTokens: (sortedIndexTokens: any[]) => void;
  setHasIndexTokenChange: (hasIndexTokenChange: boolean) => void;
}

export interface IndexTokenSlice {
  indexTokens: IndexTokens;
}

export const createIndexTokenSlice: SliceCreator<IndexTokenSlice> = (set, get) => ({
  indexTokens: {
    indexToken: getInitialIndexToken(),
    indexTokenData: {},
    sortedIndexTokens: [],
    hasIndexTokenChange: false,
    setIndexToken: (indexToken: string) => {
      set((state) => ({
        indexTokens: {
          ...state.indexTokens,
          indexToken,
        },
      }));
    },
    setIndexTokenData: (indexTokenData: any) => {
      set((state) => ({
        indexTokens: {
          ...state.indexTokens,
          indexTokenData,
        },
      }));
    },
    setHasIndexTokenChange: (hasIndexTokenChange: boolean) => {
      set((state) => ({
        indexTokens: {
          ...state.indexTokens,
          hasIndexTokenChange,
        },
      }));
    },
    setSortedIndexTokens: (sortedIndexTokens: any[]) => {
      set((state) => ({
        indexTokens: {
          ...state.indexTokens,
          sortedIndexTokens,
        },
      }));
    },
  },
});
