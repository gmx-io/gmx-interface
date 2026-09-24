import { SliceCreator } from '@/zustand/types';
import { BN } from '@coral-xyz/anchor';

interface Pools {
  isDetail: boolean;
  glvMapBase64: Map<string, any>;
  gmListData: any[];
  glvListData: any[];
  glvPriceMap: Map<string, any>;
  linkInfo: {
    poolType: string;
    poolAddress: string;
    poolInfo: any;
  };
  setLinkInfo: (linkInfo: {
    poolType: string;
    poolAddress: string;
    poolInfo: any;
  }) => void;
  setGlvPriceMap: (glvPriceMap: Map<string, any>) => void;
  setGmListData: (gmListData: any[]) => void;
  setGlvListData: (glvList: any[]) => void;
  setIsDetail: (isDetail: boolean) => void;
  setGlvMapBase64: (glvMapBase64: any) => void;
}

export interface PoolsSlice {
  pools: Pools;
}

export const creatPoolsSlice: SliceCreator<PoolsSlice> = (set, get) => ({
  pools: {
    glvListData: JSON.parse(localStorage.getItem('glvListData') || '[]'),
    isDetail: false,
    glvMapBase64: new Map(),
    glvPriceMap: new Map(),
    gmListData: JSON.parse(localStorage.getItem('gmListData') || '[]'),
    linkInfo: (() => {
      const raw = sessionStorage.getItem('linkInfo');
      const reviveNumbersToBN = (val: any): any => {
        if (val === null || val === undefined) return val;
        if (typeof val === 'string' && /^[0-9]+$/.test(val)) {
          try {
            return new BN(val);
          } catch {
            return val;
          }
        }
        if (Array.isArray(val)) return val.map(reviveNumbersToBN);
        if (typeof val === 'object') {
          const out: any = Array.isArray(val) ? [] : {};
          for (const k of Object.keys(val)) {
            out[k] = reviveNumbersToBN(val[k]);
          }
          return out;
        }
        return val;
      };
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            return {
              ...parsed,
              poolInfo: reviveNumbersToBN(parsed.poolInfo),
            };
          }
          return parsed;
        } catch {
          return {
            poolType: '',
            poolAddress: '',
            poolInfo: {},
          };
        }
      }
      return {
        poolType: '',
        poolAddress: '',
        poolInfo: {},
      };
    })(),
    setLinkInfo: (linkInfo: {
      poolType: string;
      poolAddress: string;
      poolInfo: any;
    }) => {
      set((state) => ({
        pools: {
          ...state.pools,
          linkInfo,
        },
      }));
    },
    setGlvPriceMap: (glvPriceMap: Map<string, any>) => {
      set((state) => {
        const prev = state.pools.glvPriceMap;
        let equal = prev.size === glvPriceMap.size;
        if (equal) {
          for (const [k, v] of glvPriceMap) {
            const pv = prev.get(k);
            if ((pv === undefined && v !== undefined) || String(pv) !== String(v)) {
              equal = false;
              break;
            }
          }
        }
        if (equal) {
          return { pools: state.pools };
        }
        return {
          pools: {
            ...state.pools,
            glvPriceMap,
          },
        };
      });
    },
    setGlvListData: (glvListData) => {
      set((state) => ({
        pools: {
          ...state.pools,
          glvListData,
        },
      }));
    },
    setGmListData: (gmListData) => {
      set((state) => ({
        pools: {
          ...state.pools,
          gmListData,
        },
      }));
    },
    setGlvMapBase64: (glvMapBase64) => {
      set((state) => ({
        pools: {
          ...state.pools,
          glvMapBase64,
        },
      }));
    },
    setIsDetail: (isDetail) => {
      set((state) => ({
        pools: {
          ...state.pools,
          isDetail,
        },
      }));
    },
  },
});
