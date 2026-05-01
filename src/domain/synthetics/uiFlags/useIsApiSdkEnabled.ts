import { getIsFlagEnabled } from "config/ab";

import { useUiFlagsRequest } from "./useUiFlagsRequest";

export const API_UI_FLAGS = {
  markets: "api-markets",
  positions: "api-positions",
  orders: "api-orders",
} as const;

export type ApiUiFlagName = (typeof API_UI_FLAGS)[keyof typeof API_UI_FLAGS];


export function useIsApiSdkEnabled(uiFlagName: ApiUiFlagName): boolean {
  const { uiFlags } = useUiFlagsRequest();

  return getIsFlagEnabled("apiSdk2") && uiFlags?.[uiFlagName] === true;
}
