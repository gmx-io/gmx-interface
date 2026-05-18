import { zeroHash } from "viem";
import { describe, expect, it } from "vitest";

import { AVALANCHE, AVALANCHE_FUJI } from "config/chains";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { getTradeboxLeverageSliderMarks } from "domain/synthetics/markets";
import { Subaccount } from "domain/synthetics/subaccount";
import { getContract } from "sdk/configs/contracts";
import { SUBACCOUNT_ORDER_ACTION } from "sdk/configs/dataStore";

import { selectIsOneClickActiveByUser } from ".";

const subaccountRouterAddress = getContract(AVALANCHE, "SubaccountGelatoRelayRouter");

type SubaccountOverrides = Omit<Partial<Subaccount>, "onchainData" | "signedApproval"> & {
  onchainData?: Partial<Subaccount["onchainData"]>;
  signedApproval?: Partial<Subaccount["signedApproval"]>;
};

function createSubaccount(overrides: SubaccountOverrides = {}): Subaccount {
  const {
    onchainData: onchainDataOverrides,
    signedApproval: signedApprovalOverrides,
    ...subaccountOverrides
  } = overrides;
  const onchainData: Subaccount["onchainData"] = {
    active: true,
    maxAllowedCount: 10n,
    currentActionsCount: 0n,
    expiresAt: 9999999999n,
    approvalNonce: 0n,
    multichainApprovalNonce: 0n,
    integrationId: zeroHash,
  };

  const signedApproval: Subaccount["signedApproval"] = {
    subaccount: "0x0000000000000000000000000000000000000001",
    shouldAdd: true,
    expiresAt: 9999999999n,
    maxAllowedCount: 10n,
    actionType: SUBACCOUNT_ORDER_ACTION,
    nonce: 0n,
    deadline: 9999999999n,
    desChainId: BigInt(AVALANCHE),
    signature: "0x01",
    signedAt: 0,
    integrationId: zeroHash,
    subaccountRouterAddress,
    signatureChainId: AVALANCHE as Subaccount["signedApproval"]["signatureChainId"],
  };

  return {
    address: "0x0000000000000000000000000000000000000001",
    chainId: AVALANCHE,
    signerChainId: AVALANCHE,
    signer: {} as Subaccount["signer"],
    ...subaccountOverrides,
    onchainData: {
      ...onchainData,
      ...onchainDataOverrides,
    },
    signedApproval: {
      ...signedApproval,
      ...signedApprovalOverrides,
    },
  };
}

function createState(subaccount: Subaccount | undefined): SyntheticsState {
  return {
    globals: {
      chainId: AVALANCHE,
      srcChainId: undefined,
    },
    settings: {
      expressOrdersEnabled: true,
    },
    features: {
      relayRouterEnabled: true,
      subaccountRelayRouterEnabled: true,
    },
    sponsoredCallBalanceData: {
      isSponsoredCallAllowed: true,
    },
    subaccountState: {
      subaccount,
    },
  } as SyntheticsState;
}

describe("tradeboxSelectors", () => {
  it("selectTradeboxLeverageSliderMarks", () => {
    expect(getTradeboxLeverageSliderMarks(15 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 15]);
    expect(getTradeboxLeverageSliderMarks(25 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 25]);
    expect(getTradeboxLeverageSliderMarks(50 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 25, 50]);
    expect(getTradeboxLeverageSliderMarks(60 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 25, 50, 60]);
    expect(getTradeboxLeverageSliderMarks(70 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 30, 50, 70]);
    expect(getTradeboxLeverageSliderMarks(75 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 30, 50, 75]);
    expect(getTradeboxLeverageSliderMarks(80 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 50, 80]);
    expect(getTradeboxLeverageSliderMarks(90 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 50, 90]);
    expect(getTradeboxLeverageSliderMarks(100 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 25, 50, 100]);

    expect(getTradeboxLeverageSliderMarks(110 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 25, 50, 100, 110]);
    expect(getTradeboxLeverageSliderMarks(120 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 30, 60, 120]);
    expect(getTradeboxLeverageSliderMarks(125 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 50, 100, 125]);

    expect(getTradeboxLeverageSliderMarks(150 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 50, 100, 150]);
  });

  // Off-grid 5x values that the FEDEV-3759 formula can produce (e.g. ZEC 85x). The slider's
  // last mark is its max, so any branch that hard-codes a round value (80/100/110/120) caps
  // input below the contract limit. Keep these explicit so a future regression is caught.
  it("selectTradeboxLeverageSliderMarks — off-grid 5x values", () => {
    expect(getTradeboxLeverageSliderMarks(65 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 25, 50, 65]);
    expect(getTradeboxLeverageSliderMarks(85 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 50, 85]);
    expect(getTradeboxLeverageSliderMarks(95 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 50, 95]);
    expect(getTradeboxLeverageSliderMarks(105 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 25, 50, 105]);
    expect(getTradeboxLeverageSliderMarks(115 * BASIS_POINTS_DIVISOR)).toEqual([0.1, 1, 2, 5, 10, 25, 50, 100, 115]);
  });

  describe("selectIsOneClickActiveByUser", () => {
    it("returns true only for a valid One-Click subaccount", () => {
      expect(selectIsOneClickActiveByUser(createState(createSubaccount()))).toBe(true);
    });

    it("returns false when One-Click expired by time", () => {
      expect(
        selectIsOneClickActiveByUser(
          createState(
            createSubaccount({
              onchainData: { expiresAt: 0n },
              signedApproval: { expiresAt: 0n },
            })
          )
        )
      ).toBe(false);
    });

    it("returns false when One-Click exhausted its action allowance", () => {
      expect(
        selectIsOneClickActiveByUser(
          createState(
            createSubaccount({
              onchainData: {
                maxAllowedCount: 1n,
                currentActionsCount: 1n,
              },
              signedApproval: { maxAllowedCount: 1n },
            })
          )
        )
      ).toBe(false);
    });

    it("returns false when One-Click approval is structurally invalid", () => {
      expect(
        selectIsOneClickActiveByUser(
          createState(
            createSubaccount({
              signedApproval: {
                signatureChainId: AVALANCHE_FUJI as Subaccount["signedApproval"]["signatureChainId"],
              },
            })
          )
        )
      ).toBe(false);
    });
  });
});
