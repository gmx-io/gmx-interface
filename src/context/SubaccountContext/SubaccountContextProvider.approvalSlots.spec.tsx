import { act, cleanup, render } from "@testing-library/react";
import { zeroHash } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, SOURCE_BASE_MAINNET, SOURCE_BSC_MAINNET, type SourceChainId } from "config/chains";
import { getSubaccountApprovalKey, getSubaccountConfigKey } from "config/localStorage";
import {
  deserializeSubaccountApproval,
  serializeSubaccountApproval,
} from "domain/synthetics/subaccount/subaccountApprovalStorage";
import { getContract } from "sdk/configs/contracts";
import { SUBACCOUNT_ORDER_ACTION } from "sdk/configs/dataStore";
import { ZERO_DATA } from "sdk/utils/hash";
import type { SignedSubaccountApproval, SubaccountOnchainData } from "sdk/utils/subaccount";

import { SubaccountContextProvider, useSubaccountContext } from "./SubaccountContextProvider";
import type { SubaccountState } from "./SubaccountContextProvider";

const { mocks, chainState, onchainState, ACCOUNT, CHAIN_ID, SUBACCOUNT_ADDRESS, OLD_SUBACCOUNT_ADDRESS } = vi.hoisted(
  () => ({
    mocks: {
      getInitialSubaccountApproval: vi.fn(),
      signUpdatedSubaccountSettings: vi.fn(),
      refreshSubaccountData: vi.fn(),
      requestTokenApprovals: vi.fn(),
    },
    chainState: { current: { chainId: 42161, srcChainId: undefined as number | undefined } },
    onchainState: { current: undefined as unknown },
    ACCOUNT: "0x1234567890123456789012345678901234567890",
    CHAIN_ID: 42161,
    SUBACCOUNT_ADDRESS: "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa",
    OLD_SUBACCOUNT_ADDRESS: "0xBbbBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbbBBbB",
  })
);

vi.mock("context/SyntheticsStateContext/selectors/expressSelectors", () => ({
  selectExpressGlobalParams: () => undefined,
}));

vi.mock("context/SyntheticsStateContext/selectors/tradeboxSelectors", () => ({
  selectTradeboxIsFromTokenGmxAccount: () => false,
}));

vi.mock("context/SyntheticsStateContext/utils", () => ({
  useCalcSelector: () => () => false,
}));

vi.mock("domain/synthetics/subaccount", () => ({
  removeSubaccountExpressTxn: vi.fn(),
  removeSubaccountWalletTxn: vi.fn(),
}));

vi.mock("domain/synthetics/subaccount/generateSubaccount", () => ({
  generateSubaccount: vi.fn(),
}));

vi.mock("domain/synthetics/subaccount/useSubaccountOnchainData", () => ({
  useSubaccountOnchainData: () => ({
    subaccountData: onchainState.current,
    refreshSubaccountData: mocks.refreshSubaccountData,
  }),
}));

vi.mock("domain/synthetics/subaccount/useOneClickTokenApproval", () => ({
  useOneClickTokenApproval: () => ({
    requestTokenApprovals: mocks.requestTokenApprovals,
    state: { canBatch: false, isApproving: false, pendingTokens: [] },
  }),
}));

vi.mock("domain/synthetics/subaccount/utils", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getInitialSubaccountApproval: mocks.getInitialSubaccountApproval,
  getSubaccountSigner: vi.fn(() => ({})),
  signUpdatedSubaccountSettings: mocks.signUpdatedSubaccountSettings,
}));

vi.mock("lib/chains", () => ({
  useChainId: () => chainState.current,
}));

