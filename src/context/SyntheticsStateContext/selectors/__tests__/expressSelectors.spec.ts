import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import {
  FORCE_GELATO_FALLBACK_UI_FLAG,
  IS_EXPRESS_AVAILABLE_UI_FLAG,
} from "domain/synthetics/uiFlags/useUiFlagsRequest";

import { SyntheticsState } from "../../SyntheticsStateContextProvider";
import { selectIsExpressTransactionAvailable } from "../expressSelectors";

function makeState({
  isSponsoredCallAllowed,
  isExpressAvailable,
  isGelatoForced = false,
}: {
  isSponsoredCallAllowed: boolean;
  isExpressAvailable: boolean;
  isGelatoForced?: boolean;
}): SyntheticsState {
  return {
    globals: { chainId: ARBITRUM },
    settings: { expressOrdersEnabled: true },
    features: { relayRouterEnabled: true },
    sponsoredCallBalanceData: { isSponsoredCallAllowed },
    uiFlags: {
      [IS_EXPRESS_AVAILABLE_UI_FLAG]: { enabled: isExpressAvailable, createdAt: "", updatedAt: "" },
      [FORCE_GELATO_FALLBACK_UI_FLAG]: { enabled: isGelatoForced, createdAt: "", updatedAt: "" },
    },
  } as unknown as SyntheticsState;
}

// with every chain pinned to GMX Relay, the only Gelato users left are the ones the incident
// switch moved there — so the Gelato cases arrange themselves through that switch
describe("selectIsExpressTransactionAvailable", () => {
  describe("on GMX Relay", () => {
    it("survives an empty Gelato sponsor balance", () => {
      const state = makeState({ isSponsoredCallAllowed: false, isExpressAvailable: true });

      expect(selectIsExpressTransactionAvailable(state)).toBe(true);
    });

    it("is taken away by our own kill switch", () => {
      const state = makeState({ isSponsoredCallAllowed: true, isExpressAvailable: false });

      expect(selectIsExpressTransactionAvailable(state)).toBe(false);
    });
  });

  describe("on Gelato via the incident switch", () => {
    it("is taken away by an empty Gelato sponsor balance", () => {
      const state = makeState({ isSponsoredCallAllowed: false, isExpressAvailable: true, isGelatoForced: true });

      expect(selectIsExpressTransactionAvailable(state)).toBe(false);
    });

    it("survives our kill switch", () => {
      const state = makeState({ isSponsoredCallAllowed: true, isExpressAvailable: false, isGelatoForced: true });

      expect(selectIsExpressTransactionAvailable(state)).toBe(true);
    });
  });
});
