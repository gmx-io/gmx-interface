import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "lib/monkeyPatching";
import { getSubaccountConfigKey } from "config/localStorage";

import { SubaccountContextProvider, useSubaccountContext } from "./SubaccountContextProvider";
import type { SubaccountState } from "./SubaccountContextProvider";

const { mocks, permitsState, ACCOUNT, CHAIN_ID, SUBACCOUNT_ADDRESS, OLD_SUBACCOUNT_ADDRESS, USDC, WETH } = vi.hoisted(
  () => ({
    mocks: {
      generateSubaccount: vi.fn(),
      getInitialSubaccountApproval: vi.fn(),
      refreshSubaccountData: vi.fn(),
      pushError: vi.fn(),
      getActivationPermitTokenAddresses: vi.fn(),
      signActivationTokenPermits: vi.fn(),
      srcChainId: undefined as number | undefined,
      isGmxAccount: false,
    },
    permitsState: {
      tokenPermits: [],
      accountType: "eoa",
      getIsPermitAvailable: () => true,
      addTokenPermit: async () => undefined,
      disableTokenPermits: () => undefined,
    },
    ACCOUNT: "0x1234567890123456789012345678901234567890",
    CHAIN_ID: 42161,
    SUBACCOUNT_ADDRESS: "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa",
    OLD_SUBACCOUNT_ADDRESS: "0xBbbBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbbBBbB",
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  })
);

vi.mock("context/SyntheticsStateContext/selectors/expressSelectors", () => ({
  selectExpressGlobalParams: () => undefined,
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
  useTokenPermitsContext: () => permitsState,
}));

vi.mock("domain/synthetics/subaccount/activationTokenPermits", () => ({
  getActivationPermitTokenAddresses: mocks.getActivationPermitTokenAddresses,
  signActivationTokenPermits: mocks.signActivationTokenPermits,
}));

vi.mock("domain/synthetics/subaccount", () => ({
  removeSubaccountExpressTxn: vi.fn(),
  removeSubaccountWalletTxn: vi.fn(),
}));

vi.mock("domain/synthetics/subaccount/generateSubaccount", () => ({
  generateSubaccount: mocks.generateSubaccount,
}));

vi.mock("domain/synthetics/subaccount/useSubaccountOnchainData", () => ({
  useSubaccountOnchainData: () => ({
    subaccountData: undefined,
    refreshSubaccountData: mocks.refreshSubaccountData,
  }),
}));

