import {
  DEFAULT_ACCEPABLE_PRICE_IMPACT_BUFFER,
  DEFAULT_SLIPPAGE_AMOUNT,
} from '@/config/factors';
import { SliceCreator } from '@/zustand/types';

export type ComputeUnitMode = 'medium' | 'high' | 'veryHigh';
export type RpcEndpointType = 'helius' | 'custom';

const RPC_ENDPOINT_TYPE_KEY = 'rpcEndpointType';
const CUSTOM_RPC_URL_KEY = 'customRpcUrl';
const CUSTOM_RPC_TRUSTED_KEY = 'customRpcTrusted';
const IS_COLLAPSED_KEY = 'isCollapsed';
const IS_RIGHT_NAVIGATION_OPEN_KEY = 'isRightNavigationOpen';

function isTrustedCustomRpcUrl(url: string): boolean {
  return (
    Boolean(url.trim()) &&
    localStorage.getItem(CUSTOM_RPC_TRUSTED_KEY) === 'true'
  );
}

export function clearUntrustedCustomRpcUrl() {
  localStorage.removeItem(CUSTOM_RPC_URL_KEY);
  localStorage.removeItem(CUSTOM_RPC_TRUSTED_KEY);
  localStorage.setItem(RPC_ENDPOINT_TYPE_KEY, 'helius');
}

export function shouldAutoConnectWallet(
  rpcEndpointType: RpcEndpointType
): boolean {
  if (rpcEndpointType !== 'custom') {
    return true;
  }

  return isTrustedCustomRpcUrl(
    localStorage.getItem(CUSTOM_RPC_URL_KEY) || ''
  );
}

export const getCachedCustomRpcUrl = (): string => {
  const customRpcUrl = localStorage.getItem(CUSTOM_RPC_URL_KEY) || '';
  if (!customRpcUrl || isTrustedCustomRpcUrl(customRpcUrl)) {
    return customRpcUrl;
  }

  clearUntrustedCustomRpcUrl();
  return '';
};

export const getCachedRpcEndpointType = (): RpcEndpointType => {
  const cached = localStorage.getItem(RPC_ENDPOINT_TYPE_KEY);
  if (cached === 'custom') {
    return isTrustedCustomRpcUrl(localStorage.getItem(CUSTOM_RPC_URL_KEY) || '')
      ? 'custom'
      : 'helius';
  }
  return 'helius';
};

// Helper function to get a random Helius endpoint
export const getRandomHeliusEndpoint = (): RpcEndpointType => {
  return getCachedRpcEndpointType();
};

interface Settings {
  showDebugValues: boolean;
  savedAllowedSlippage: number;
  executionFeeBufferBps: number;
  savedAcceptablePriceImpactBuffer: number;
  shouldUseExecutionFeeBuffer: boolean;
  isPnlInLeverage: boolean;
  showPnlAfterFees: boolean;
  shouldShowPositionLines: boolean;
  shouldDisableValidationForTesting: boolean;
  skipPreflight: boolean;
  isLimitOrdersVisible: boolean;
  isTriggerWarningAccepted: boolean;
  isTermsAccepted: boolean;
  computeUnitMode: ComputeUnitMode;
  rpcEndpointType: RpcEndpointType;
  customRpcUrl: string;
  currentRpcUrl: string;
  isCollapsed: boolean;
  isOpenLanguage: boolean;
  tvChartSidebarOpen: boolean;
  isRightNavigationOpen: boolean;
  setShowDebugValues: (value: boolean) => void;
  setSavedAllowedSlippage: (value: number) => void;
  setExecutionFeeBufferBps: (value: number) => void;
  setSavedAcceptablePriceImpactBuffer: (value: number) => void;
  setShouldUseExecutionFeeBuffer: (value: boolean) => void;
  setIsPnlInLeverage: (value: boolean) => void;
  setShowPnlAfterFees: (value: boolean) => void;
  setShouldShowPositionLines: (value: boolean) => void;
  setShouldDisableValidationForTesting: (value: boolean) => void;
  setSkipPreflight: (value: boolean) => void;
  setIsLimitOrdersVisible: (value: boolean) => void;
  setIsTriggerWarningAccepted: (value: boolean) => void;
  setIsTermsAccepted: (value: boolean) => void;
  setComputeUnitMode: (mode: ComputeUnitMode) => void;
  setRpcEndpointType: (type: RpcEndpointType) => void;
  setCustomRpcUrl: (url: string) => void;
  setCurrentRpcUrl: (url: string) => void;
  setIsCollapsed: (value: boolean) => void;
  setIsOpenLanguage: (value: boolean) => void;
  setTvChartSidebarOpen: (value: boolean) => void;
  setIsRightNavigationOpen: (value: boolean) => void;
}

export interface SettingsSlice {
  settings: Settings;
}

