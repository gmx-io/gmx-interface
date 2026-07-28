import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ExpressEstimationInsufficientGasPaymentTokenBalanceError } from "sdk/utils/express";

import { SubaccountRemovalResultUnknownError } from "./errors";
import {
  getIsSubaccountActiveOnchain,
  getIsSubaccountRemovalRequired,
  removeSubaccountExpressTxn,
  removeSubaccountWalletTxn,
} from "./removeSubaccount";

const { mocks } = vi.hoisted(() => ({
  mocks: {
    callContract: vi.fn(),
    sendExpressTransaction: vi.fn(),
    signTypedData: vi.fn(),
    getRawBaseRelayerParams: vi.fn(),
    estimateArbitraryRelayFee: vi.fn(),
    getArbitraryRelayParamsAndPayload: vi.fn(),
  },
}));

vi.mock("viem", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  encodeFunctionData: vi.fn(() => "0x"),
}));

vi.mock("domain/multichain/arbitraryRelayParams", () => ({
  getRawBaseRelayerParams: mocks.getRawBaseRelayerParams,
  estimateArbitraryRelayFee: mocks.estimateArbitraryRelayFee,
  getArbitraryRelayParamsAndPayload: mocks.getArbitraryRelayParamsAndPayload,
}));

vi.mock("lib/contracts", () => ({
  callContract: mocks.callContract,
}));

vi.mock("lib/transactions", () => ({
  sendExpressTransaction: mocks.sendExpressTransaction,
}));

vi.mock("lib/wallets/signing", () => ({
  signTypedData: mocks.signTypedData,
}));

vi.mock("lib/wallets/walletConfig", () => ({
  getPublicClientWithRpc: () => ({}),
}));

vi.mock("domain/synthetics/express", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  hashRelayParams: () => "0xhash",
}));

vi.mock("domain/synthetics/express/expressOrderUtils", () => ({
  getMultichainInfoFromSigner: async () => undefined,
  getOrderRelayRouterAddress: () => "0x0000000000000000000000000000000000000001",
}));

const CHAIN_ID = 42161 as const;
const SRC_CHAIN_ID = 8453 as const;
const ACCOUNT = "0x1234567890123456789012345678901234567890";
const SUBACCOUNT_ADDRESS = "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa";

const ENCODED_TRUE = `0x${"1".padStart(64, "0")}`;
const ENCODED_FALSE = `0x${"0".repeat(64)}`;

function makeProvider(callResult: string | Error) {
  return {
    call: vi.fn(async () => {
      if (callResult instanceof Error) {
        throw callResult;
      }
      return callResult;
    }),
  } as any;
}

function makeSigner(provider: any) {
  return {
    address: ACCOUNT,
    getAddress: async () => ACCOUNT,
    provider,
  } as any;
}

const subaccount = { address: SUBACCOUNT_ADDRESS } as any;

function makeSubaccount(onchainActive: boolean) {
  return { address: SUBACCOUNT_ADDRESS, onchainData: { active: onchainActive } } as any;
}

const globalExpressParams = {
  gasPaymentToken: { gmxAccountBalance: 0n, walletBalance: 0n },
} as any;

function mockExpressEstimation({ isOutGasTokenBalance }: { isOutGasTokenBalance: boolean }) {
  mocks.getRawBaseRelayerParams.mockReturnValue({
    rawBaseRelayParamsPayload: {},
    baseRelayFeeSwapParams: { gasPaymentParams: { relayerFeeAmount: 1n, relayerFeeTokenAddress: "0xfee" } },
  });
  mocks.estimateArbitraryRelayFee.mockResolvedValue(5n);
  mocks.getArbitraryRelayParamsAndPayload.mockReturnValue({
    relayFeeParams: {
      gasPaymentParams: {
        relayerFeeAmount: 5n,
        relayerFeeTokenAddress: "0xfee",
        totalRelayerFeeTokenAmount: 10n,
      },
    },
    relayParamsPayload: {},
    gasPaymentValidations: {
      isGasPaymentTokenBalanceLoaded: true,
      isOutGasTokenBalance,
      needGasPaymentTokenApproval: false,
      isValid: !isOutGasTokenBalance,
    },
  });
}

