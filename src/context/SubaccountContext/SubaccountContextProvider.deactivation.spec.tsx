import { act, cleanup, render } from "@testing-library/react";
import { type Abi, encodeErrorResult } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "lib/monkeyPatching";
import { getSubaccountConfigKey } from "config/localStorage";
import {
  SubaccountRemovalRelayFailedError,
  SubaccountRemovalResultUnknownError,
} from "domain/synthetics/subaccount/errors";
import { abis } from "sdk/abis";
import { ExpressEstimationInsufficientGasPaymentTokenBalanceError, GmxRelayError } from "sdk/utils/express";

import {
  SubaccountContextProvider,
  SubaccountDeactivationFailureReason,
  SubaccountDeactivationState,
  useSubaccountContext,
} from "./SubaccountContextProvider";
import type { SubaccountState } from "./SubaccountContextProvider";

const { mocks, chainState, ACCOUNT, CHAIN_ID, SRC_CHAIN_ID, SUBACCOUNT_ADDRESS, WETH } = vi.hoisted(() => ({
  mocks: {
    getIsSubaccountRemovalRequired: vi.fn(),
    removeSubaccountExpressTxn: vi.fn(),
    removeSubaccountWalletTxn: vi.fn(),
    estimateSettlementChainRemoveSubaccountExpressParams: vi.fn(),
    removeSubaccountSettlementChainExpressTxn: vi.fn(),
    selectExpressGlobalParams: vi.fn(),
    selectSettlementChainExpressGlobalParams: vi.fn(),
    selectIsSubaccountRelayRouterEnabled: vi.fn(),
    selectGmxAccountGasPaymentToken: vi.fn(),
    refreshSubaccountData: vi.fn(),
    pushError: vi.fn(),
  },
  chainState: { chainId: 42161, srcChainId: undefined as number | undefined },
  ACCOUNT: "0x1234567890123456789012345678901234567890",
  CHAIN_ID: 42161,
  SRC_CHAIN_ID: 8453,
  SUBACCOUNT_ADDRESS: "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa",
  WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
}));

vi.mock("context/SyntheticsStateContext/selectors/expressSelectors", () => ({
  selectExpressGlobalParams: mocks.selectExpressGlobalParams,
  selectSettlementChainExpressGlobalParams: mocks.selectSettlementChainExpressGlobalParams,
  selectGmxAccountGasPaymentToken: mocks.selectGmxAccountGasPaymentToken,
}));

vi.mock("context/SyntheticsStateContext/selectors/globalSelectors", () => ({
  selectIsSubaccountRelayRouterEnabled: mocks.selectIsSubaccountRelayRouterEnabled,
}));

vi.mock("context/SyntheticsStateContext/selectors/tradeboxSelectors", () => ({
  selectTradeboxIsFromTokenGmxAccount: () => false,
}));

vi.mock("context/SyntheticsStateContext/utils", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useCalcSelector: () => (selector: () => unknown) => selector(),
}));

vi.mock("domain/synthetics/subaccount", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getIsSubaccountRemovalRequired: mocks.getIsSubaccountRemovalRequired,
  removeSubaccountExpressTxn: mocks.removeSubaccountExpressTxn,
  removeSubaccountWalletTxn: mocks.removeSubaccountWalletTxn,
  estimateSettlementChainRemoveSubaccountExpressParams: mocks.estimateSettlementChainRemoveSubaccountExpressParams,
  removeSubaccountSettlementChainExpressTxn: mocks.removeSubaccountSettlementChainExpressTxn,
}));

vi.mock("domain/synthetics/subaccount/generateSubaccount", () => ({
  generateSubaccount: vi.fn(),
}));

vi.mock("domain/synthetics/subaccount/useSubaccountOnchainData", () => ({
  useSubaccountOnchainData: () => ({
    subaccountData: {
      active: true,
      maxAllowedCount: 10n,
      currentActionsCount: 0n,
      expiresAt: 9999999999n,
      approvalNonce: 0n,
      multichainApprovalNonce: 0n,
      integrationId: "0x0",
    },
    refreshSubaccountData: mocks.refreshSubaccountData,
  }),
}));

vi.mock("domain/synthetics/subaccount/utils", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getActualApproval: vi.fn(() => ({ signature: "0xsignature" })),
  getInitialSubaccountApproval: vi.fn(),
  getIsSubaccountActive: vi.fn(() => true),
  getSubaccountSigner: vi.fn(() => ({})),
  signUpdatedSubaccountSettings: vi.fn(),
}));

