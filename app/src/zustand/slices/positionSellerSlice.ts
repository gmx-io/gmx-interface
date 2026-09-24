import { PositionSellerErrorMessage } from '@/components/PositionSeller/PositionSellerErrorMessage';
import {
  DEFAULT_ACCEPABLE_PRICE_IMPACT_BUFFER,
  DEFAULT_SLIPPAGE_AMOUNT,
} from '@/config/factors';
import { OrderOption } from '@/selectors/order/types';
import { helperToast } from '@/utils/lib/helperToast';
import { SliceCreator } from '@/zustand/types';
import { Address, translateAddress } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

export interface PositionSeller {
  address?: PublicKey;
  setAddress: (address: Address | undefined) => void;
  keepLeverage: boolean;
  setKeepLeverage: (keepLeverage: boolean) => void;
  orderOption: OrderOption;
  setOrderOption: (orderOption: OrderOption) => void;
  defaultTriggerAcceptablePriceImpactBps: number;
  setDefaultTriggerAcceptablePriceImpactBps: (
    defaultTriggerAcceptablePriceImpactBps: number
  ) => void;
  selectedTriggerAcceptablePriceImpactBps: number;
  setSelectedTriggerAcceptablePriceImpactBps: (
    selectedTriggerAcceptablePriceImpactBps: number
  ) => void;
  triggerPriceInputValue: string;
  setTriggerPriceInputValue: (triggerPriceInputValue: string) => void;
  closeUsdInputValue: string;
  setCloseUsdInputValue: (closeUsdInputValue: string) => void;
  defaultReceiveTokenAddress: string | undefined;
  setDefaultReceiveTokenAddress: (
    defaultReceiveTokenAddress: string | undefined
  ) => void;
  receiveTokenAddress: string | undefined;
  setReceiveTokenAddress: (receiveTokenAddress: string | undefined) => void;
  allowedSlippageBps: number;
  setAllowedSlippageBps: (allowedSlippageBps: number) => void;
  isSubmitting: boolean;
  setIsSubmitting: (isSubmitting: boolean) => void;
  isReceivedTokenChanged: boolean;
  setIsReceivedTokenChanged: (isReceivedTokenChanged: boolean) => void;
  resetPositionSeller: () => void;
}

export interface PositionSellerSlice {
  positionSeller: PositionSeller;
}

export const createPositionSellerSlice: SliceCreator<PositionSellerSlice> = (
  set
) => ({
  positionSeller: {
    address: undefined,
    setAddress: (address) => {
      if (!address) {
        return set((state) => ({
          positionSeller: {
            ...state.positionSeller,
            address: undefined,
          },
        }));
      }

      try {
        const translated = translateAddress(address);
        set((state) => ({
          positionSeller: {
            ...state.positionSeller,
            address: translated,
          },
        }));
      } catch (error) {
        helperToast.error(PositionSellerErrorMessage(error));
        // Error: keep the current address value, don't update state
      }
    },
    orderOption: OrderOption.Market,
    setOrderOption: (orderOption) =>
      set((state) => ({
        positionSeller: { ...state.positionSeller, orderOption },
      })),
    keepLeverage: true,
    setKeepLeverage: (keepLeverage) =>
      set((state) => ({
        positionSeller: { ...state.positionSeller, keepLeverage },
      })),
    defaultTriggerAcceptablePriceImpactBps: 0,
    setDefaultTriggerAcceptablePriceImpactBps: (
      defaultTriggerAcceptablePriceImpactBps
    ) =>
      set((state) => ({
        positionSeller: {
          ...state.positionSeller,
          defaultTriggerAcceptablePriceImpactBps,
        },
      })),
    selectedTriggerAcceptablePriceImpactBps: 0,
    setSelectedTriggerAcceptablePriceImpactBps: (
      selectedTriggerAcceptablePriceImpactBps
    ) =>
      set((state) => ({
        positionSeller: {
          ...state.positionSeller,
          selectedTriggerAcceptablePriceImpactBps,
        },
      })),
    triggerPriceInputValue: '',
    setTriggerPriceInputValue: (triggerPriceInputValue) =>
      set((state) => ({
        positionSeller: { ...state.positionSeller, triggerPriceInputValue },
      })),
    closeUsdInputValue: '',
    setCloseUsdInputValue: (closeUsdInputValue) =>
      set((state) => ({
        positionSeller: { ...state.positionSeller, closeUsdInputValue },
      })),
    defaultReceiveTokenAddress: undefined,
    setDefaultReceiveTokenAddress: (defaultReceiveTokenAddress) =>
      set((state) => ({
        positionSeller: { ...state.positionSeller, defaultReceiveTokenAddress },
      })),
    receiveTokenAddress: undefined,
    setReceiveTokenAddress: (receiveTokenAddress) =>
      set((state) => ({
        positionSeller: { ...state.positionSeller, receiveTokenAddress },
      })),
    allowedSlippageBps: 0,
    setAllowedSlippageBps: (allowedSlippageBps) =>
      set((state) => ({
        positionSeller: { ...state.positionSeller, allowedSlippageBps },
      })),
    isSubmitting: false,
    setIsSubmitting: (isSubmitting) =>
      set((state) => ({
        positionSeller: { ...state.positionSeller, isSubmitting },
      })),
    isReceivedTokenChanged: false,
    setIsReceivedTokenChanged: (isReceivedTokenChanged) =>
      set((state) => ({
        positionSeller: { ...state.positionSeller, isReceivedTokenChanged },
      })),
    resetPositionSeller: () =>
      set((state) => ({
        positionSeller: {
          ...state.positionSeller,
          address: undefined,
          orderOption: OrderOption.Market,
          keepLeverage: false,
          defaultTriggerAcceptablePriceImpactBps:
            DEFAULT_ACCEPABLE_PRICE_IMPACT_BUFFER,
          selectedTriggerAcceptablePriceImpactBps:
            DEFAULT_ACCEPABLE_PRICE_IMPACT_BUFFER,
          triggerPriceInputValue: '',
          closeUsdInputValue: '',
          receiveTokenAddress: undefined,
          allowedSlippageBps: DEFAULT_SLIPPAGE_AMOUNT,
          isSubmitting: false,
          isReceivedTokenChanged: false,
        },
      })),
  },
});
