import { OrderOption } from '@/selectors/order/types';
import { RootState } from '@/zustand/useAppStore';
import { Address } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

export const selectPositionSeller = (state: RootState) => state.positionSeller;
export const selectPositionSellerAddress = (
  state: RootState
): PublicKey | undefined => state.positionSeller.address;
export const selectSetPositionSellerAddress = (
  state: RootState
): ((address: Address | undefined) => void) => state.positionSeller.setAddress;
export const selectHasPositionSellerAddress = (state: RootState): boolean =>
  !!state.positionSeller.address;
export const selectPositionSellerOrderOption = (
  state: RootState
): OrderOption => state.positionSeller.orderOption;
export const selectSetPositionSellerOrderOption = (
  state: RootState
): ((orderOption: OrderOption) => void) => state.positionSeller.setOrderOption;
export const selectPositionSellerKeepLeverageRaw = (
  state: RootState
): boolean => state.positionSeller.keepLeverage;
export const selectSetPositionSellerKeepLeverage = (
  state: RootState
): ((keepLeverage: boolean) => void) => state.positionSeller.setKeepLeverage;
export const selectPositionSellerDefaultTriggerAcceptablePriceImpactBps = (
  state: RootState
): number => state.positionSeller.defaultTriggerAcceptablePriceImpactBps;
export const selectSetPositionSellerDefaultTriggerAcceptablePriceImpactBps = (
  state: RootState
): ((defaultTriggerAcceptablePriceImpactBps: number) => void) =>
  state.positionSeller.setDefaultTriggerAcceptablePriceImpactBps;
export const selectPositionSellerSelectedTriggerAcceptablePriceImpactBps = (
  state: RootState
): number => state.positionSeller.selectedTriggerAcceptablePriceImpactBps;
export const selectSetPositionSellerSelectedTriggerAcceptablePriceImpactBps = (
  state: RootState
): ((selectedTriggerAcceptablePriceImpactBps: number) => void) =>
  state.positionSeller.setSelectedTriggerAcceptablePriceImpactBps;
export const selectPositionSellerTriggerPriceInputValue = (
  state: RootState
): string => state.positionSeller.triggerPriceInputValue;
export const selectSetPositionSellerTriggerPriceInputValue = (
  state: RootState
): ((triggerPriceInputValue: string) => void) =>
  state.positionSeller.setTriggerPriceInputValue;
export const selectPositionSellerCloseUsdInputValue = (
  state: RootState
): string => state.positionSeller.closeUsdInputValue;
export const selectSetPositionSellerCloseUsdInputValue = (
  state: RootState
): ((closeUsdInputValue: string) => void) =>
  state.positionSeller.setCloseUsdInputValue;
export const selectPositionSellerReceiveTokenAddress = (
  state: RootState
): string | undefined => state.positionSeller.receiveTokenAddress;
export const selectPositionSellerDefaultReceiveTokenAddress = (
  state: RootState
): string | undefined => state.positionSeller.defaultReceiveTokenAddress;
export const selectSetPositionSellerDefaultReceiveTokenAddress = (
  state: RootState
): ((defaultReceiveTokenAddress: string | undefined) => void) =>
  state.positionSeller.setDefaultReceiveTokenAddress;
export const selectSetPositionSellerReceiveTokenAddress = (
  state: RootState
): ((receiveTokenAddress: string | undefined) => void) =>
  state.positionSeller.setReceiveTokenAddress;
export const selectPositionSellerAllowedSlippageBps = (
  state: RootState
): number => state.positionSeller.allowedSlippageBps;
export const selectSetPositionSellerAllowedSlippageBps = (
  state: RootState
): ((allowedSlippageBps: number) => void) =>
  state.positionSeller.setAllowedSlippageBps;
export const selectPositionSellerIsSubmitting = (state: RootState): boolean =>
  state.positionSeller.isSubmitting;
export const selectSetPositionSellerIsSubmitting = (
  state: RootState
): ((isSubmitting: boolean) => void) => state.positionSeller.setIsSubmitting;
export const selectPositionSellerIsReceivedTokenChanged = (
  state: RootState
): boolean => state.positionSeller.isReceivedTokenChanged;
export const selectSetPositionSellerIsReceivedTokenChanged = (
  state: RootState
): ((isReceivedTokenChanged: boolean) => void) =>
  state.positionSeller.setIsReceivedTokenChanged;
export const selectPositionSellerResetPositionSeller = (
  state: RootState
): (() => void) => state.positionSeller.resetPositionSeller;