vi.mock("lib/helperToast", () => ({
  helperToast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("lib/metrics", () => ({
  metrics: {
    pushError: vi.fn(),
  },
}));

vi.mock("lib/rpc", () => ({
  useJsonRpcProvider: () => ({ provider: {} }),
}));

vi.mock("lib/wallets/useEthersSigner", () => ({
  useEthersSigner: () => ({ address: ACCOUNT, provider: {} }),
}));

vi.mock("lib/wallets/useWallet", () => ({
  default: () => ({ account: ACCOUNT }),
}));

vi.mock("components/StatusNotification/StatusNotification", () => ({
  StatusNotification: () => null,
}));

vi.mock("components/TransactionStatus/TransactionStatus", () => ({
  TransactionStatus: () => null,
}));

const gelatoRouterAddress = getContract(ARBITRUM, "SubaccountGelatoRelayRouter");
const multichainRouterAddress = getContract(ARBITRUM, "MultichainSubaccountRouter");

const MULTICHAIN_APPROVAL_NONCE = 7n;

const configKey = JSON.stringify(getSubaccountConfigKey(CHAIN_ID, ACCOUNT));

function approvalSlotKey(srcChainId: SourceChainId | undefined): string {
  return JSON.stringify(getSubaccountApprovalKey(CHAIN_ID, ACCOUNT, srcChainId));
}

function seedConfig() {
  localStorage.setItem(
    configKey,
    JSON.stringify({ address: SUBACCOUNT_ADDRESS, privateKey: "encrypted-private-key", isNew: true })
  );
}

function createOnchainData(overrides: Partial<SubaccountOnchainData> = {}): SubaccountOnchainData {
  return {
    active: false,
    maxAllowedCount: 10n,
    currentActionsCount: 0n,
    expiresAt: 9999999999n,
    approvalNonce: 5n,
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
    nonce: MULTICHAIN_APPROVAL_NONCE,
    deadline: 9999999999n,
    desChainId: BigInt(CHAIN_ID),
    signature: "0x01",
    signedAt: 1000,
    integrationId: zeroHash,
    subaccountRouterAddress: multichainRouterAddress,
    signatureChainId: SOURCE_BASE_MAINNET,
    ...overrides,
  };
}

function seedSlot(srcChainId: SourceChainId | undefined, approval: SignedSubaccountApproval) {
  localStorage.setItem(approvalSlotKey(srcChainId), serializeSubaccountApproval(approval));
}

function readSlot(srcChainId: SourceChainId | undefined): SignedSubaccountApproval | undefined {
  const stored = localStorage.getItem(approvalSlotKey(srcChainId));
  return stored === null ? undefined : deserializeSubaccountApproval(stored);
}

function setup() {
  const captured: { current: SubaccountState } = { current: undefined as unknown as SubaccountState };

  function TestComponent() {
    captured.current = useSubaccountContext();
    return null;
  }

  const view = render(
    <SubaccountContextProvider>
      <TestComponent />
    </SubaccountContextProvider>
  );

  const rerenderProvider = () => {
    view.rerender(
      <SubaccountContextProvider>
        <TestComponent />
      </SubaccountContextProvider>
    );
  };

  return { captured, rerenderProvider };
}

describe("SubaccountContextProvider approval slots", () => {
  beforeEach(() => {
    chainState.current = { chainId: CHAIN_ID, srcChainId: undefined };
    onchainState.current = createOnchainData();
    seedConfig();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("reads the approval of the current signing context and re-resolves it on a context switch", () => {
    seedSlot(SOURCE_BASE_MAINNET, createApproval({ signatureChainId: SOURCE_BASE_MAINNET }));
    chainState.current = { chainId: CHAIN_ID, srcChainId: SOURCE_BASE_MAINNET };

    const { captured, rerenderProvider } = setup();

    expect(captured.current.subaccount?.signedApproval.signatureChainId).toBe(SOURCE_BASE_MAINNET);
    expect(captured.current.subaccount?.signerChainId).toBe(SOURCE_BASE_MAINNET);

    chainState.current = { chainId: CHAIN_ID, srcChainId: SOURCE_BSC_MAINNET };
    rerenderProvider();

    expect(captured.current.subaccount?.signerChainId).toBe(SOURCE_BSC_MAINNET);
    expect(captured.current.subaccount?.signedApproval.signatureChainId).toBe(SOURCE_BASE_MAINNET);
  });

  it("does not attach another context's approval once the subaccount is active on-chain", () => {
    seedSlot(SOURCE_BASE_MAINNET, createApproval({ signatureChainId: SOURCE_BASE_MAINNET }));
    onchainState.current = createOnchainData({ active: true });
    chainState.current = { chainId: CHAIN_ID, srcChainId: SOURCE_BSC_MAINNET };

    const { captured } = setup();

    expect(captured.current.subaccount).toBeDefined();
    expect(captured.current.subaccount?.signedApproval.signature).toBe(ZERO_DATA);
  });

  it("migrates a source-context approval out of the legacy single slot on mount", () => {
    seedSlot(undefined, createApproval({ signatureChainId: SOURCE_BASE_MAINNET }));
    chainState.current = { chainId: CHAIN_ID, srcChainId: SOURCE_BASE_MAINNET };

    const { captured } = setup();

    expect(readSlot(SOURCE_BASE_MAINNET)?.signatureChainId).toBe(SOURCE_BASE_MAINNET);
    expect(localStorage.getItem(approvalSlotKey(undefined))).toBeNull();
    expect(captured.current.subaccount?.signedApproval.signatureChainId).toBe(SOURCE_BASE_MAINNET);
  });

  it("keeps a settlement-context approval in the legacy slot on mount", () => {
    const settlementApproval = createApproval({
      signatureChainId: ARBITRUM,
      subaccountRouterAddress: gelatoRouterAddress,
      nonce: 5n,
    });
    seedSlot(undefined, settlementApproval);

    const { captured } = setup();

    expect(readSlot(undefined)?.signatureChainId).toBe(ARBITRUM);
    expect(captured.current.subaccount?.signedApproval.signatureChainId).toBe(ARBITRUM);
  });

  it("re-signing for the current context writes into its own slot and keeps the other context's approval", async () => {
    seedSlot(SOURCE_BASE_MAINNET, createApproval({ signatureChainId: SOURCE_BASE_MAINNET, signedAt: 1000 }));
    chainState.current = { chainId: CHAIN_ID, srcChainId: SOURCE_BSC_MAINNET };

    const bscApproval = createApproval({ signatureChainId: SOURCE_BSC_MAINNET, signedAt: 2000 });
    mocks.signUpdatedSubaccountSettings.mockResolvedValue(bscApproval);

    const { captured } = setup();

    expect(captured.current.subaccount?.signedApproval.signatureChainId).toBe(SOURCE_BASE_MAINNET);

    let result: boolean | undefined;
    await act(async () => {
      result = await captured.current.updateSubaccountSettings({});
    });

    expect(result).toBe(true);
    expect(readSlot(SOURCE_BSC_MAINNET)?.signatureChainId).toBe(SOURCE_BSC_MAINNET);
    expect(readSlot(SOURCE_BASE_MAINNET)?.signatureChainId).toBe(SOURCE_BASE_MAINNET);
    expect(captured.current.subaccount?.signedApproval.signatureChainId).toBe(SOURCE_BSC_MAINNET);
    expect(mocks.requestTokenApprovals).toHaveBeenCalledWith("OneClickReauth");
  });

  it("ignores stored approvals of another subaccount address", () => {
    seedSlot(
      SOURCE_BASE_MAINNET,
      createApproval({ signatureChainId: SOURCE_BASE_MAINNET, subaccount: OLD_SUBACCOUNT_ADDRESS })
    );
    chainState.current = { chainId: CHAIN_ID, srcChainId: SOURCE_BASE_MAINNET };

    const { captured } = setup();

    expect(captured.current.subaccount).toBeUndefined();
  });
});
