import { SliceCreator } from '@/zustand/types';
import { Operation, Mode } from '@/selectors/gmbox/types';

export interface Gmbox {
  selectedMarketTokenOrGLvTokenAddress?: string;
  selectedMarketTokenAddressForGlv?: string;

  toMarketTokenAddressForShift?: string;
  toGLvTokenAddressForShift?: string;

  firstTokenAddress?: string;
  secondTokenAddress?: string;

  firstTokenInputValue: string;
  secondTokenInputValue: string;
  marketOrGLvTokenInputValue: string;

  fromTokenInputValueForShift: string;
  toTokenInputValueForShift: string;

  stage: 'swap' | 'confirmation';
  focusedInput: 'longCollateral' | 'shortCollateral' | 'market';
  focusedInputForShift: 'toMarket' | 'selectedMarket';

  operation: Operation;
  mode: Mode;

  isMarketForGlvSelectedManually: boolean;

  setSelectedMarketTokenOrGLvTokenAddress: (address?: string) => void;
  setSelectedMarketTokenAddressForGlv: (address?: string) => void;

  setToMarketTokenAddressForShift: (address?: string) => void;
  setToGLvTokenAddressForShift: (address?: string) => void;

  setFirstTokenAddress: (address?: string) => void;
  setSecondTokenAddress: (address?: string) => void;

  setFirstTokenInputValue: (value: string) => void;
  setSecondTokenInputValue: (value: string) => void;
  setMarketOrGLvTokenInputValue: (value: string) => void;

  setFromTokenInputValueForShift: (value: string) => void;
  setToTokenInputValueForShift: (value: string) => void;

  resetInput: () => void;
  resetInputForShift: () => void;

  setStage: (stage: 'swap' | 'confirmation') => void;
  setFocusedInput: (
    input: 'longCollateral' | 'shortCollateral' | 'market'
  ) => void;
  setFocusedInputForShift: (input: 'toMarket' | 'selectedMarket') => void;

  setOperation: (operation: Operation) => void;
  setMode: (mode: Mode) => void;

  setIsMarketForGlvSelectedManually: (value: boolean) => void;
}

export interface GmboxSlice {
  gmbox: Gmbox;
}