describe("removeSubaccountWalletTxn", () => {
  beforeEach(() => {
    mocks.callContract.mockResolvedValue({ wait: vi.fn(async () => ({})) });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sends and awaits the wallet transaction", async () => {
    const wait = vi.fn(async () => ({}));
    mocks.callContract.mockResolvedValue({ wait });
    const signer = makeSigner(makeProvider(ENCODED_TRUE));

    await removeSubaccountWalletTxn(CHAIN_ID, signer, SUBACCOUNT_ADDRESS);

    expect(mocks.callContract).toHaveBeenCalledTimes(1);
    expect(wait).toHaveBeenCalledTimes(1);
  });

  it("does not re-check the on-chain state — whether a removal is due is decided by the caller", async () => {
    const provider = makeProvider(ENCODED_FALSE);

    await removeSubaccountWalletTxn(CHAIN_ID, makeSigner(provider), SUBACCOUNT_ADDRESS);

    expect(provider.call).not.toHaveBeenCalled();
    expect(mocks.callContract).toHaveBeenCalledTimes(1);
  });
});

describe("getIsSubaccountRemovalRequired", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the removal without an on-chain read when the cached data says the subaccount is registered", async () => {
    const provider = makeProvider(ENCODED_FALSE);

    await expect(
      getIsSubaccountRemovalRequired({
        chainId: CHAIN_ID,
        provider,
        signer: makeSigner(undefined),
        subaccount: makeSubaccount(true),
        account: ACCOUNT,
      })
    ).resolves.toBe(true);

    expect(provider.call).not.toHaveBeenCalled();
  });

  it("needs no transaction when One-Click is only enabled by a local approval", async () => {
    await expect(
      getIsSubaccountRemovalRequired({
        chainId: CHAIN_ID,
        provider: makeProvider(ENCODED_FALSE),
        signer: makeSigner(undefined),
        subaccount: makeSubaccount(false),
        account: ACCOUNT,
      })
    ).resolves.toBe(false);
  });

  it("keeps the removal when the on-chain read is unavailable", async () => {
    await expect(
      getIsSubaccountRemovalRequired({
        chainId: CHAIN_ID,
        provider: makeProvider(new Error("rpc error")),
        signer: makeSigner(undefined),
        subaccount: makeSubaccount(false),
        account: ACCOUNT,
      })
    ).resolves.toBe(true);
  });

  it("falls back to the signer provider when no provider is given", async () => {
    const signerProvider = makeProvider(ENCODED_FALSE);

    await expect(
      getIsSubaccountRemovalRequired({
        chainId: CHAIN_ID,
        provider: undefined,
        signer: makeSigner(signerProvider),
        subaccount: makeSubaccount(false),
        account: ACCOUNT,
      })
    ).resolves.toBe(false);

    expect(signerProvider.call).toHaveBeenCalledTimes(1);
  });

  it("keeps the removal when there is no provider to read with", async () => {
    await expect(
      getIsSubaccountRemovalRequired({
        chainId: CHAIN_ID,
        provider: undefined,
        signer: makeSigner(undefined),
        subaccount: makeSubaccount(false),
        account: ACCOUNT,
      })
    ).resolves.toBe(true);
  });
});

describe("getIsSubaccountActiveOnchain", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("decodes the DataStore result", async () => {
    await expect(
      getIsSubaccountActiveOnchain({
        chainId: CHAIN_ID,
        provider: makeProvider(ENCODED_TRUE),
        account: ACCOUNT,
        subaccountAddress: SUBACCOUNT_ADDRESS,
      })
    ).resolves.toBe(true);

    await expect(
      getIsSubaccountActiveOnchain({
        chainId: CHAIN_ID,
        provider: makeProvider(ENCODED_FALSE),
        account: ACCOUNT,
        subaccountAddress: SUBACCOUNT_ADDRESS,
      })
    ).resolves.toBe(false);
  });

  it("returns undefined when the read fails", async () => {
    await expect(
      getIsSubaccountActiveOnchain({
        chainId: CHAIN_ID,
        provider: makeProvider(new Error("rpc error")),
        account: ACCOUNT,
        subaccountAddress: SUBACCOUNT_ADDRESS,
      })
    ).resolves.toBeUndefined();
  });
});

