import { afterEach, describe, expect, it } from "vitest";

import { setAbFlagEnabled } from "config/ab";
import { ARBITRUM } from "config/chains";
import { IS_EXPRESS_AVAILABLE_UI_FLAG } from "domain/synthetics/uiFlags/useUiFlagsRequest";

import { SyntheticsState } from "../../SyntheticsStateContextProvider";
import { selectIsExpressTransactionAvailable } from "../expressSelectors";

function makeState({
  isSponsoredCallAllowed,
  isExpressAvailable,
}: {
  isSponsoredCallAllowed: boolean;
  isExpressAvailable: boolean;
}): SyntheticsState {
  return {
    globals: { chainId: ARBITRUM },
    settings: { expressOrdersEnabled: true },
    features: { relayRouterEnabled: true },
    sponsoredCallBalanceData: { isSponsoredCallAllowed },
    uiFlags: {
      [IS_EXPRESS_AVAILABLE_UI_FLAG]: { enabled: isExpressAvailable, createdAt: "", updatedAt: "" },
    },
  } as unknown as SyntheticsState;
}

describe("selectIsExpressTransactionAvailable", () => {
  afterEach(() => {
    setAbFlagEnabled("gmxRelay", false);
  });

  describe("on GMX Relay", () => {
    // the gas for these operations comes out of our own keeper wallets, so Gelato's sponsor tank
    // running dry — or Gelato shutting down entirely — says nothing about them
    it("survives an empty Gelato sponsor balance", () => {
      setAbFlagEnabled("gmxRelay", true);

      const state = makeState({ isSponsoredCallAllowed: false, isExpressAvailable: true });

      expect(selectIsExpressTransactionAvailable(state)).toBe(true);
    });

    it("is taken away by our own kill switch", () => {
      setAbFlagEnabled("gmxRelay", true);

      const state = makeState({ isSponsoredCallAllowed: true, isExpressAvailable: false });

      expect(selectIsExpressTransactionAvailable(state)).toBe(false);
    });
  });

  describe("on Gelato", () => {
    it("is taken away by an empty Gelato sponsor balance", () => {
      const state = makeState({ isSponsoredCallAllowed: false, isExpressAvailable: true });

      expect(selectIsExpressTransactionAvailable(state)).toBe(false);
    });

    // our kill switch stops our relay; users an incident never touched must keep trading
    it("survives our kill switch", () => {
      const state = makeState({ isSponsoredCallAllowed: true, isExpressAvailable: false });

      expect(selectIsExpressTransactionAvailable(state)).toBe(true);
    });
  });
});
