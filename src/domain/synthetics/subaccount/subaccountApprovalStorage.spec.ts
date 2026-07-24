import { zeroHash } from "viem";
import { beforeEach, describe, expect, it } from "vitest";

import { ARBITRUM, SOURCE_BASE_MAINNET, SOURCE_BSC_MAINNET } from "config/chains";
import { getSubaccountApprovalKey } from "config/localStorage";
import { readLocalStorageItem, writeLocalStorageItem } from "lib/localStorage";
import { getContract } from "sdk/configs/contracts";
import { SUBACCOUNT_ORDER_ACTION } from "sdk/configs/dataStore";
import type { SignedSubaccountApproval } from "sdk/utils/subaccount";

import {
  deserializeSubaccountApproval,
  findFallbackSubaccountApproval,
  migrateLegacySubaccountApprovalSlot,
  readStoredSubaccountApproval,
  removeAllStoredSubaccountApprovals,
  serializeSubaccountApproval,
  writeStoredSubaccountApproval,
} from "./subaccountApprovalStorage";

const ACCOUNT = "0x000000000000000000000000000000000000AaaA";
const SUBACCOUNT_ADDRESS = "0x0000000000000000000000000000000000000001";

const gelatoRouterAddress = getContract(ARBITRUM, "SubaccountGelatoRelayRouter");
const multichainRouterAddress = getContract(ARBITRUM, "MultichainSubaccountRouter");

