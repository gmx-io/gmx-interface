import { uiFeeFactorKey } from "sdk/configs/dataStore";
import { MARKETS } from "sdk/configs/markets";
import { hashString } from "sdk/utils/hash";
import { PRECISION } from "sdk/utils/numbers";

import { chainId, ParityContext, readDataStoreUint, Scenario } from "./context";

const MAX_UI_FEE_FACTOR_KEY = hashString("MAX_UI_FEE_FACTOR");

const UI_FEE_FACTOR = PRECISION / 1000n;

export const UI_FEE_RECEIVER = "0x1111111111111111111111111111111111111111";

const UI_FEE_FACTOR_KEY = uiFeeFactorKey(UI_FEE_RECEIVER);

export const marketConfigs = Object.values(MARKETS[chainId]);

export const UI_FEE_SCENARIO: Scenario = {
  name: "0.1% ui fee",
  overrides: {
    uint: [
      [MAX_UI_FEE_FACTOR_KEY, UI_FEE_FACTOR],
      [UI_FEE_FACTOR_KEY, UI_FEE_FACTOR],
    ],
  },
};

const uiFeeFactorByContext = new WeakMap<ParityContext, Promise<bigint>>();

/** What useUiFeeFactorRequest reads for UI_FEE_RECEIVER */
export function loadUiFeeFactor(ctx: ParityContext): Promise<bigint> {
  if (!uiFeeFactorByContext.has(ctx)) {
    uiFeeFactorByContext.set(ctx, readDataStoreUint(ctx, UI_FEE_FACTOR_KEY));
  }

  return uiFeeFactorByContext.get(ctx)!;
}