export const createGmboxSlice: SliceCreator<GmboxSlice> = (set) => ({
  gmbox: {
    selectedMarketTokenOrGLvTokenAddress: undefined,
    selectedMarketTokenAddressForGlv: undefined,
    toMarketTokenAddressForShift: undefined,
    toGLvTokenAddressForShift: undefined,

    firstTokenAddress: undefined,
    secondTokenAddress: undefined,

    firstTokenInputValue: '',
    secondTokenInputValue: '',
    marketOrGLvTokenInputValue: '',

    fromTokenInputValueForShift: '',
    toTokenInputValueForShift: '',

    stage: 'swap',
    focusedInput: 'market',
    focusedInputForShift: 'toMarket',

    operation: Operation.Deposit,
    mode: Mode.Single,

    isMarketForGlvSelectedManually: false,

    setSelectedMarketTokenOrGLvTokenAddress: (address?: string) =>
      set(
        (state) => ({
          gmbox: {
            ...state.gmbox,
            selectedMarketTokenOrGLvTokenAddress: address,
          },
        }),
        false,
        'gmbox/setSelectedMarketTokenOrGLvTokenAddress'
      ),

    setSelectedMarketTokenAddressForGlv: (address?: string) =>
      set(
        (state) => ({
          gmbox: {
            ...state.gmbox,
            selectedMarketTokenAddressForGlv: address,
          },
        }),
        false,
        'gmbox/setSelectedMarketTokenAddressForGlv'
      ),

    setToMarketTokenAddressForShift: (address?: string) =>
      set(
        (state) => ({
          gmbox: {
            ...state.gmbox,
            toMarketTokenAddressForShift: address,
          },
        }),
        false,
        'gmbox/setToMarketTokenAddressForShift'
      ),

    setToGLvTokenAddressForShift: (address?: string) =>
      set(
        (state) => ({
          gmbox: {
            ...state.gmbox,
            toGLvTokenAddressForShift: address,
          },
        }),
        false,
        'gmbox/setToGLvTokenAddressForShift'
      ),

    setFirstTokenAddress: (address?: string) =>
      set(
        (state) => ({
          gmbox: {
            ...state.gmbox,
            firstTokenAddress: address,
          },
        }),
        false,
        'gmbox/setFirstTokenAddress'
      ),

    setSecondTokenAddress: (address?: string) =>
      set(
        (state) => ({
          gmbox: {
            ...state.gmbox,
            secondTokenAddress: address,
          },
        }),
        false,
        'gmbox/setSecondTokenAddress'
      ),

    setFirstTokenInputValue: (value: string) =>
      set(
        (state) => ({
          gmbox: {
            ...state.gmbox,
            firstTokenInputValue: value,
          },
        }),
        false,
        'gmbox/setFirstTokenInputValue'
      ),

    setSecondTokenInputValue: (value: string) =>
      set(
        (state) => ({
          gmbox: {
            ...state.gmbox,
            secondTokenInputValue: value,
          },
        }),
        false,
        'gmbox/setSecondTokenInputValue'
      ),

    setMarketOrGLvTokenInputValue: (value: string) =>
      set(
        (state) => ({
          gmbox: {
            ...state.gmbox,
            marketOrGLvTokenInputValue: value,
          },
        }),
        false,
        'gmbox/setMarketOrGLvTokenInputValue'
      ),

    setFromTokenInputValueForShift: (value: string) =>
      set(
        (state) => ({
          gmbox: {
            ...state.gmbox,
            fromTokenInputValueForShift: value,
          },
        }),
        false,
        'gmbox/setFromTokenInputValueForShift'
      ),

    setToTokenInputValueForShift: (value: string) =>
      set(
        (state) => ({
          gmbox: {
            ...state.gmbox,
            toTokenInputValueForShift: value,
          },
        }),
        false,
        'gmbox/setToTokenInputValueForShift'
      ),

    resetInput: () =>
      set(
        (state) => ({
          gmbox: {
            ...state.gmbox,
            firstTokenInputValue: '',
            secondTokenInputValue: '',
            marketOrGLvTokenInputValue: '',
          },
        }),
        false,
        'gmbox/resetInput'
      ),

    resetInputForShift: () =>
      set(
        (state) => ({
          gmbox: {
            ...state.gmbox,
            fromTokenInputValueForShift: '',
            toTokenInputValueForShift: '',
          },
        }),
        false,
        'gmbox/resetInputForShift'
      ),

    setStage: (stage: 'swap' | 'confirmation') =>
      set(
        (state) => ({
          gmbox: {
            ...state.gmbox,
            stage,
          },
        }),
        false,
        'gmbox/setStage'
      ),

    setFocusedInput: (input: 'longCollateral' | 'shortCollateral' | 'market') =>
      set(
        (state) => ({
          gmbox: {
            ...state.gmbox,
            focusedInput: input,
          },
        }),
        false,
        'gmbox/setFocusedInput'
      ),

    setFocusedInputForShift: (input: 'toMarket' | 'selectedMarket') =>
      set(
        (state) => ({
          gmbox: {
            ...state.gmbox,
            focusedInputForShift: input,
          },
        }),
        false,
        'gmbox/setFocusedInputForShift'
      ),

    setOperation: (operation: Operation) =>
      set(
        (state) => ({
          gmbox: {
            ...state.gmbox,
            operation,
          },
        }),
        false,
        'gmbox/setOperation'
      ),

    setMode: (mode: Mode) =>
      set(
        (state) => ({
          gmbox: {
            ...state.gmbox,
            mode,
          },
        }),
        false,
        'gmbox/setMode'
      ),

    setIsMarketForGlvSelectedManually: (value: boolean) =>
      set(
        (state) => ({
          gmbox: { ...state.gmbox, isMarketForGlvSelectedManually: value },
        }),
        false,
        'gmbox/setIsMarketForGlvSelectedManually'
      ),
  },
});
