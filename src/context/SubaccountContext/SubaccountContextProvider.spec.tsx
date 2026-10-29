import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "lib/monkeyPatching";
import { getLegacySubaccountConfigKey, getSubaccountApprovalKey, getSubaccountConfigKey } from "config/localStorage";

import { SubaccountContextProvider, useSubaccountContext } from "./SubaccountContextProvider";
import type { SubaccountState } from "./SubaccountContextProvider";

const { mocks, onchainState, ACCOUNT, CHAIN_ID, LEGACY_SUBACCOUNT_ADDRESS, WETH } = vi.hoisted(() => ({
  mocks: {
    getInitialSubaccountApproval: vi.fn(),
    signUpdatedSubaccountSettings: vi.fn(),
    refreshSubaccountData: vi.fn(),
    pushError: vi.fn(),
    getActivationPermitTokenAddresses: vi.fn(),
    signActivationTokenPermits: vi.fn(),
    srcChainId: undefined as number | undefined,
    isGmxAccount: false,
  },
  onchainState: {
    current: undefined as
      | {
          active: boolean;
          maxAllowedCount: bigint;
          currentActionsCount: bigint;
          expiresAt: bigint;
          approvalNonce: bigint;
          multichainApprovalNonce: bigint;
          integrationId: string;
        }
      | undefined,
  },
  ACCOUNT: "0x1234567890123456789012345678901234567890",
  CHAIN_ID: 42161,
  LEGACY_SUBACCOUNT_ADDRESS: "0xBbbBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbbBBbB",
  WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
}));

vi.mock("context/SyntheticsStateContext/selectors/expressSelectors", () => ({
  selectExpressGlobalParams: () => undefined,
  selectSettlementChainExpressGlobalParams: () => undefined,
  selectGmxAccountGasPaymentToken: () => undefined,
}));

vi.mock("context/SyntheticsStateContext/selectors/tradeboxSelectors", () => ({
  selectTradeboxIsFromTokenGmxAccount: () => mocks.isGmxAccount,
}));

vi.mock("context/SyntheticsStateContext/selectors/settingsSelectors", () => ({
  selectGasPaymentTokenAddress: () => WETH,
}));

vi.mock("context/SyntheticsStateContext/utils", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useCalcSelector: () => (selector: () => unknown) => selector(),
}));

vi.mock("context/TokenPermitsContext/TokenPermitsContextProvider", () => ({
  useTokenPermitsContext: () => ({}),
}));

vi.mock("domain/synthetics/subaccount/activationTokenPermits", () => ({
  getActivationPermitTokenAddresses: mocks.getActivationPermitTokenAddresses,
  signActivationTokenPermits: mocks.signActivationTokenPermits,
}));

vi.mock("domain/synthetics/subaccount", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getIsSubaccountActiveOnchain: vi.fn(async () => false),
  getIsSubaccountRemovalRequired: vi.fn(async () => false),
  removeSubaccountExpressTxn: vi.fn(),
  removeSubaccountWalletTxn: vi.fn(),
}));

vi.mock("domain/synthetics/subaccount/useSubaccountOnchainData", () => ({
  useSubaccountOnchainData: () => ({
    subaccountData: onchainState.current,
    refreshSubaccountData: mocks.refreshSubaccountData,
  }),
}));

vi.mock("domain/synthetics/subaccount/utils", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getInitialSubaccountApproval: mocks.getInitialSubaccountApproval,
  getSubaccountOnchainData: vi.fn(async () => {
    throw new Error("no RPC in tests");
  }),
  getSubaccountSigner: vi.fn(() => ({})),
  signUpdatedSubaccountSettings: mocks.signUpdatedSubaccountSettings,
}));

vi.mock("lib/chains", () => ({
  useChainId: () => ({ chainId: CHAIN_ID, srcChainId: mocks.srcChainId }),
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
    pushError: mocks.pushError,
  },
}));

vi.mock("lib/rpc", () => ({
  useJsonRpcProvider: () => ({ provider: {} }),
}));

vi.mock("lib/wallets/useEthersSigner", () => ({
  useEthersSigner: () => ({ address: ACCOUNT, provider: {} }),
}));

vi.mock("lib/wallets/useWalletSessionChains", () => ({
  getIsContractAccount: async () => false,
}));

vi.mock("lib/wallets/useWallet", () => ({
  default: () => ({ account: ACCOUNT }),
}));

vi.mock("lib/wallets/walletConfig", () => ({
  getPublicClientWithRpc: () => ({}),
}));

vi.mock("components/StatusNotification/StatusNotification", () => ({
  StatusNotification: () => null,
}));

vi.mock("components/TransactionStatus/TransactionStatus", () => ({
  TransactionStatus: () => null,
}));

