import { zeroHash } from "viem";
import { describe, expect, it } from "vitest";

import { ARBITRUM, SOURCE_BASE_MAINNET, SOURCE_BSC_MAINNET } from "config/chains";
import { getContract } from "sdk/configs/contracts";
import { SUBACCOUNT_ORDER_ACTION } from "sdk/configs/dataStore";
import { ZERO_DATA } from "sdk/utils/hash";
import type { SignedSubaccountApproval, SubaccountOnchainData } from "sdk/utils/subaccount";

import {
  getActualApproval,
  getIsSubaccountApprovalInvalid,
  getIsSubaccountNonceExpired,
  getSubaccountApprovalContextSrcChainId,
} from "./utils";

const SUBACCOUNT_ADDRESS = "0x0000000000000000000000000000000000000001";

const gelatoRouterAddress = getContract(ARBITRUM, "SubaccountGelatoRelayRouter");
const multichainRouterAddress = getContract(ARBITRUM, "MultichainSubaccountRouter");

const APPROVAL_NONCE = 5n;
const MULTICHAIN_APPROVAL_NONCE = 7n;

function createOnchainData(overrides: Partial<SubaccountOnchainData> = {}): SubaccountOnchainData {
  return {
    active: false,
    maxAllowedCount: 10n,
    currentActionsCount: 0n,
    expiresAt: 9999999999n,
    approvalNonce: APPROVAL_NONCE,
    multichainApprovalNonce: MULTICHAIN_APPROVAL_NONCE,
    integrationId: zeroHash,
    ...overrides,
  };
}

function createApproval(overrides: Partial<SignedSubaccountApproval> = {}): SignedSubaccountApproval {
  return {
    subaccount: SUBACCOUNT_ADDRESS,
    shouldAdd: true,
    expiresAt: 9999999999n,
    maxAllowedCount: 10n,
    actionType: SUBACCOUNT_ORDER_ACTION,
    nonce: APPROVAL_NONCE,
    deadline: 9999999999n,
    desChainId: BigInt(ARBITRUM),
    signature: "0x01",
    signedAt: 1000,
    integrationId: zeroHash,
    subaccountRouterAddress: gelatoRouterAddress,
    signatureChainId: ARBITRUM,
    ...overrides,
  };
}

function createEmptyApproval(): SignedSubaccountApproval {
  return createApproval({
    shouldAdd: false,
    expiresAt: 0n,
    maxAllowedCount: 0n,
    nonce: 0n,
    signature: ZERO_DATA,
    signedAt: 0,
  });
}

function createSettlementContextApproval(overrides: Partial<SignedSubaccountApproval> = {}): SignedSubaccountApproval {
  return createApproval({
    signatureChainId: ARBITRUM,
    subaccountRouterAddress: gelatoRouterAddress,
    nonce: APPROVAL_NONCE,
    ...overrides,
  });
}

function createSourceContextApproval(
  srcChainId: SignedSubaccountApproval["signatureChainId"],
  overrides: Partial<SignedSubaccountApproval> = {}
): SignedSubaccountApproval {
  return createApproval({
    signatureChainId: srcChainId,
    subaccountRouterAddress: multichainRouterAddress,
    nonce: MULTICHAIN_APPROVAL_NONCE,
    ...overrides,
  });
}