vi.mock("domain/synthetics/subaccount/utils", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getActualApproval: vi.fn(),
  getInitialSubaccountApproval: mocks.getInitialSubaccountApproval,
  getIsSubaccountActive: vi.fn(() => false),
  getSubaccountSigner: vi.fn(),
  signUpdatedSubaccountSettings: vi.fn(),
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

vi.mock("lib/wallets/useWallet", () => ({
  default: () => ({ account: ACCOUNT }),
}));

vi.mock("lib/wallets/useWalletSessionChains", () => ({
  getIsContractAccount: async () => false,
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

function getStoredValues(): string[] {
  return Array.from({ length: localStorage.length }, (_, index) =>
    String(localStorage.getItem(localStorage.key(index) ?? "") ?? "")
  );
}

const generatedConfig = {
  address: SUBACCOUNT_ADDRESS,
  privateKey: "encrypted-private-key",
  isNew: true,
};

const signedApproval = {
  subaccount: SUBACCOUNT_ADDRESS,
  shouldAdd: true,
  expiresAt: 1000000n,
  maxAllowedCount: 10n,
  actionType: "0xaction",
  nonce: 0n,
  deadline: 1000000n,
  desChainId: 42161n,
  signature: "0xsignature",
  signedAt: 1700000000000,
  integrationId: "0x0",
  subaccountRouterAddress: "0x0000000000000000000000000000000000000001",
  signatureChainId: 42161,
};

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
    mocks.generateSubaccount.mockResolvedValue(generatedConfig);
    mocks.getInitialSubaccountApproval.mockRejectedValue(new Error("User rejected the request."));
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("resets the stored config when the approval signature is rejected for a freshly generated config", async () => {
    const context = setup();

    let result: boolean | undefined;
    await act(async () => {
      result = await context.current.tryEnableSubaccount();
    });

    expect(result).toBe(false);
    expect(mocks.generateSubaccount).toHaveBeenCalledTimes(1);
    expect(mocks.getInitialSubaccountApproval).toHaveBeenCalledTimes(1);

    expect(context.current.subaccountConfig).toBeUndefined();
    expect(context.current.subaccount).toBeUndefined();
    expect(localStorage.getItem(configKey) ?? "").not.toContain(SUBACCOUNT_ADDRESS);
  });

  it("keeps a pre-existing stored config when the approval signature is rejected", async () => {
    const storedConfig = JSON.stringify({
      address: OLD_SUBACCOUNT_ADDRESS,
      privateKey: "encrypted-old-key",
    });
    localStorage.setItem(configKey, storedConfig);

    const context = setup();

    let result: boolean | undefined;
    await act(async () => {
      result = await context.current.tryEnableSubaccount();
    });

    expect(result).toBe(false);
    expect(mocks.generateSubaccount).not.toHaveBeenCalled();
    expect(localStorage.getItem(configKey)).toBe(storedConfig);
    expect(context.current.subaccountConfig?.address).toBe(OLD_SUBACCOUNT_ADDRESS);
  });

  it("stores nothing when the subaccount generation signature is rejected", async () => {
    mocks.generateSubaccount.mockRejectedValue(new Error("User rejected the request."));

    const context = setup();

    let result: boolean | undefined;
    await act(async () => {
      result = await context.current.tryEnableSubaccount();
    });

    expect(result).toBe(false);
    expect(mocks.getInitialSubaccountApproval).not.toHaveBeenCalled();
    expect(localStorage.getItem(configKey)).toBeNull();
    expect(context.current.subaccountConfig).toBeUndefined();
  });

  it("enables successfully on retry from a clean state after a rejected approval signature", async () => {
    mocks.getInitialSubaccountApproval
      .mockRejectedValueOnce(new Error("User rejected the request."))
      .mockResolvedValue(signedApproval);

    const context = setup();

    let firstResult: boolean | undefined;
    await act(async () => {
      firstResult = await context.current.tryEnableSubaccount();
    });

    expect(firstResult).toBe(false);
    expect(context.current.subaccountConfig).toBeUndefined();

    let secondResult: boolean | undefined;
    await act(async () => {
      secondResult = await context.current.tryEnableSubaccount();
    });

    expect(secondResult).toBe(true);
    expect(mocks.generateSubaccount).toHaveBeenCalledTimes(2);
    expect(context.current.subaccountConfig?.address).toBe(SUBACCOUNT_ADDRESS);
    expect(localStorage.getItem(configKey)).toContain(SUBACCOUNT_ADDRESS);
    expect(getStoredValues().some((value) => value.includes("0xsignature"))).toBe(true);
  });
});

describe("SubaccountContextProvider.tryEnableSubaccount token permits", () => {
  const ROUTER = "0x7452c558d45f8afC8c83dAe62C3f8A5BE19c71f6";

  beforeEach(() => {
    mocks.srcChainId = undefined;
    mocks.isGmxAccount = false;
    mocks.generateSubaccount.mockResolvedValue(generatedConfig);
    mocks.getInitialSubaccountApproval.mockResolvedValue(signedApproval);
    mocks.getActivationPermitTokenAddresses.mockResolvedValue([WETH, USDC]);
    mocks.signActivationTokenPermits.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  async function enable(params?: { withTokenPermits?: boolean }) {
    const context = setup();

    let result: boolean | undefined;
    await act(async () => {
      result = await context.current.tryEnableSubaccount(params);
    });

    return { context, result };
  }

  it("signs permits for the wallet's tokens after the activation signatures", async () => {
    const { result } = await enable();

    expect(result).toBe(true);
    expect(mocks.getActivationPermitTokenAddresses).toHaveBeenCalledWith(
      expect.objectContaining({
        chainId: CHAIN_ID,
        account: ACCOUNT,
        spender: ROUTER,
        gasPaymentTokenAddress: WETH,
        tokenPermits: permitsState.tokenPermits,
        getIsPermitAvailable: permitsState.getIsPermitAvailable,
      })
    );
    expect(mocks.signActivationTokenPermits).toHaveBeenCalledWith({
      chainId: CHAIN_ID,
      spender: ROUTER,
      tokenAddresses: [WETH, USDC],
      accountType: "eoa",
      addTokenPermit: permitsState.addTokenPermit,
      disableTokenPermits: permitsState.disableTokenPermits,
    });
    expect(mocks.getInitialSubaccountApproval.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.signActivationTokenPermits.mock.invocationCallOrder[0]
    );
  });

  it("activates without waiting for the permit prompts", async () => {
    mocks.signActivationTokenPermits.mockReturnValue(new Promise(() => undefined));

    const { result } = await enable();

    expect(result).toBe(true);
    expect(mocks.signActivationTokenPermits).toHaveBeenCalled();
  });

  it("asks for no permits when the caller opts out", async () => {
    const { result } = await enable({ withTokenPermits: false });

    expect(result).toBe(true);
    expect(mocks.getActivationPermitTokenAddresses).not.toHaveBeenCalled();
  });

  it("still activates when the permit step fails", async () => {
    mocks.getActivationPermitTokenAddresses.mockRejectedValue(new Error("rpc unavailable"));

    const { result } = await enable();

    expect(result).toBe(true);
    expect(mocks.signActivationTokenPermits).not.toHaveBeenCalled();
    expect(mocks.pushError).toHaveBeenCalledWith(expect.any(Error), "subaccount.activationTokenPermits");
    expect(getStoredValues().some((value) => value.includes("0xsignature"))).toBe(true);
  });

  it("asks for no permits when the approval signature is rejected", async () => {
    mocks.getInitialSubaccountApproval.mockRejectedValue(new Error("User rejected the request."));

    const { result } = await enable();

    expect(result).toBe(false);
    expect(mocks.getActivationPermitTokenAddresses).not.toHaveBeenCalled();
  });

  it("leaves GMX Account activation without permits", async () => {
    mocks.isGmxAccount = true;

    const { result } = await enable();

    expect(result).toBe(true);
    expect(mocks.getActivationPermitTokenAddresses).not.toHaveBeenCalled();
  });

  it("leaves multichain activation without permits", async () => {
    mocks.srcChainId = 8453;

    const { result } = await enable();

    expect(result).toBe(true);
    expect(mocks.getActivationPermitTokenAddresses).not.toHaveBeenCalled();
  });
});