const configKey = JSON.stringify(getSubaccountConfigKey(CHAIN_ID, ACCOUNT));
const legacyConfigKey = JSON.stringify(getLegacySubaccountConfigKey(CHAIN_ID, ACCOUNT));
const approvalKey = JSON.stringify(getSubaccountApprovalKey(CHAIN_ID, ACCOUNT, undefined));

const NOW = Math.floor(Date.now() / 1000);

const legacyConfig = {
  address: LEGACY_SUBACCOUNT_ADDRESS,
  privateKey: "encrypted-signature-derived-key",
  isNew: true,
};

function approvalFor(subaccount: string) {
  return {
    subaccount,
    shouldAdd: true,
    expiresAt: BigInt(NOW + 86400),
    maxAllowedCount: 10n,
    actionType: "0xaction",
    nonce: 0n,
    deadline: BigInt(NOW + 86400),
    desChainId: 42161n,
    signature: `0xsigned-for-${subaccount}`,
    signedAt: 1700000000000,
    integrationId: "0x0000000000000000000000000000000000000000000000000000000000000000",
    subaccountRouterAddress: "0x0000000000000000000000000000000000000001",
    signatureChainId: 42161,
  };
}

function readStoredConfig(): { address: string; version?: number } | undefined {
  const raw = localStorage.getItem(configKey);
  return raw ? JSON.parse(raw) : undefined;
}

function readStoredApprovalSubaccount(): string | undefined {
  const raw = localStorage.getItem(approvalKey);
  return raw ? JSON.parse(raw).subaccount : undefined;
}

function setup() {
  const captured: { current: SubaccountState } = { current: undefined as unknown as SubaccountState };

  function TestComponent() {
    captured.current = useSubaccountContext();
    return null;
  }

  render(
    <SubaccountContextProvider>
      <TestComponent />
    </SubaccountContextProvider>
  );

  return captured;
}