function createApproval(overrides: Partial<SignedSubaccountApproval> = {}): SignedSubaccountApproval {
  return {
    subaccount: SUBACCOUNT_ADDRESS,
    shouldAdd: true,
    expiresAt: 9999999999n,
    maxAllowedCount: 10n,
    actionType: SUBACCOUNT_ORDER_ACTION,
    nonce: 5n,
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

function createSettlementContextApproval(overrides: Partial<SignedSubaccountApproval> = {}): SignedSubaccountApproval {
  return createApproval({
    signatureChainId: ARBITRUM,
    subaccountRouterAddress: gelatoRouterAddress,
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
    ...overrides,
  });
}

function writeLegacySlot(approval: SignedSubaccountApproval) {
  writeLocalStorageItem(getSubaccountApprovalKey(ARBITRUM, ACCOUNT, undefined)!, approval, {
    serializer: serializeSubaccountApproval,
  });
}

beforeEach(() => {
  localStorage.clear();
});

describe("serializeSubaccountApproval / deserializeSubaccountApproval", () => {
  it("roundtrips an approval with bigint fields", () => {
    const approval = createSourceContextApproval(SOURCE_BASE_MAINNET);

    const restored = deserializeSubaccountApproval(serializeSubaccountApproval(approval));

    expect(restored).toMatchObject({
      subaccount: approval.subaccount,
      signature: approval.signature,
      signatureChainId: approval.signatureChainId,
      subaccountRouterAddress: approval.subaccountRouterAddress,
      maxAllowedCount: approval.maxAllowedCount,
      expiresAt: approval.expiresAt,
      deadline: approval.deadline,
      nonce: approval.nonce,
    });
  });

  it("deserializes an empty or broken value as undefined", () => {
    expect(deserializeSubaccountApproval("")).toBe(undefined);
    expect(deserializeSubaccountApproval("{not a json")).toBe(undefined);
  });
});

describe("writeStoredSubaccountApproval / readStoredSubaccountApproval", () => {
  it("stores approvals of different signing contexts in isolated slots", () => {
    const settlementApproval = createSettlementContextApproval({ signedAt: 1 });
    const baseApproval = createSourceContextApproval(SOURCE_BASE_MAINNET, { signedAt: 2 });
    const bscApproval = createSourceContextApproval(SOURCE_BSC_MAINNET, { signedAt: 3 });

    writeStoredSubaccountApproval(ARBITRUM, ACCOUNT, settlementApproval);
    writeStoredSubaccountApproval(ARBITRUM, ACCOUNT, baseApproval);
    writeStoredSubaccountApproval(ARBITRUM, ACCOUNT, bscApproval);

    expect(readStoredSubaccountApproval(ARBITRUM, ACCOUNT, undefined)?.signedAt).toBe(1);
    expect(readStoredSubaccountApproval(ARBITRUM, ACCOUNT, SOURCE_BASE_MAINNET)?.signedAt).toBe(2);
    expect(readStoredSubaccountApproval(ARBITRUM, ACCOUNT, SOURCE_BSC_MAINNET)?.signedAt).toBe(3);
  });

  it("re-signing for one context does not overwrite an approval of another context", () => {
    const baseApproval = createSourceContextApproval(SOURCE_BASE_MAINNET, { signedAt: 1 });
    writeStoredSubaccountApproval(ARBITRUM, ACCOUNT, baseApproval);

    const bscApproval = createSourceContextApproval(SOURCE_BSC_MAINNET, { signedAt: 2 });
    writeStoredSubaccountApproval(ARBITRUM, ACCOUNT, bscApproval);

    expect(readStoredSubaccountApproval(ARBITRUM, ACCOUNT, SOURCE_BASE_MAINNET)?.signatureChainId).toBe(
      SOURCE_BASE_MAINNET
    );
    expect(readStoredSubaccountApproval(ARBITRUM, ACCOUNT, SOURCE_BSC_MAINNET)?.signatureChainId).toBe(
      SOURCE_BSC_MAINNET
    );
  });

  it("returns undefined for an empty slot", () => {
    expect(readStoredSubaccountApproval(ARBITRUM, ACCOUNT, SOURCE_BASE_MAINNET)).toBe(undefined);
  });
});

describe("migrateLegacySubaccountApprovalSlot", () => {
  it("moves a source-context approval out of the legacy slot into its own context slot", () => {
    const baseApproval = createSourceContextApproval(SOURCE_BASE_MAINNET);
    writeLegacySlot(baseApproval);

    migrateLegacySubaccountApprovalSlot(ARBITRUM, ACCOUNT);

    expect(readStoredSubaccountApproval(ARBITRUM, ACCOUNT, SOURCE_BASE_MAINNET)?.signatureChainId).toBe(
      SOURCE_BASE_MAINNET
    );
    expect(readStoredSubaccountApproval(ARBITRUM, ACCOUNT, undefined)).toBe(undefined);
  });

  it("keeps a settlement-context approval in the legacy slot", () => {
    const settlementApproval = createSettlementContextApproval();
    writeLegacySlot(settlementApproval);

    migrateLegacySubaccountApprovalSlot(ARBITRUM, ACCOUNT);

    expect(readStoredSubaccountApproval(ARBITRUM, ACCOUNT, undefined)?.signatureChainId).toBe(ARBITRUM);
    expect(readStoredSubaccountApproval(ARBITRUM, ACCOUNT, SOURCE_BASE_MAINNET)).toBe(undefined);
  });

  it("does not overwrite an existing context-slot approval with the legacy one", () => {
    const newerBaseApproval = createSourceContextApproval(SOURCE_BASE_MAINNET, { signedAt: 2 });
    writeStoredSubaccountApproval(ARBITRUM, ACCOUNT, newerBaseApproval);

    const legacyBaseApproval = createSourceContextApproval(SOURCE_BASE_MAINNET, { signedAt: 1 });
    writeLegacySlot(legacyBaseApproval);

    migrateLegacySubaccountApprovalSlot(ARBITRUM, ACCOUNT);

    expect(readStoredSubaccountApproval(ARBITRUM, ACCOUNT, SOURCE_BASE_MAINNET)?.signedAt).toBe(2);
    expect(readStoredSubaccountApproval(ARBITRUM, ACCOUNT, undefined)).toBe(undefined);
  });

  it("is a no-op when there is nothing to migrate", () => {
    migrateLegacySubaccountApprovalSlot(ARBITRUM, ACCOUNT);

    expect(readStoredSubaccountApproval(ARBITRUM, ACCOUNT, undefined)).toBe(undefined);
  });
});

describe("findFallbackSubaccountApproval", () => {
  it("returns the most recently signed approval among all context slots", () => {
    writeStoredSubaccountApproval(ARBITRUM, ACCOUNT, createSettlementContextApproval({ signedAt: 1 }));
    writeStoredSubaccountApproval(ARBITRUM, ACCOUNT, createSourceContextApproval(SOURCE_BASE_MAINNET, { signedAt: 3 }));
    writeStoredSubaccountApproval(ARBITRUM, ACCOUNT, createSourceContextApproval(SOURCE_BSC_MAINNET, { signedAt: 2 }));

    expect(findFallbackSubaccountApproval(ARBITRUM, ACCOUNT, SUBACCOUNT_ADDRESS)?.signatureChainId).toBe(
      SOURCE_BASE_MAINNET
    );
  });

  it("ignores approvals of another subaccount address", () => {
    writeStoredSubaccountApproval(
      ARBITRUM,
      ACCOUNT,
      createSourceContextApproval(SOURCE_BASE_MAINNET, {
        subaccount: "0x0000000000000000000000000000000000000002",
      })
    );

    expect(findFallbackSubaccountApproval(ARBITRUM, ACCOUNT, SUBACCOUNT_ADDRESS)).toBe(undefined);
  });

  it("returns undefined when no approvals are stored", () => {
    expect(findFallbackSubaccountApproval(ARBITRUM, ACCOUNT, SUBACCOUNT_ADDRESS)).toBe(undefined);
  });
});

describe("removeAllStoredSubaccountApprovals", () => {
  it("removes approvals of every signing context", () => {
    writeStoredSubaccountApproval(ARBITRUM, ACCOUNT, createSettlementContextApproval());
    writeStoredSubaccountApproval(ARBITRUM, ACCOUNT, createSourceContextApproval(SOURCE_BASE_MAINNET));
    writeStoredSubaccountApproval(ARBITRUM, ACCOUNT, createSourceContextApproval(SOURCE_BSC_MAINNET));

    removeAllStoredSubaccountApprovals(ARBITRUM, ACCOUNT);

    expect(readStoredSubaccountApproval(ARBITRUM, ACCOUNT, undefined)).toBe(undefined);
    expect(readStoredSubaccountApproval(ARBITRUM, ACCOUNT, SOURCE_BASE_MAINNET)).toBe(undefined);
    expect(readStoredSubaccountApproval(ARBITRUM, ACCOUNT, SOURCE_BSC_MAINNET)).toBe(undefined);
    expect(
      readLocalStorageItem(getSubaccountApprovalKey(ARBITRUM, ACCOUNT, undefined)!, { deserializer: (v) => v })
    ).toBe(undefined);
  });
});
