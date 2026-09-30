import { describe, expect, it } from "vitest";

import { ARBITRUM } from "config/chains";
import { IS_EXPRESS_AVAILABLE_UI_FLAG } from "domain/synthetics/uiFlags/useUiFlagsRequest";

import { SyntheticsState } from "../../SyntheticsStateContextProvider";
import { selectIsExpressTransactionAvailable } from "../expressSelectors";

function makeState({ isExpressAvailable }: { isExpressAvailable: boolean }): SyntheticsState {
  return {
    globals: { chainId: ARBITRUM },
    settings: { expressOrdersEnabled: true },
    features: { relayRouterEnabled: true },
    uiFlags: {
      [IS_EXPRESS_AVAILABLE_UI_FLAG]: { enabled: isExpressAvailable, createdAt: "", updatedAt: "" },
    },
  } as unknown as SyntheticsState;
}

describe("selectIsExpressTransactionAvailable", () => {
  it("is available while the keeper flag stands", () => {
    expect(selectIsExpressTransactionAvailable(makeState({ isExpressAvailable: true }))).toBe(true);
  });

  it("is taken away by the kill switch", () => {
    expect(selectIsExpressTransactionAvailable(makeState({ isExpressAvailable: false }))).toBe(false);
  });
});
