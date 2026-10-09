import { decodeFunctionData, type Hex } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM, SOURCE_BASE_MAINNET } from "config/chains";
import { GMX_SIMULATION_ORIGIN } from "config/dataStore";
import type { ExpressTxnParams, GlobalExpressParams } from "domain/synthetics/express";
import { MOCK_GAS_LIMITS, MOCK_GAS_PRICE } from "domain/testUtils/mockChainData";
import { ETH_ADDRESS, ETH_TOKEN } from "domain/testUtils/mockTokens";
import { abis } from "sdk/abis";
import { getContract } from "sdk/configs/contracts";
import { buildGlobalExpressParams, ExpressEstimationInsufficientGasPaymentTokenBalanceError } from "sdk/utils/express";

import { getIsSubaccountRemovalRelayRejected, SubaccountRemovalResultUnknownError } from "./errors";
import {
  estimateSettlementChainRemoveSubaccountExpressParams,
  getIsSubaccountActiveOnchain,
  getIsSubaccountRemovalRequired,
  removeSubaccountExpressTxn,
  removeSubaccountSettlementChainExpressTxn,
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
    readContract: vi.fn(),
    estimateGas: vi.fn(),
  },
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
  getPublicClientWithRpc: () => ({ readContract: mocks.readContract, estimateGas: mocks.estimateGas }),
}));

vi.mock("domain/synthetics/express", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  hashRelayParams: () => "0xhash",
}));

vi.mock("domain/synthetics/express/expressOrderUtils", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getMultichainInfoFromSigner: async () => undefined,
}));

const CHAIN_ID = ARBITRUM;
const SRC_CHAIN_ID = SOURCE_BASE_MAINNET;
const ACCOUNT = "0x1234567890123456789012345678901234567890";
const SUBACCOUNT_ADDRESS = "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa";
const FEE_TOKEN_ADDRESS = "0x000000000000000000000000000000000000fee0";
const MOCK_SIGNATURE = `0x${"11".repeat(65)}`;

const RELAY_PARAMS_PAYLOAD = {
  oracleParams: { tokens: [], providers: [], data: [] },
  externalCalls: {
    sendTokens: [],
    sendAmounts: [],
    externalCallTargets: [],
    externalCallDataList: [],
    refundTokens: [],
    refundReceivers: [],
  },
  tokenPermits: [],
  fee: { feeToken: FEE_TOKEN_ADDRESS, feeAmount: 5n, feeSwapPath: [] },
  userNonce: 0n,
  deadline: 0n,
  desChainId: BigInt(CHAIN_ID),
};

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
    rawBaseRelayParamsPayload: RELAY_PARAMS_PAYLOAD,
    baseRelayFeeSwapParams: { gasPaymentParams: { relayerFeeAmount: 1n, relayerFeeTokenAddress: FEE_TOKEN_ADDRESS } },
  });
  mocks.estimateArbitraryRelayFee.mockResolvedValue(5n);
  mocks.getArbitraryRelayParamsAndPayload.mockReturnValue({
    relayFeeParams: {
      gasPaymentParams: {
        relayerFeeAmount: 5n,
        relayerFeeTokenAddress: FEE_TOKEN_ADDRESS,
        totalRelayerFeeTokenAmount: 10n,
      },
    },
    relayParamsPayload: RELAY_PARAMS_PAYLOAD,
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
    await expect(
      getIsSubaccountRemovalRequired({
        chainId: CHAIN_ID,
        subaccount: makeSubaccount(true),
        account: ACCOUNT,
      })
    ).resolves.toBe(true);

    expect(mocks.readContract).not.toHaveBeenCalled();
  });

  it("needs no transaction when One-Click is only enabled by a local approval", async () => {
    mocks.readContract.mockResolvedValue(false);

    await expect(
      getIsSubaccountRemovalRequired({
        chainId: CHAIN_ID,
        subaccount: makeSubaccount(false),
        account: ACCOUNT,
      })
    ).resolves.toBe(false);
  });

  it("keeps the removal when the on-chain read is unavailable", async () => {
    mocks.readContract.mockRejectedValue(new Error("rpc error"));

    await expect(
      getIsSubaccountRemovalRequired({
        chainId: CHAIN_ID,
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

  it("reads the DataStore on the settlement chain", async () => {
    mocks.readContract.mockResolvedValue(true);

    await expect(
      getIsSubaccountActiveOnchain({
        chainId: CHAIN_ID,
        account: ACCOUNT,
        subaccountAddress: SUBACCOUNT_ADDRESS,
      })
    ).resolves.toBe(true);

    expect(mocks.readContract).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "containsAddress", args: [expect.any(String), SUBACCOUNT_ADDRESS] })
    );

    mocks.readContract.mockResolvedValue(false);

    await expect(
      getIsSubaccountActiveOnchain({
        chainId: CHAIN_ID,
        account: ACCOUNT,
        subaccountAddress: SUBACCOUNT_ADDRESS,
      })
    ).resolves.toBe(false);
  });

  it("returns undefined when the read fails", async () => {
    mocks.readContract.mockRejectedValue(new Error("rpc error"));

    await expect(
      getIsSubaccountActiveOnchain({
        chainId: CHAIN_ID,
        account: ACCOUNT,
        subaccountAddress: SUBACCOUNT_ADDRESS,
      })
    ).resolves.toBeUndefined();
  });
});

