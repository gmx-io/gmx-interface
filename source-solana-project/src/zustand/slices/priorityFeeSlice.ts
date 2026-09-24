import { SliceCreator } from '@/zustand/types';

const INITIAL_PRIORITY_FEE: PriorityFee = {
  medium: 0,
  high: 0,
  veryHigh: 0,
};

export interface PriorityFee {
  medium: number;
  high: number;
  veryHigh: number;
}
export interface PriorityFeeSlice {
  priorityFees: PriorityFee;
  setPriorityFees: (data: PriorityFee) => void;
}

export const createPriorityFeeSlice: SliceCreator<PriorityFeeSlice> = (
  set
) => ({
  priorityFees: INITIAL_PRIORITY_FEE,
  setPriorityFees: (data) =>
    set((state) => ({
      priorityFees: {
        ...state.priorityFees,
        ...data,
      },
    })),
});