export const createSettingsSlice: SliceCreator<SettingsSlice> = (set) => ({
  settings: {
    showDebugValues: false,
    savedAllowedSlippage: DEFAULT_SLIPPAGE_AMOUNT,
    executionFeeBufferBps: DEFAULT_SLIPPAGE_AMOUNT,
    savedAcceptablePriceImpactBuffer: DEFAULT_ACCEPABLE_PRICE_IMPACT_BUFFER,
    shouldUseExecutionFeeBuffer: false,
    isPnlInLeverage: true,
    showPnlAfterFees: false,
    shouldShowPositionLines: false,
    shouldDisableValidationForTesting: false,
    skipPreflight: false,
    isLimitOrdersVisible: true,
    isTriggerWarningAccepted: false,
    isTermsAccepted: false,
    computeUnitMode: 'high',
    rpcEndpointType: getRandomHeliusEndpoint(),
    customRpcUrl: getCachedCustomRpcUrl(),
    currentRpcUrl: '',
    isCollapsed:
      localStorage.getItem(IS_COLLAPSED_KEY) === 'true' ? true : false,
    isOpenLanguage: false,
    tvChartSidebarOpen: true,
    isRightNavigationOpen:
      localStorage.getItem(IS_RIGHT_NAVIGATION_OPEN_KEY) === 'true'
        ? true
        : false,
    setShowDebugValues: (value) =>
      set((state) => ({
        settings: {
          ...state.settings,
          showDebugValues: value,
        },
      })),

    setSavedAllowedSlippage: (value) =>
      set((state) => ({
        settings: {
          ...state.settings,
          savedAllowedSlippage: value,
        },
      })),

    setExecutionFeeBufferBps: (value) =>
      set((state) => ({
        settings: {
          ...state.settings,
          executionFeeBufferBps: value,
        },
      })),

    setSavedAcceptablePriceImpactBuffer: (value) =>
      set((state) => ({
        settings: {
          ...state.settings,
          savedAcceptablePriceImpactBuffer: value,
        },
      })),

    setShouldUseExecutionFeeBuffer: (value) =>
      set((state) => ({
        settings: {
          ...state.settings,
          shouldUseExecutionFeeBuffer: value,
        },
      })),

    setIsPnlInLeverage: (value) =>
      set((state) => ({
        settings: {
          ...state.settings,
          isPnlInLeverage: value,
        },
      })),

    setShowPnlAfterFees: (value) =>
      set((state) => ({
        settings: {
          ...state.settings,
          showPnlAfterFees: value,
        },
      })),

    setShouldShowPositionLines: (value) =>
      set((state) => ({
        settings: {
          ...state.settings,
          shouldShowPositionLines: value,
        },
      })),

    setShouldDisableValidationForTesting: (value) =>
      set((state) => ({
        settings: {
          ...state.settings,
          shouldDisableValidationForTesting: value,
        },
      })),

    setSkipPreflight: (value) =>
      set((state) => ({
        settings: {
          ...state.settings,
          skipPreflight: value,
        },
      })),

    setIsLimitOrdersVisible: (value) =>
      set((state) => ({
        settings: {
          ...state.settings,
          isLimitOrdersVisible: value,
        },
      })),

    setIsTriggerWarningAccepted: (value) =>
      set((state) => ({
        settings: {
          ...state.settings,
          isTriggerWarningAccepted: value,
        },
      })),

    setIsTermsAccepted: (value) =>
      set((state) => ({
        settings: { ...state.settings, isTermsAccepted: value },
      })),

    setComputeUnitMode: (mode) =>
      set((state) => ({
        settings: {
          ...state.settings,
          computeUnitMode: mode,
        },
      })),

    setRpcEndpointType: (type) => {
      const nextType =
        type === 'custom' &&
        !isTrustedCustomRpcUrl(localStorage.getItem(CUSTOM_RPC_URL_KEY) || '')
          ? 'helius'
          : type;
      localStorage.setItem(RPC_ENDPOINT_TYPE_KEY, nextType);
      return set((state) => ({
        settings: {
          ...state.settings,
          rpcEndpointType: nextType,
        },
      }));
    },

    setCustomRpcUrl: (url) => {
      const trimmedUrl = url.trim();
      if (trimmedUrl) {
        localStorage.setItem(CUSTOM_RPC_URL_KEY, trimmedUrl);
        localStorage.setItem(CUSTOM_RPC_TRUSTED_KEY, 'true');
      } else {
        localStorage.removeItem(CUSTOM_RPC_URL_KEY);
        localStorage.removeItem(CUSTOM_RPC_TRUSTED_KEY);
      }
      return set((state) => ({
        settings: {
          ...state.settings,
          customRpcUrl: trimmedUrl,
        },
      }));
    },

    setCurrentRpcUrl: (url) =>
      set((state) => ({
        settings: {
          ...state.settings,
          currentRpcUrl: url,
        },
      })),

    setIsCollapsed: (value) => {
      localStorage.setItem(IS_COLLAPSED_KEY, value.toString());
      return set((state) => ({
        settings: {
          ...state.settings,
          isCollapsed: value,
        },
      }));
    },
    setIsOpenLanguage: (value) => {
      return set((state) => ({
        settings: {
          ...state.settings,
          isOpenLanguage: value,
        },
      }));
    },
    setTvChartSidebarOpen: (value) =>
      set((state) => ({
        settings: {
          ...state.settings,
          tvChartSidebarOpen: value,
        },
      })),

    setIsRightNavigationOpen: (value) => {
      localStorage.setItem(IS_RIGHT_NAVIGATION_OPEN_KEY, value.toString());
      return set((state) => ({
        settings: {
          ...state.settings,
          isRightNavigationOpen: value,
        },
      }));
    },
  },
});
