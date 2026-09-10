import { zeroHash } from "viem";
import { describe, expect, it } from "vitest";

import { AVALANCHE, AVALANCHE_FUJI, SOURCE_BASE_MAINNET, SOURCE_BSC_MAINNET, SourceChainId } from "config/chains";
import { BASIS_POINTS_DIVISOR } from "config/factors";
import { SyntheticsState } from "context/SyntheticsStateContext/SyntheticsStateContextProvider";
import { getTradeboxLeverageSliderMarks } from "domain/synthetics/markets";
import { Subaccount } from "domain/synthetics/subaccount";
import { TradeMode, TradeType } from "domain/synthetics/trade";
import { getContract } from "sdk/configs/contracts";
import { SUBACCOUNT_ORDER_ACTION } from "sdk/configs/dataStore";

import { selectIsOneClickActiveByUser, selectTradeboxHasPendingInput } from ".";

const subaccountRouterAddress = getContract(AVALANCHE, "SubaccountGelatoRelayRouter");
const multichainSubaccountRouterAddress = getContract(AVALANCHE, "MultichainSubaccountRouter");

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

function createState(subaccount: Subaccount | undefined, srcChainId?: SourceChainId): SyntheticsState {
  return {
    globals: {
      chainId: AVALANCHE,
      srcChainId,
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
  describe("selectTradeboxHasPendingInput", () => {
    function createPendingInputState(
      overrides: Record<string, unknown> = {},
      sidecarOrders: { slEntries?: { txnType: string | null }[]; tpEntries?: { txnType: string | null }[] } = {}
    ) {
      return {
        tradebox: {
          tradeType: TradeType.Long,
          tradeMode: TradeMode.Market,
          fromTokenInputValue: "",
          toTokenInputValue: "",
          closeSizeInputValue: "",
          triggerPriceInputValue: "",
          triggerRatioInputValue: "",
          advancedOptions: { limitOrTPSL: false },
          sidecarOrders: {
            slEntries: sidecarOrders.slEntries ?? [],
            tpEntries: sidecarOrders.tpEntries ?? [],
          },
          ...overrides,
        },
      } as unknown as SyntheticsState;
    }

    it("detects values in fields used by the active trade", () => {
      expect(selectTradeboxHasPendingInput(createPendingInputState())).toBe(false);
      expect(selectTradeboxHasPendingInput(createPendingInputState({ fromTokenInputValue: "0.5" }))).toBe(true);
      expect(
        selectTradeboxHasPendingInput(
          createPendingInputState({ tradeMode: TradeMode.Limit, triggerPriceInputValue: "2500" })
        )
      ).toBe(true);
      expect(
        selectTradeboxHasPendingInput(
          createPendingInputState({
            tradeType: TradeType.Swap,
            tradeMode: TradeMode.Limit,
            triggerRatioInputValue: "0.0001",
          })
        )
      ).toBe(true);
      expect(
        selectTradeboxHasPendingInput(
          createPendingInputState({ tradeMode: TradeMode.Trigger, closeSizeInputValue: "250" })
        )
      ).toBe(true);
    });

    it("ignores stale values from inactive fields", () => {
      expect(selectTradeboxHasPendingInput(createPendingInputState({ triggerPriceInputValue: "2500" }))).toBe(false);
      expect(
        selectTradeboxHasPendingInput(
          createPendingInputState({ tradeType: TradeType.Swap, triggerRatioInputValue: "0.0001" })
        )
      ).toBe(false);
      expect(
        selectTradeboxHasPendingInput(
          createPendingInputState({ tradeMode: TradeMode.Trigger, fromTokenInputValue: "1" })
        )
      ).toBe(false);
    });

    it("detects edited TP/SL entries without treating existing orders as drafts", () => {
      const enabled = { advancedOptions: { limitOrTPSL: true } };

      expect(
        selectTradeboxHasPendingInput(createPendingInputState(enabled, { slEntries: [{ txnType: "create" }] }))
      ).toBe(true);
      expect(
        selectTradeboxHasPendingInput(createPendingInputState(enabled, { tpEntries: [{ txnType: "cancel" }] }))
      ).toBe(true);
      expect(selectTradeboxHasPendingInput(createPendingInputState(enabled, { tpEntries: [{ txnType: null }] }))).toBe(
        false
      );
      expect(selectTradeboxHasPendingInput(createPendingInputState({}, { slEntries: [{ txnType: "create" }] }))).toBe(
        false
      );
    });
  });

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

    describe("signing-context resolution", () => {
      const PENDING_MULTICHAIN_NONCE = 7n;

      function createPendingSourceContextSubaccount(
        signerChainId: SourceChainId,
        approvalSignatureChainId: SourceChainId
      ): Subaccount {
        return createSubaccount({
          signerChainId,
          onchainData: {
            active: false,
            multichainApprovalNonce: PENDING_MULTICHAIN_NONCE,
          },
          signedApproval: {
            signatureChainId: approvalSignatureChainId,
            subaccountRouterAddress: multichainSubaccountRouterAddress,
            nonce: PENDING_MULTICHAIN_NONCE,
          },
        });
      }

      it("approval signed for the settlement context is active in the settlement context", () => {
        expect(selectIsOneClickActiveByUser(createState(createSubaccount()))).toBe(true);
      });

      it("approval signed for the settlement context is not used for a source-network context", () => {
        const subaccount = createSubaccount({
          signerChainId: SOURCE_BASE_MAINNET,
        });

        expect(selectIsOneClickActiveByUser(createState(subaccount, SOURCE_BASE_MAINNET))).toBe(false);
      });

      it("pending approval signed for a source network is active in its own context", () => {
        const subaccount = createPendingSourceContextSubaccount(SOURCE_BASE_MAINNET, SOURCE_BASE_MAINNET);

        expect(selectIsOneClickActiveByUser(createState(subaccount, SOURCE_BASE_MAINNET))).toBe(true);
      });

      it("pending approval signed for one source network is not used for another source network", () => {
        const subaccount = createPendingSourceContextSubaccount(SOURCE_BSC_MAINNET, SOURCE_BASE_MAINNET);

        expect(selectIsOneClickActiveByUser(createState(subaccount, SOURCE_BSC_MAINNET))).toBe(false);
      });

      it("before either approval is applied both contexts are active with their own pending approvals", () => {
        const baseSubaccount = createPendingSourceContextSubaccount(SOURCE_BASE_MAINNET, SOURCE_BASE_MAINNET);
        const bscSubaccount = createPendingSourceContextSubaccount(SOURCE_BSC_MAINNET, SOURCE_BSC_MAINNET);

        expect(selectIsOneClickActiveByUser(createState(baseSubaccount, SOURCE_BASE_MAINNET))).toBe(true);
        expect(selectIsOneClickActiveByUser(createState(bscSubaccount, SOURCE_BSC_MAINNET))).toBe(true);
      });

      it("an approval with a consumed shared nonce is not a valid One-Click path even in its own context", () => {
        const subaccount = createSubaccount({
          signerChainId: SOURCE_BASE_MAINNET,
          onchainData: {
            active: true,
            multichainApprovalNonce: PENDING_MULTICHAIN_NONCE + 1n,
          },
          signedApproval: {
            signatureChainId: SOURCE_BASE_MAINNET,
            subaccountRouterAddress: multichainSubaccountRouterAddress,
            nonce: PENDING_MULTICHAIN_NONCE,
          },
        });

        expect(selectIsOneClickActiveByUser(createState(subaccount, SOURCE_BASE_MAINNET))).toBe(false);
      });
    });
  });
});