describe("removeSubaccountExpressTxn", () => {
  beforeEach(() => {
    mocks.signTypedData.mockResolvedValue(MOCK_SIGNATURE);
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
    await removeSubaccountExpressTxn({
      chainId: CHAIN_ID,
      account: ACCOUNT,
      srcChainId: SRC_CHAIN_ID,
      signer: makeSigner(undefined),
      subaccount,
      globalExpressParams,
    });

    expect(mocks.readContract).not.toHaveBeenCalled();
    expect(mocks.getRawBaseRelayerParams).toHaveBeenCalledTimes(1);
    expect(mocks.sendExpressTransaction).toHaveBeenCalledTimes(1);
  });

  it("fails fast before requesting a signature when the gas payment token balance cannot cover the relay fee", async () => {
    mockExpressEstimation({ isOutGasTokenBalance: true });

    await expect(
      removeSubaccountExpressTxn({
        chainId: CHAIN_ID,
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
        account: ACCOUNT,
        srcChainId: SRC_CHAIN_ID,
        signer: makeSigner(undefined),
        subaccount,
        globalExpressParams,
      })
    ).rejects.toThrow("Remove subaccount transaction failed: execution reverted");
  });
});

const RELAY_ROUTER_ADDRESS = getContract(CHAIN_ID, "SubaccountGelatoRelayRouter");
const ONE_ETH = 10n ** 18n;

function makeSettlementChainGlobalExpressParams({
  walletBalance,
  allowance,
}: {
  walletBalance: bigint;
  allowance: bigint;
}): GlobalExpressParams {
  // WETH is also the relayer fee token, so the fee needs no swap
  return {
    ...buildGlobalExpressParams({
      chainId: CHAIN_ID,
      gasLimits: MOCK_GAS_LIMITS,
      gasPrice: MOCK_GAS_PRICE,
      tokensData: { [ETH_ADDRESS]: { ...ETH_TOKEN, walletBalance } },
      marketsInfoData: {},
      gasPaymentTokenAddress: ETH_ADDRESS,
    }),
    gasPaymentAllowanceData: { [ETH_ADDRESS]: allowance },
  };
}

function estimateSettlementChainRemoval(globalExpressParams: GlobalExpressParams) {
  return estimateSettlementChainRemoveSubaccountExpressParams({
    chainId: CHAIN_ID,
    account: ACCOUNT,
    signer: makeSigner(undefined),
    subaccount,
    globalExpressParams,
  });
}

describe("estimateSettlementChainRemoveSubaccountExpressParams", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("prices the relay fee by simulating the removal through the SubaccountGelatoRelayRouter, without asking for a signature", async () => {
    mocks.estimateGas.mockResolvedValue(100_000n);

    const expressParams = await estimateSettlementChainRemoval(
      makeSettlementChainGlobalExpressParams({ walletBalance: ONE_ETH, allowance: ONE_ETH })
    );

    expect(expressParams).toMatchObject({
      isGmxAccount: false,
      estimationMethod: "estimateGas",
      gasPaymentValidations: { isValid: true },
      gasPaymentParams: { gasPaymentTokenAddress: ETH_ADDRESS, relayerFeeTokenAddress: ETH_ADDRESS },
    });

    expect(mocks.estimateGas).toHaveBeenCalledTimes(1);
    const { account, to, data } = mocks.estimateGas.mock.calls[0][0];
    expect(account).toBe(GMX_SIMULATION_ORIGIN);
    expect(to).toBe(RELAY_ROUTER_ADDRESS);

    const { functionName, args } = decodeFunctionData({ abi: abis.SubaccountGelatoRelayRouter, data });
    expect(functionName).toBe("removeSubaccount");
    expect(args).toEqual([expect.objectContaining({ signature: "0x" }), ACCOUNT, SUBACCOUNT_ADDRESS]);

    expect(mocks.signTypedData).not.toHaveBeenCalled();
    expect(mocks.sendExpressTransaction).not.toHaveBeenCalled();
  });

  it("can't be used when the wallet gas payment token isn't approved to the Router", async () => {
    await expect(
      estimateSettlementChainRemoval(makeSettlementChainGlobalExpressParams({ walletBalance: ONE_ETH, allowance: 0n }))
    ).resolves.toBeUndefined();

    expect(mocks.estimateGas).not.toHaveBeenCalled();
  });

  it("can't be used when the wallet balance is short of the estimated relay fee", async () => {
    // covers the pre-simulation estimate, but not the fee for the simulated gas
    mocks.estimateGas.mockResolvedValue(5_000_000n);

    await expect(
      estimateSettlementChainRemoval(
        makeSettlementChainGlobalExpressParams({ walletBalance: 3n * 10n ** 14n, allowance: ONE_ETH })
      )
    ).resolves.toBeUndefined();

    expect(mocks.estimateGas).toHaveBeenCalledTimes(1);
  });

  it("can't be used when the simulated removal reverts", async () => {
    mocks.estimateGas.mockRejectedValue(new Error("execution reverted"));

    await expect(
      estimateSettlementChainRemoval(
        makeSettlementChainGlobalExpressParams({ walletBalance: ONE_ETH, allowance: ONE_ETH })
      )
    ).resolves.toBeUndefined();
  });
});