describe("SubaccountContextProvider.tryEnableSubaccount", () => {
  beforeEach(() => {
    onchainState.current = undefined;
    mocks.getInitialSubaccountApproval.mockImplementation(async ({ subaccountAddress }) =>
      approvalFor(subaccountAddress)
    );
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("stores neither a key nor an approval when the approval signature is rejected", async () => {
    mocks.getInitialSubaccountApproval.mockRejectedValue(new Error("User rejected the request."));

    const context = setup();

    let result: boolean | undefined;
    await act(async () => {
      result = await context.current.tryEnableSubaccount();
    });

    expect(result).toBe(false);
    expect(localStorage.getItem(configKey)).toBeNull();
    expect(localStorage.getItem(approvalKey)).toBeNull();
    expect(context.current.subaccountConfig).toBeUndefined();
  });

  it("enables on retry after a rejected approval signature", async () => {
    mocks.getInitialSubaccountApproval.mockRejectedValueOnce(new Error("User rejected the request."));

    const context = setup();

    await act(async () => {
      await context.current.tryEnableSubaccount();
    });

    let result: boolean | undefined;
    await act(async () => {
      result = await context.current.tryEnableSubaccount();
    });

    expect(result).toBe(true);
    expect(readStoredConfig()?.version).toBe(2);
    expect(readStoredApprovalSubaccount()).toBe(readStoredConfig()?.address);
    expect(context.current.subaccountConfig?.address).toBe(readStoredConfig()?.address);
  });

  it("approves a new address every time One-Click is turned on after being turned off PRO-4458", async () => {
    onchainState.current = {
      active: false,
      maxAllowedCount: 0n,
      currentActionsCount: 0n,
      expiresAt: 0n,
      approvalNonce: 0n,
      multichainApprovalNonce: 0n,
      integrationId: "0x0000000000000000000000000000000000000000000000000000000000000000",
    };

    const context = setup();

    await act(async () => {
      await context.current.tryEnableSubaccount();
    });

    const firstAddress = readStoredConfig()?.address;

    let isDisabled: boolean | undefined;
    await act(async () => {
      isDisabled = await context.current.tryDisableSubaccount();
    });

    expect(isDisabled).toBe(true);

    expect(localStorage.getItem(configKey)).toBeNull();

    await act(async () => {
      await context.current.tryEnableSubaccount();
    });

    const secondAddress = readStoredConfig()?.address;

    expect(firstAddress).toBeDefined();
    expect(secondAddress).toBeDefined();
    expect(secondAddress).not.toBe(firstAddress);
    expect(readStoredApprovalSubaccount()).toBe(secondAddress);
  });

  it.each([
    {
      name: "enable while the legacy session is not listed",
      onchain: { active: false, expiresAt: 0n, maxAllowedCount: 0n, currentActionsCount: 0n },
      run: (context: SubaccountState) => context.tryEnableSubaccount(),
    },
    {
      name: "Re-enable after the legacy session expired",
      onchain: { active: true, expiresAt: BigInt(NOW - 86400 * 30), maxAllowedCount: 90n, currentActionsCount: 5n },
      run: (context: SubaccountState) =>
        context.updateSubaccountSettings({ nextRemainigActions: 400n, nextRemainingSeconds: 86400n * 30n }),
    },
    {
      name: "Re-enable after the legacy session reached the action limit",
      onchain: { active: true, expiresAt: BigInt(NOW + 86400), maxAllowedCount: 90n, currentActionsCount: 90n },
      run: (context: SubaccountState) =>
        context.updateSubaccountSettings({ nextRemainigActions: 400n, nextRemainingSeconds: 86400n * 30n }),
    },
    {
      name: "settings change on a usable legacy session",
      onchain: { active: true, expiresAt: BigInt(NOW + 86400), maxAllowedCount: 90n, currentActionsCount: 5n },
      run: (context: SubaccountState) => context.updateSubaccountSettings({ nextRemainigActions: 50n }),
    },
  ])("never approves a stored key derived from a signature: $name PRO-4458", async ({ onchain, run }) => {
    localStorage.setItem(configKey, JSON.stringify(legacyConfig));
    localStorage.setItem(
      approvalKey,
      JSON.stringify({
        ...approvalFor(LEGACY_SUBACCOUNT_ADDRESS),
        expiresAt: "1",
        deadline: "1",
        nonce: "0",
        maxAllowedCount: "1",
        desChainId: "42161",
      })
    );
    onchainState.current = {
      ...onchain,
      approvalNonce: 0n,
      multichainApprovalNonce: 0n,
      integrationId: "0x0000000000000000000000000000000000000000000000000000000000000000",
    };

    const context = setup();

    expect(context.current.subaccount?.signedApproval.signature).not.toBe(`0xsigned-for-${LEGACY_SUBACCOUNT_ADDRESS}`);

    let result: boolean | undefined;
    await act(async () => {
      result = await run(context.current);
    });

    expect(result).toBe(true);
    expect(mocks.signUpdatedSubaccountSettings).not.toHaveBeenCalled();
    expect(readStoredConfig()?.version).toBe(2);
    expect(readStoredConfig()?.address).not.toBe(LEGACY_SUBACCOUNT_ADDRESS);
    expect(readStoredApprovalSubaccount()).toBe(readStoredConfig()?.address);
    expect(JSON.parse(localStorage.getItem(legacyConfigKey) ?? "{}").address).toBe(LEGACY_SUBACCOUNT_ADDRESS);
  });
});

describe("SubaccountContextProvider.tryEnableSubaccount token permits", () => {
  const ROUTER = "0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6";

  beforeEach(() => {
    onchainState.current = undefined;
    mocks.getInitialSubaccountApproval.mockImplementation(async ({ subaccountAddress }) =>
      approvalFor(subaccountAddress)
    );
    mocks.getActivationPermitTokenAddresses.mockResolvedValue([WETH]);
    // never settles, so a resolved activation proves the permit prompts aren't awaited
    mocks.signActivationTokenPermits.mockReturnValue(new Promise(() => undefined));
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it.each([
    { name: "after the activation signatures", result: true, asksPermits: true },
    { name: "unless the caller opts out", withTokenPermits: false, result: true, asksPermits: false },
    { name: "unless the approval signature is rejected", isApprovalRejected: true, result: false, asksPermits: false },
    { name: "unless trading from the GMX Account", isGmxAccount: true, result: true, asksPermits: false },
    { name: "unless on multichain", srcChainId: 8453, result: true, asksPermits: false },
  ])(
    "asks for token permits $name",
    async ({ withTokenPermits, isApprovalRejected, isGmxAccount, srcChainId, result, asksPermits }) => {
      mocks.isGmxAccount = isGmxAccount ?? false;
      mocks.srcChainId = srcChainId;
      if (isApprovalRejected) {
        mocks.getInitialSubaccountApproval.mockRejectedValue(new Error("User rejected the request."));
      }

      const context = setup();
      let enabled: boolean | undefined;
      await act(async () => {
        enabled = await context.current.tryEnableSubaccount({ withTokenPermits });
      });

      expect(enabled).toBe(result);
      expect(mocks.getActivationPermitTokenAddresses.mock.calls).toEqual(
        asksPermits ? [[expect.objectContaining({ spender: ROUTER, gasPaymentTokenAddress: WETH })]] : []
      );
      expect(mocks.signActivationTokenPermits.mock.calls).toEqual(
        asksPermits ? [[expect.objectContaining({ spender: ROUTER, tokenAddresses: [WETH] })]] : []
      );
    }
  );
});