describe("removeSubaccountExpressTxn", () => {
  beforeEach(() => {
    mocks.signTypedData.mockResolvedValue("0xsignature");
    mocks.sendExpressTransaction.mockResolvedValue({
      taskId: "task-1",
      wait: vi.fn(async () => ({ status: "success" })),
    });
    mockExpressEstimation({ isOutGasTokenBalance: false });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not re-check the on-chain state — whether a removal is due is decided by the caller", async () => {
    const provider = makeProvider(ENCODED_FALSE);

    await removeSubaccountExpressTxn({
      chainId: CHAIN_ID,
      provider,
      account: ACCOUNT,
      srcChainId: SRC_CHAIN_ID,
      signer: makeSigner(undefined),
      subaccount,
      globalExpressParams,
    });

    expect(provider.call).not.toHaveBeenCalled();
    expect(mocks.getRawBaseRelayerParams).toHaveBeenCalledTimes(1);
    expect(mocks.sendExpressTransaction).toHaveBeenCalledTimes(1);
  });

  it("fails fast before requesting a signature when the gas payment token balance cannot cover the relay fee", async () => {
    mockExpressEstimation({ isOutGasTokenBalance: true });

    await expect(
      removeSubaccountExpressTxn({
        chainId: CHAIN_ID,
        provider: makeProvider(ENCODED_TRUE),
        account: ACCOUNT,
        srcChainId: SRC_CHAIN_ID,
        signer: makeSigner(undefined),
        subaccount,
        globalExpressParams,
      })
    ).rejects.toBeInstanceOf(ExpressEstimationInsufficientGasPaymentTokenBalanceError);

    expect(mocks.signTypedData).not.toHaveBeenCalled();
    expect(mocks.sendExpressTransaction).not.toHaveBeenCalled();
  });

  it("signs, sends and waits for the relay execution result", async () => {
    const wait = vi.fn(async () => ({ status: "success" }));
    mocks.sendExpressTransaction.mockResolvedValue({ taskId: "task-1", wait });

    await removeSubaccountExpressTxn({
      chainId: CHAIN_ID,
      provider: makeProvider(ENCODED_TRUE),
      account: ACCOUNT,
      srcChainId: SRC_CHAIN_ID,
      signer: makeSigner(undefined),
      subaccount,
      globalExpressParams,
    });

    expect(mocks.signTypedData).toHaveBeenCalledTimes(1);
    expect(mocks.sendExpressTransaction).toHaveBeenCalledTimes(1);
    expect(wait).toHaveBeenCalledTimes(1);
  });

  it("reports an unknown result when the relay outcome cannot be read back", async () => {
    const waitError = new Error("Timeout waiting for terminal status for task-1");
    mocks.sendExpressTransaction.mockResolvedValue({
      taskId: "task-1",
      wait: vi.fn(async () => {
        throw waitError;
      }),
    });

    const rejection = await removeSubaccountExpressTxn({
      chainId: CHAIN_ID,
      provider: makeProvider(ENCODED_TRUE),
      account: ACCOUNT,
      srcChainId: SRC_CHAIN_ID,
      signer: makeSigner(undefined),
      subaccount,
      globalExpressParams,
    }).catch((error) => error);

    expect(rejection).toBeInstanceOf(SubaccountRemovalResultUnknownError);
    expect(rejection.taskId).toBe("task-1");
    expect(rejection.reason).toBe(waitError);
  });

  it("throws when the relayed transaction reverted so the local state is not reset", async () => {
    mocks.sendExpressTransaction.mockResolvedValue({
      taskId: "task-1",
      wait: vi.fn(async () => ({ status: "failed", relayStatus: { message: "execution reverted" } })),
    });

    await expect(
      removeSubaccountExpressTxn({
        chainId: CHAIN_ID,
        provider: makeProvider(ENCODED_TRUE),
        account: ACCOUNT,
        srcChainId: SRC_CHAIN_ID,
        signer: makeSigner(undefined),
        subaccount,
        globalExpressParams,
      })
    ).rejects.toThrow("Remove subaccount transaction failed: execution reverted");
  });
});