vi.mock("lib/chains", () => ({
  useChainId: () => chainState,
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

vi.mock("components/StatusNotification/StatusNotification", () => ({
  StatusNotification: () => null,
}));

vi.mock("components/TransactionStatus/TransactionStatus", () => ({
  TransactionStatus: () => null,
}));

const configKey = JSON.stringify(getSubaccountConfigKey(CHAIN_ID, ACCOUNT));

const storedConfig = JSON.stringify({
  address: SUBACCOUNT_ADDRESS,
  privateKey: "encrypted-private-key",
  isNew: true,
});

const globalExpressParams = { gasPaymentTokenAddress: "0xGasToken" };

const settlementChainGlobalExpressParams = { chainId: CHAIN_ID, gasPaymentTokenAddress: "0xWalletGasToken" };

// the GMX Account gas payment token is USDC in these tests, so USDT marks the wallet one
const settlementChainExpressParams = { gasPaymentParams: { gasPaymentToken: { symbol: "USDT" } } };

function seedStoredSubaccount() {
  localStorage.setItem(configKey, storedConfig);
}

function getStoredValues(): string[] {
  return Array.from({ length: localStorage.length }, (_, index) =>
    String(localStorage.getItem(localStorage.key(index) ?? "") ?? "")
  );
}

function getIsSubaccountStoredLocally() {
  return getStoredValues().some((value) => value.includes(SUBACCOUNT_ADDRESS));
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

describe("SubaccountContextProvider.tryDisableSubaccount", () => {
  beforeEach(() => {
    chainState.chainId = CHAIN_ID;
    chainState.srcChainId = undefined;
    mocks.getIsSubaccountRemovalRequired.mockResolvedValue(true);
    mocks.selectExpressGlobalParams.mockReturnValue(globalExpressParams);
    mocks.selectSettlementChainExpressGlobalParams.mockReturnValue(settlementChainGlobalExpressParams);
    mocks.selectIsSubaccountRelayRouterEnabled.mockReturnValue(true);
    // the wallet can't pay the relay fee unless a test says so
    mocks.estimateSettlementChainRemoveSubaccountExpressParams.mockResolvedValue(undefined);
    mocks.selectGmxAccountGasPaymentToken.mockReturnValue({ symbol: "USDC" });
    seedStoredSubaccount();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("keeps the local subaccount state on failure so the deactivation can be retried, and completes on retry", async () => {
    mocks.removeSubaccountWalletTxn.mockRejectedValueOnce(new Error("insufficient funds for gas * price + value"));

    const context = setup();
    expect(context.current.subaccount).toBeDefined();

    const storedValuesBeforeAttempt = getStoredValues();

    let result: boolean | undefined;
    await act(async () => {
      result = await context.current.tryDisableSubaccount();
    });

    expect(result).toBe(false);
    expect(getStoredValues()).toEqual(storedValuesBeforeAttempt);
    expect(getIsSubaccountStoredLocally()).toBe(true);
    expect(context.current.subaccount).toBeDefined();
    expect(context.current.subaccountDeactivationState).toBe(SubaccountDeactivationState.Error);
    expect(context.current.subaccountDeactivationFailureReason).toBe(
      SubaccountDeactivationFailureReason.InsufficientNativeTokenBalance
    );

    mocks.removeSubaccountWalletTxn.mockResolvedValueOnce(undefined);

    let retryResult: boolean | undefined;
    await act(async () => {
      retryResult = await context.current.tryDisableSubaccount();
    });

    expect(retryResult).toBe(true);
    expect(mocks.removeSubaccountWalletTxn).toHaveBeenCalledTimes(2);
    expect(getIsSubaccountStoredLocally()).toBe(false);
    expect(context.current.subaccount).toBeUndefined();
    expect(context.current.subaccountDeactivationState).toBe(SubaccountDeactivationState.Success);
    expect(context.current.subaccountDeactivationFailureReason).toBeUndefined();
    expect(mocks.refreshSubaccountData).toHaveBeenCalled();
  });

  it("classifies a wallet rejection so the notification can suggest a retry", async () => {
    mocks.removeSubaccountWalletTxn.mockRejectedValueOnce(new Error("User rejected the request."));

    const context = setup();

    let result: boolean | undefined;
    await act(async () => {
      result = await context.current.tryDisableSubaccount();
    });

    expect(result).toBe(false);
    expect(context.current.subaccountDeactivationFailureReason).toBe(SubaccountDeactivationFailureReason.Rejected);
    expect(getIsSubaccountStoredLocally()).toBe(true);
  });

  it("resets the stored subaccount state after a successful removal", async () => {
    mocks.removeSubaccountWalletTxn.mockResolvedValueOnce(undefined);

    const context = setup();

    let result: boolean | undefined;
    await act(async () => {
      result = await context.current.tryDisableSubaccount();
    });

    expect(result).toBe(true);
    expect(mocks.removeSubaccountWalletTxn).toHaveBeenCalledWith(CHAIN_ID, expect.anything(), SUBACCOUNT_ADDRESS);
    expect(getIsSubaccountStoredLocally()).toBe(false);
    expect(context.current.subaccountDeactivationState).toBe(SubaccountDeactivationState.Success);
  });

  it("drops the local state without a transaction when there is nothing to remove on-chain, even while the express params are not ready (multichain)", async () => {
    chainState.srcChainId = SRC_CHAIN_ID;
    mocks.selectExpressGlobalParams.mockReturnValue(undefined);
    mocks.getIsSubaccountRemovalRequired.mockResolvedValue(false);

    const context = setup();

    let result: boolean | undefined;
    await act(async () => {
      result = await context.current.tryDisableSubaccount();
    });

    expect(result).toBe(true);
    expect(mocks.getIsSubaccountRemovalRequired).toHaveBeenCalledWith(
      expect.objectContaining({
        chainId: CHAIN_ID,
        account: ACCOUNT,
        subaccount: expect.objectContaining({ address: SUBACCOUNT_ADDRESS }),
      })
    );
    expect(mocks.removeSubaccountExpressTxn).not.toHaveBeenCalled();
    expect(mocks.removeSubaccountWalletTxn).not.toHaveBeenCalled();
    expect(getIsSubaccountStoredLocally()).toBe(false);
    expect(context.current.subaccount).toBeUndefined();
    expect(context.current.subaccountDeactivationState).toBe(SubaccountDeactivationState.Success);
    expect(context.current.subaccountDeactivationFailureReason).toBeUndefined();
    expect(mocks.refreshSubaccountData).toHaveBeenCalled();
  });

  it("fails with an error state instead of hanging in the deactivating state when express params are not ready (multichain)", async () => {
    chainState.srcChainId = SRC_CHAIN_ID;
    mocks.selectExpressGlobalParams.mockReturnValue(undefined);

    const context = setup();

    let result: boolean | undefined;
    await act(async () => {
      result = await context.current.tryDisableSubaccount();
    });

    expect(result).toBe(false);
    expect(mocks.removeSubaccountExpressTxn).not.toHaveBeenCalled();
    expect(context.current.subaccountDeactivationState).toBe(SubaccountDeactivationState.Error);
    expect(context.current.subaccountDeactivationFailureReason).toBe(
      SubaccountDeactivationFailureReason.ExpressParamsNotReady
    );
    expect(getIsSubaccountStoredLocally()).toBe(true);
  });

  it("keeps the local state and asks for a retry when the relay result could not be confirmed (multichain)", async () => {
    chainState.srcChainId = SRC_CHAIN_ID;
    mocks.removeSubaccountExpressTxn.mockRejectedValueOnce(
      new SubaccountRemovalResultUnknownError("task-1", new Error("Timeout waiting for terminal status"))
    );

    const context = setup();

    let result: boolean | undefined;
    await act(async () => {
      result = await context.current.tryDisableSubaccount();
    });

    expect(result).toBe(false);
    expect(context.current.subaccountDeactivationState).toBe(SubaccountDeactivationState.Error);
    expect(context.current.subaccountDeactivationFailureReason).toBe(SubaccountDeactivationFailureReason.ResultUnknown);
    expect(mocks.refreshSubaccountData).toHaveBeenCalled();
    expect(getIsSubaccountStoredLocally()).toBe(true);
  });

  it("classifies an insufficient gas payment token balance failure of the express removal (multichain)", async () => {
    chainState.srcChainId = SRC_CHAIN_ID;
    mocks.removeSubaccountExpressTxn.mockRejectedValueOnce(
      new ExpressEstimationInsufficientGasPaymentTokenBalanceError({ balance: 0n, requiredAmount: 100n })
    );

    const context = setup();

    let result: boolean | undefined;
    await act(async () => {
      result = await context.current.tryDisableSubaccount();
    });

    expect(result).toBe(false);
    expect(mocks.removeSubaccountExpressTxn).toHaveBeenCalledWith(
      expect.objectContaining({
        chainId: CHAIN_ID,
        account: ACCOUNT,
        srcChainId: SRC_CHAIN_ID,
        globalExpressParams,
      })
    );
    expect(context.current.subaccountDeactivationState).toBe(SubaccountDeactivationState.Error);
    expect(context.current.subaccountDeactivationFailureReason).toBe(
      SubaccountDeactivationFailureReason.InsufficientGasPaymentTokenBalance
    );
    expect(context.current.subaccountDeactivationFailureTokenSymbol).toBe("USDC");
    expect(getIsSubaccountStoredLocally()).toBe(true);
  });

  it("names the token from an InsufficientMultichainBalance revert over the selected gas token (multichain)", async () => {
    chainState.srcChainId = SRC_CHAIN_ID;
    const revertData = encodeErrorResult({
      abi: abis.CustomErrors as Abi,
      errorName: "InsufficientMultichainBalance",
      args: [ACCOUNT, WETH, 0n, 1n],
    });
    mocks.removeSubaccountExpressTxn.mockRejectedValueOnce(new Error(`data="${revertData}"`));

    const context = setup();

    let result: boolean | undefined;
    await act(async () => {
      result = await context.current.tryDisableSubaccount();
    });

    expect(result).toBe(false);
    expect(context.current.subaccountDeactivationState).toBe(SubaccountDeactivationState.Error);
    expect(context.current.subaccountDeactivationFailureReason).toBe(
      SubaccountDeactivationFailureReason.InsufficientGasPaymentTokenBalance
    );
    expect(context.current.subaccountDeactivationFailureTokenSymbol).toBe("WETH");
    expect(getIsSubaccountStoredLocally()).toBe(true);
  });

  it("turns One-Click off with a signature and no transaction when the wallet gas payment token can pay the relay fee", async () => {
    mocks.estimateSettlementChainRemoveSubaccountExpressParams.mockResolvedValue(settlementChainExpressParams);
    mocks.removeSubaccountSettlementChainExpressTxn.mockResolvedValueOnce(undefined);

    const context = setup();

    let result: boolean | undefined;
    await act(async () => {
      result = await context.current.tryDisableSubaccount();
    });

    expect(result).toBe(true);
    expect(mocks.estimateSettlementChainRemoveSubaccountExpressParams).toHaveBeenCalledWith(
      expect.objectContaining({
        chainId: CHAIN_ID,
        account: ACCOUNT,
        subaccount: expect.objectContaining({ address: SUBACCOUNT_ADDRESS }),
        globalExpressParams: settlementChainGlobalExpressParams,
      })
    );
    expect(mocks.removeSubaccountSettlementChainExpressTxn).toHaveBeenCalledWith(
      expect.objectContaining({
        chainId: CHAIN_ID,
        subaccount: expect.objectContaining({ address: SUBACCOUNT_ADDRESS }),
        expressParams: settlementChainExpressParams,
      })
    );
    expect(mocks.removeSubaccountWalletTxn).not.toHaveBeenCalled();
    expect(getIsSubaccountStoredLocally()).toBe(false);
    expect(context.current.subaccountDeactivationState).toBe(SubaccountDeactivationState.Success);
  });

  it("sends the transaction directly, without a signature first, when the wallet gas payment token can't pay the relay fee", async () => {
    mocks.removeSubaccountWalletTxn.mockResolvedValueOnce(undefined);

    const context = setup();

    let result: boolean | undefined;
    await act(async () => {
      result = await context.current.tryDisableSubaccount();
    });

    expect(result).toBe(true);
    expect(mocks.estimateSettlementChainRemoveSubaccountExpressParams).toHaveBeenCalledTimes(1);
    expect(mocks.removeSubaccountSettlementChainExpressTxn).not.toHaveBeenCalled();
    expect(mocks.removeSubaccountWalletTxn).toHaveBeenCalledWith(CHAIN_ID, expect.anything(), SUBACCOUNT_ADDRESS);
    expect(context.current.subaccountDeactivationState).toBe(SubaccountDeactivationState.Success);
  });

  it.each([
    [
      "the express params are not ready",
      () => mocks.selectSettlementChainExpressGlobalParams.mockReturnValue(undefined),
    ],
    [
      "the express params belong to another chain",
      () => mocks.selectSettlementChainExpressGlobalParams.mockReturnValue({ chainId: 43114 }),
    ],
    [
      "the subaccount relay router is disabled",
      () => mocks.selectIsSubaccountRelayRouterEnabled.mockReturnValue(false),
    ],
    [
      "the signed request can't be prepared",
      () => mocks.estimateSettlementChainRemoveSubaccountExpressParams.mockRejectedValue(new Error("rpc error")),
    ],
  ])("sends the transaction when %s", async (_, arrange) => {
    arrange();
    mocks.removeSubaccountWalletTxn.mockResolvedValueOnce(undefined);

    const context = setup();

    let result: boolean | undefined;
    await act(async () => {
      result = await context.current.tryDisableSubaccount();
    });

    expect(result).toBe(true);
    expect(mocks.removeSubaccountSettlementChainExpressTxn).not.toHaveBeenCalled();
    expect(mocks.removeSubaccountWalletTxn).toHaveBeenCalledTimes(1);
    expect(context.current.subaccountDeactivationState).toBe(SubaccountDeactivationState.Success);
  });

  it.each([
    ["refuses the signed request", new GmxRelayError("GMX Relay /v1/relay/submit failed: invalid signature", 400)],
    ["fails to execute the signed request", new SubaccountRemovalRelayFailedError("task-1", "execution reverted")],
  ])("keeps the failure when the relay %s, and the retry sends the transaction", async (_, relayError) => {
    mocks.estimateSettlementChainRemoveSubaccountExpressParams.mockResolvedValue(settlementChainExpressParams);
    mocks.removeSubaccountSettlementChainExpressTxn.mockRejectedValueOnce(relayError);

    const context = setup();

    let result: boolean | undefined;
    await act(async () => {
      result = await context.current.tryDisableSubaccount();
    });

    expect(result).toBe(false);
    expect(context.current.subaccountDeactivationState).toBe(SubaccountDeactivationState.Error);
    expect(context.current.subaccountDeactivationFailureReason).toBe(SubaccountDeactivationFailureReason.Unknown);
    expect(getIsSubaccountStoredLocally()).toBe(true);
    expect(mocks.removeSubaccountWalletTxn).not.toHaveBeenCalled();

    mocks.removeSubaccountWalletTxn.mockResolvedValueOnce(undefined);

    let retryResult: boolean | undefined;
    await act(async () => {
      retryResult = await context.current.tryDisableSubaccount();
    });

    expect(retryResult).toBe(true);
    expect(mocks.estimateSettlementChainRemoveSubaccountExpressParams).toHaveBeenCalledTimes(1);
    expect(mocks.removeSubaccountSettlementChainExpressTxn).toHaveBeenCalledTimes(1);
    expect(mocks.removeSubaccountWalletTxn).toHaveBeenCalledWith(CHAIN_ID, expect.anything(), SUBACCOUNT_ADDRESS);
    expect(getIsSubaccountStoredLocally()).toBe(false);
    expect(context.current.subaccountDeactivationState).toBe(SubaccountDeactivationState.Success);
  });

  it("checks the chain and retries with a signature when the relay result could not be confirmed", async () => {
    mocks.estimateSettlementChainRemoveSubaccountExpressParams.mockResolvedValue(settlementChainExpressParams);
    mocks.removeSubaccountSettlementChainExpressTxn.mockRejectedValueOnce(
      new SubaccountRemovalResultUnknownError("task-1", new Error("Timeout waiting for terminal status"))
    );

    const context = setup();

    let result: boolean | undefined;
    await act(async () => {
      result = await context.current.tryDisableSubaccount();
    });

    expect(result).toBe(false);
    expect(context.current.subaccountDeactivationFailureReason).toBe(SubaccountDeactivationFailureReason.ResultUnknown);
    expect(mocks.refreshSubaccountData).toHaveBeenCalled();
    expect(getIsSubaccountStoredLocally()).toBe(true);

    mocks.removeSubaccountSettlementChainExpressTxn.mockResolvedValueOnce(undefined);

    let retryResult: boolean | undefined;
    await act(async () => {
      retryResult = await context.current.tryDisableSubaccount();
    });

    expect(retryResult).toBe(true);
    expect(mocks.removeSubaccountSettlementChainExpressTxn).toHaveBeenCalledTimes(2);
    expect(mocks.removeSubaccountWalletTxn).not.toHaveBeenCalled();
  });

  it("names the wallet gas payment token when the signed removal can't pay its relay fee", async () => {
    mocks.estimateSettlementChainRemoveSubaccountExpressParams.mockResolvedValue(settlementChainExpressParams);
    const revertData = encodeErrorResult({
      abi: abis.CustomErrors as Abi,
      errorName: "InsufficientRelayFee",
      args: [2n, 1n],
    });
    mocks.removeSubaccountSettlementChainExpressTxn.mockRejectedValueOnce(new Error(`data="${revertData}"`));

    const context = setup();

    let result: boolean | undefined;
    await act(async () => {
      result = await context.current.tryDisableSubaccount();
    });

    expect(result).toBe(false);
    expect(context.current.subaccountDeactivationFailureReason).toBe(
      SubaccountDeactivationFailureReason.InsufficientWalletGasPaymentTokenBalance
    );
    expect(context.current.subaccountDeactivationFailureTokenSymbol).toBe("USDT");
    expect(mocks.selectGmxAccountGasPaymentToken).not.toHaveBeenCalled();
  });
});
