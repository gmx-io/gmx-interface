import { BN_ZERO } from '@/config/constants';
import { DEFAULT_ACCEPABLE_PRICE_IMPACT_BUFFER } from '@/config/factors';
import { SliceCreator } from '@/zustand/types';

interface OrderEditor {
  cancellingOrdersAddresses: string[];
  editingOrderAddress?: string;
  sizeInputValue: string;
  triggerPriceInputValue: string;
  triggerRatioInputValue: string;
  initialAcceptablePriceImpactBps: number;
  acceptablePriceImpactBps: number;

  setCancellingOrdersAddresses: (addresses: string[]) => void;
  setEditingOrderAddress: (address?: string) => void;
  setSizeInputValue: (value: string) => void;
  setTriggerPriceInputValue: (value: string) => void;
  setTriggerRatioInputValue: (value: string) => void;
  setAcceptablePriceImpactBps: (value: number) => void;
  resetState: () => void;
}

export interface OrderEditorSlice {
  orderEditor: OrderEditor;
}

export const createOrderEditorSlice: SliceCreator<OrderEditorSlice> = (
  set,
  get
) => ({
  orderEditor: {
    cancellingOrdersAddresses: [],
    editingOrderAddress: undefined,
    sizeInputValue: '',
    triggerPriceInputValue: '',
    triggerRatioInputValue: '',
    initialAcceptablePriceImpactBps: DEFAULT_ACCEPABLE_PRICE_IMPACT_BUFFER,
    acceptablePriceImpactBps: DEFAULT_ACCEPABLE_PRICE_IMPACT_BUFFER,

    setCancellingOrdersAddresses: (addresses: string[]) =>
      set((state) => ({
        orderEditor: {
          ...state.orderEditor,
          cancellingOrdersAddresses: addresses,
        },
      })),

    setEditingOrderAddress: (address?: string) =>
      set((state) => ({
        orderEditor: {
          ...state.orderEditor,
          editingOrderAddress: address,
        },
      })),

    setSizeInputValue: (value: string) =>
      set((state) => ({
        orderEditor: {
          ...state.orderEditor,
          sizeInputValue: value,
        },
      })),

    setTriggerPriceInputValue: (value: string) =>
      set((state) => ({
        orderEditor: {
          ...state.orderEditor,
          triggerPriceInputValue: value,
        },
      })),

    setTriggerRatioInputValue: (value: string) =>
      set((state) => ({
        orderEditor: {
          ...state.orderEditor,
          triggerRatioInputValue: value,
        },
      })),

    setAcceptablePriceImpactBps: (value: number) =>
      set((state) => ({
        orderEditor: {
          ...state.orderEditor,
          acceptablePriceImpactBps: value,
        },
      })),

    resetState: () => {
      const { orderEditor } = get();
      if (!orderEditor.editingOrderAddress) {
        setTimeout(() => {
          set((state) => ({
            orderEditor: {
              ...state.orderEditor,
              sizeInputValue: '',
              triggerPriceInputValue: '',
              triggerRatioInputValue: '',
              acceptablePrice: BN_ZERO,
            },
          }));
        }, 100);
      }
    },
  },
});