describe("removeSubaccountSettlementChainExpressTxn", () => {
  const relayParamsPayload = {
    ...RELAY_PARAMS_PAYLOAD,
    fee: { feeToken: ETH_ADDRESS, feeAmount: 5n, feeSwapPath: [] },
  };

  const expressParams = {
    relayParamsPayload,
    gasPaymentParams: { relayerFeeAmount: 5n, relayerFeeTokenAddress: ETH_ADDRESS },
  } as unknown as ExpressTxnParams;

  function removeOnSettlementChain() {
    return removeSubaccountSettlementChainExpressTxn({
      chainId: CHAIN_ID,
      signer: makeSigner(undefined),
      subaccount,
      expressParams,
    });
  }

  beforeEach(() => {
    mocks.signTypedData.mockResolvedValue(MOCK_SIGNATURE);
    mocks.sendExpressTransaction.mockResolvedValue({
      taskId: "task-1",
      wait: vi.fn(async () => ({ status: "success" })),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("signs RemoveSubaccount and relays removeSubaccount(relayParams, account, subaccount) to the SubaccountGelatoRelayRouter", async () => {
    await removeOnSettlementChain();

    expect(mocks.signTypedData).toHaveBeenCalledTimes(1);
    expect(mocks.signTypedData).toHaveBeenCalledWith(
      expect.objectContaining({
        types: {
          RemoveSubaccount: [
            { name: "subaccount", type: "address" },
            { name: "relayParams", type: "bytes32" },
          ],
        },
        typedData: { subaccount: SUBACCOUNT_ADDRESS, relayParams: "0xhash" },
        domain: {
          name: "GmxBaseGelatoRelayRouter",
          version: "1",
          chainId: CHAIN_ID,
          verifyingContract: RELAY_ROUTER_ADDRESS,
        },
      })
    );

    expect(mocks.sendExpressTransaction).toHaveBeenCalledTimes(1);
    const { chainId, txnData } = mocks.sendExpressTransaction.mock.calls[0][0];
    expect(chainId).toBe(CHAIN_ID);
    expect(txnData.to).toBe(RELAY_ROUTER_ADDRESS);

    const { functionName, args } = decodeFunctionData({
      abi: abis.SubaccountGelatoRelayRouter,
      data: txnData.callData as Hex,
    });
    expect(functionName).toBe("removeSubaccount");
    expect(args).toEqual([
      { ...relayParamsPayload, deadline: expect.any(BigInt), signature: MOCK_SIGNATURE },
      ACCOUNT,
      SUBACCOUNT_ADDRESS,
    ]);
  });

  it("reports a failed relay execution as rejected by the relay", async () => {
    mocks.sendExpressTransaction.mockResolvedValue({
      taskId: "task-1",
      wait: vi.fn(async () => ({ status: "failed", relayStatus: { message: "execution reverted" } })),
    });

    const rejection = await removeOnSettlementChain().catch((error) => error);

    expect(rejection.message).toBe("Remove subaccount transaction failed: execution reverted");
    expect(getIsSubaccountRemovalRelayRejected(rejection)).toBe(true);
  });

  it("reports an unknown result when the relay outcome cannot be read back", async () => {
    mocks.sendExpressTransaction.mockResolvedValue({
      taskId: "task-1",
      wait: vi.fn(async () => {
        throw new Error("Timeout waiting for terminal status for task-1");
      }),
    });

    const rejection = await removeOnSettlementChain().catch((error) => error);

    expect(rejection).toBeInstanceOf(SubaccountRemovalResultUnknownError);
    expect(getIsSubaccountRemovalRelayRejected(rejection)).toBe(false);
  });
});