describe("getIsSubaccountApprovalInvalid", () => {
  it("returns false for an approval checked in its own settlement context", () => {
    expect(
      getIsSubaccountApprovalInvalid({
        chainId: ARBITRUM,
        signerChainId: ARBITRUM,
        signedApproval: createSettlementContextApproval(),
        onchainData: createOnchainData(),
        subaccountRouterAddress: gelatoRouterAddress,
      })
    ).toBe(false);
  });

  it("returns true for a settlement-context approval checked in a source-network context", () => {
    expect(
      getIsSubaccountApprovalInvalid({
        chainId: ARBITRUM,
        signerChainId: SOURCE_BASE_MAINNET,
        signedApproval: createSettlementContextApproval(),
        onchainData: createOnchainData(),
        subaccountRouterAddress: multichainRouterAddress,
      })
    ).toBe(true);
  });

  it("returns false for a source-context approval checked in its own source-network context", () => {
    expect(
      getIsSubaccountApprovalInvalid({
        chainId: ARBITRUM,
        signerChainId: SOURCE_BASE_MAINNET,
        signedApproval: createSourceContextApproval(SOURCE_BASE_MAINNET),
        onchainData: createOnchainData(),
        subaccountRouterAddress: multichainRouterAddress,
      })
    ).toBe(false);
  });

  it("returns true for a source-context approval checked in another source-network context", () => {
    expect(
      getIsSubaccountApprovalInvalid({
        chainId: ARBITRUM,
        signerChainId: SOURCE_BSC_MAINNET,
        signedApproval: createSourceContextApproval(SOURCE_BASE_MAINNET),
        onchainData: createOnchainData(),
        subaccountRouterAddress: multichainRouterAddress,
      })
    ).toBe(true);
  });

  it("returns true for a source-context approval checked in the settlement context", () => {
    expect(
      getIsSubaccountApprovalInvalid({
        chainId: ARBITRUM,
        signerChainId: ARBITRUM,
        signedApproval: createSourceContextApproval(SOURCE_BASE_MAINNET),
        onchainData: createOnchainData(),
        subaccountRouterAddress: gelatoRouterAddress,
      })
    ).toBe(true);
  });

  it("returns false for an empty approval", () => {
    expect(
      getIsSubaccountApprovalInvalid({
        chainId: ARBITRUM,
        signerChainId: SOURCE_BASE_MAINNET,
        signedApproval: createEmptyApproval(),
        onchainData: createOnchainData(),
        subaccountRouterAddress: multichainRouterAddress,
      })
    ).toBe(false);
  });

  it("returns false for an already applied approval that can no longer update the subaccount", () => {
    expect(
      getIsSubaccountApprovalInvalid({
        chainId: ARBITRUM,
        signerChainId: SOURCE_BASE_MAINNET,
        signedApproval: createSettlementContextApproval({ nonce: APPROVAL_NONCE - 1n }),
        onchainData: createOnchainData({ active: true }),
        subaccountRouterAddress: multichainRouterAddress,
      })
    ).toBe(false);
  });

  it("returns true for an approval with an unknown router address", () => {
    expect(
      getIsSubaccountApprovalInvalid({
        chainId: ARBITRUM,
        signerChainId: ARBITRUM,
        signedApproval: createSettlementContextApproval({
          subaccountRouterAddress: "0x000000000000000000000000000000000000dEaD",
        }),
        onchainData: createOnchainData(),
        subaccountRouterAddress: gelatoRouterAddress,
      })
    ).toBe(true);
  });
});

describe("getIsSubaccountNonceExpired", () => {
  it("resolves the nonce of a source-signed approval by its router", () => {
    expect(
      getIsSubaccountNonceExpired({
        chainId: ARBITRUM,
        onchainData: createOnchainData(),
        signedApproval: createSourceContextApproval(SOURCE_BASE_MAINNET),
      })
    ).toBe(false);

    expect(
      getIsSubaccountNonceExpired({
        chainId: ARBITRUM,
        onchainData: createOnchainData({ multichainApprovalNonce: MULTICHAIN_APPROVAL_NONCE + 1n }),
        signedApproval: createSourceContextApproval(SOURCE_BASE_MAINNET),
      })
    ).toBe(true);
  });

  it("compares the settlement-router approval against the settlement router nonce", () => {
    expect(
      getIsSubaccountNonceExpired({
        chainId: ARBITRUM,
        onchainData: createOnchainData(),
        signedApproval: createSettlementContextApproval(),
      })
    ).toBe(false);

    expect(
      getIsSubaccountNonceExpired({
        chainId: ARBITRUM,
        onchainData: createOnchainData(),
        signedApproval: createSettlementContextApproval({ nonce: APPROVAL_NONCE - 1n }),
      })
    ).toBe(true);
  });

  it("compares the multichain-router approval against the multichain router nonce", () => {
    const approval = createSourceContextApproval(ARBITRUM);

    expect(
      getIsSubaccountNonceExpired({
        chainId: ARBITRUM,
        onchainData: createOnchainData(),
        signedApproval: approval,
      })
    ).toBe(false);

    expect(
      getIsSubaccountNonceExpired({
        chainId: ARBITRUM,
        onchainData: createOnchainData(),
        signedApproval: { ...approval, nonce: MULTICHAIN_APPROVAL_NONCE - 1n },
      })
    ).toBe(true);
  });

  it("returns false for an empty approval", () => {
    expect(
      getIsSubaccountNonceExpired({
        chainId: ARBITRUM,
        onchainData: createOnchainData(),
        signedApproval: createEmptyApproval(),
      })
    ).toBe(false);
  });
});

