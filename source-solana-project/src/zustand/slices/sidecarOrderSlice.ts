import { SliceCreator } from '@/zustand/types';
import { SidecarOrderEntry } from '@/selectors/sidecar/types';

interface SidecarOrder {
  sl: {
    entries: SidecarOrderEntry[];
    isUntouched: boolean;
  };
  tp: {
    entries: SidecarOrderEntry[];
    isUntouched: boolean;
  };
  limit: {
    entries: SidecarOrderEntry[];
    isUntouched: boolean;
  };

  setSlEntries: (entries: SidecarOrderEntry[]) => void;
  setTpEntries: (entries: SidecarOrderEntry[]) => void;
  setLimitEntries: (entries: SidecarOrderEntry[]) => void;
  setIsUntouched: (group: 'tp' | 'sl' | 'limit', value: boolean) => void;
  reset: () => void;
}

export interface SidecarOrderSlice {
  sidecarOrder: SidecarOrder;
}

export const createSidecarOrderSlice: SliceCreator<SidecarOrderSlice> = (
  set
) => ({
  sidecarOrder: {
    sl: {
      entries: [],
      isUntouched: true,
    },
    tp: {
      entries: [],
      isUntouched: true,
    },
    limit: {
      entries: [],
      isUntouched: true,
    },

    setSlEntries: (entries) =>
      set((state) => ({
        sidecarOrder: {
          ...state.sidecarOrder,
          sl: {
            ...state.sidecarOrder.sl,
            entries,
          },
        },
      })),

    setTpEntries: (entries) =>
      set((state) => ({
        sidecarOrder: {
          ...state.sidecarOrder,
          tp: {
            ...state.sidecarOrder.tp,
            entries,
          },
        },
      })),

    setLimitEntries: (entries) =>
      set((state) => ({
        sidecarOrder: {
          ...state.sidecarOrder,
          limit: {
            ...state.sidecarOrder.limit,
            entries,
          },
        },
      })),

    setIsUntouched: (group, value) =>
      set((state) => ({
        sidecarOrder: {
          ...state.sidecarOrder,
          [group]: {
            ...state.sidecarOrder[group],
            isUntouched: value,
          },
        },
      })),

    reset: () =>
      set((state) => ({
        sidecarOrder: {
          ...state.sidecarOrder,
          sl: { entries: [], isUntouched: true },
          tp: { entries: [], isUntouched: true },
          limit: { entries: [], isUntouched: true },
        },
      })),
  },
});
