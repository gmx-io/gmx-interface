import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ExpressEstimationInsufficientGasPaymentTokenBalanceError } from "sdk/utils/express";

import {
  getIsSubaccountActiveOnchain,
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

  it("skips the wallet transaction when both the fresh read and the cached data say the subaccount is not registered on-chain", async () => {
    const signer = makeSigner(makeProvider(ENCODED_FALSE));

    await removeSubaccountWalletTxn(CHAIN_ID, signer, SUBACCOUNT_ADDRESS, false);

    expect(mocks.callContract).not.toHaveBeenCalled();
  });

  it("sends the wallet transaction when the fresh read disagrees with the cached active state (lagging node)", async () => {
    const signer = makeSigner(makeProvider(ENCODED_FALSE));

    await removeSubaccountWalletTxn(CHAIN_ID, signer, SUBACCOUNT_ADDRESS, true);

    expect(mocks.callContract).toHaveBeenCalledTimes(1);
  });

  it("sends the wallet transaction when the cached active state is unavailable", async () => {
    const signer = makeSigner(makeProvider(ENCODED_FALSE));

    await removeSubaccountWalletTxn(CHAIN_ID, signer, SUBACCOUNT_ADDRESS, undefined);

    expect(mocks.callContract).toHaveBeenCalledTimes(1);
  });

  it("sends and awaits the wallet transaction when the subaccount is registered on-chain", async () => {
    const wait = vi.fn(async () => ({}));
    mocks.callContract.mockResolvedValue({ wait });
    const signer = makeSigner(makeProvider(ENCODED_TRUE));

    await removeSubaccountWalletTxn(CHAIN_ID, signer, SUBACCOUNT_ADDRESS, true);

    expect(mocks.callContract).toHaveBeenCalledTimes(1);
    expect(wait).toHaveBeenCalledTimes(1);
  });

  it("sends the wallet transaction when the on-chain activity check is unavailable", async () => {
    const signer = makeSigner(makeProvider(new Error("rpc error")));

    await removeSubaccountWalletTxn(CHAIN_ID, signer, SUBACCOUNT_ADDRESS, false);

    expect(mocks.callContract).toHaveBeenCalledTimes(1);
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

  it("skips the relay transaction when both the fresh read and the cached data say the subaccount is not registered on-chain", async () => {
    await removeSubaccountExpressTxn({
      chainId: CHAIN_ID,
      provider: makeProvider(ENCODED_FALSE),
      account: ACCOUNT,
      srcChainId: SRC_CHAIN_ID,
      signer: makeSigner(undefined),
      subaccount,
      globalExpressParams,
      cachedOnchainActive: false,
    });

    expect(mocks.getRawBaseRelayerParams).not.toHaveBeenCalled();
    expect(mocks.signTypedData).not.toHaveBeenCalled();
    expect(mocks.sendExpressTransaction).not.toHaveBeenCalled();
  });

  it("sends the relay transaction when the fresh read disagrees with the cached active state (lagging node)", async () => {
    await removeSubaccountExpressTxn({
      chainId: CHAIN_ID,
      provider: makeProvider(ENCODED_FALSE),
      account: ACCOUNT,
      srcChainId: SRC_CHAIN_ID,
      signer: makeSigner(undefined),
      subaccount,
      globalExpressParams,
      cachedOnchainActive: true,
    });

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
        cachedOnchainActive: true,
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
      cachedOnchainActive: true,
    });

    expect(mocks.signTypedData).toHaveBeenCalledTimes(1);
    expect(mocks.sendExpressTransaction).toHaveBeenCalledTimes(1);
    expect(wait).toHaveBeenCalledTimes(1);
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
        cachedOnchainActive: true,
      })
    ).rejects.toThrow("Remove subaccount transaction failed: execution reverted");
  });
});