describe("getSubaccountApprovalContextSrcChainId", () => {
  it("returns undefined for an approval signed on the settlement chain", () => {
    expect(getSubaccountApprovalContextSrcChainId(ARBITRUM, createSettlementContextApproval())).toBe(undefined);
  });

  it("returns the source chain id for an approval signed on a source chain", () => {
    expect(getSubaccountApprovalContextSrcChainId(ARBITRUM, createSourceContextApproval(SOURCE_BASE_MAINNET))).toBe(
      SOURCE_BASE_MAINNET
    );
  });

  it("returns undefined for a multichain-router approval signed on the settlement chain", () => {
    expect(getSubaccountApprovalContextSrcChainId(ARBITRUM, createSourceContextApproval(ARBITRUM))).toBe(undefined);
  });
});

describe("getActualApproval", () => {
  it("returns an empty approval when there is no stored approval", () => {
    const actual = getActualApproval({
      chainId: ARBITRUM,
      address: SUBACCOUNT_ADDRESS,
      signedApproval: undefined,
      onchainData: createOnchainData(),
    });

    expect(actual.signature).toBe(ZERO_DATA);
    expect(actual.nonce).toBe(0n);
  });

  it("returns the stored approval when it is not yet applied on-chain", () => {
    const approval = createSourceContextApproval(SOURCE_BASE_MAINNET);

    expect(
      getActualApproval({
        chainId: ARBITRUM,
        address: SUBACCOUNT_ADDRESS,
        signedApproval: approval,
        onchainData: createOnchainData(),
      })
    ).toBe(approval);
  });

  it("returns an empty approval when the stored approval is synced with on-chain state", () => {
    const approval = createSourceContextApproval(SOURCE_BASE_MAINNET);

    const actual = getActualApproval({
      chainId: ARBITRUM,
      address: SUBACCOUNT_ADDRESS,
      signedApproval: approval,
      onchainData: createOnchainData({
        active: true,
        maxAllowedCount: approval.maxAllowedCount,
        expiresAt: approval.expiresAt,
      }),
    });

    expect(actual.signature).toBe(ZERO_DATA);
  });

  it("returns an empty approval when the settlement-context approval nonce is consumed", () => {
    const actual = getActualApproval({
      chainId: ARBITRUM,
      address: SUBACCOUNT_ADDRESS,
      signedApproval: createSettlementContextApproval({ nonce: APPROVAL_NONCE - 1n }),
      onchainData: createOnchainData(),
    });

    expect(actual.signature).toBe(ZERO_DATA);
  });

  it("returns an empty approval when a source-context approval nonce is consumed by another context", () => {
    const actual = getActualApproval({
      chainId: ARBITRUM,
      address: SUBACCOUNT_ADDRESS,
      signedApproval: createSourceContextApproval(SOURCE_BASE_MAINNET, {
        expiresAt: 9999999999n,
        maxAllowedCount: 10n,
      }),
      onchainData: createOnchainData({
        active: true,
        multichainApprovalNonce: MULTICHAIN_APPROVAL_NONCE + 1n,
        expiresAt: 8888888888n,
        maxAllowedCount: 20n,
      }),
    });

    expect(actual.signature).toBe(ZERO_DATA);
  });
});
