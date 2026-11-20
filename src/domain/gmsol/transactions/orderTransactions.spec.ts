import type * as Sdk from "@gmsol-labs/gmsol-sdk";
import * as wasm from "@gmsol-labs/gmsol-sdk/index_bg.js";
import {
  address,
  blockhash,
  compileTransaction,
  compressTransactionMessageUsingAddressLookupTables,
  getTransactionEncoder,
  type Instruction,
  createKeyPairFromBytes,
  signTransaction,
  getTransactionDecoder,
  getBase64Encoder,
  getSignatureFromTransaction,
  getSolanaErrorFromJsonRpcError,
  getBase58Decoder,
} from "@solana/kit";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { maxUint256 } from "viem";
import { beforeAll, beforeEach, expect, it, vi } from "vitest";

import { GMSOL_LOOKUP_TABLE_ADDRESSES } from "config/gmsol/lookupTables";
import { GMSOL_MARKETS } from "config/gmsol/markets";
import { GMSOL_STORE_PROGRAM_ID, GMSOL_STORE_ADDRESS } from "config/gmsol/program";
import { GMSOL_SDK_WASM_SHA256 } from "config/gmsol/sdk";
import { copySolanaBytes } from "lib/solana/bytes";
import { mockMarginCheckMarketInfo, mockTokensData } from "sdk/test/mock";
import { getAcceptablePriceInfo } from "sdk/utils/prices";

import { ASSOCIATED_TOKEN_PROGRAM, getGmsolAta, getGmsolPositionAddress, gmsolPda } from "./addresses";
import { buildGmsolOrderTransactions } from "./buildOrderTransactions";
import { compactCreateOrderData, decodeGmsolInstruction, readCreateOrderParams } from "./decodeInstruction";
import { toGmsolOrderParams, toGmsolUpdateParams } from "./orderInputs";
import { getPendingGmsolSubmission, reconcileGmsolSubmission, setPendingGmsolSubmission } from "./pendingSubmission";
import {
  GmsolTransactionError,
  prepareGmsolOrderTransactions,
  sendGmsolOrderTransactions,
} from "./sendOrderTransactions";
import type { GmsolCreateOrder, GmsolTransactionPlan } from "./types";
import { decodeGmsolTransaction, validateGmsolTransactionPlan } from "./validateTransaction";
import { validateGmsolWalletTransaction } from "./validateWalletTransaction";

vi.mock("config/ab", () => ({ getIsSolanaNetworkEnabled: () => true }));
const transport = vi.hoisted(() => ({
  rpc: {} as Record<string, ReturnType<typeof vi.fn>>,
  tables: {} as Record<string, string[]>,
  flags: vi.fn(),
  loadSdk: vi.fn(),
}));
vi.mock("../loadGmsolSdk", () => ({ loadGmsolSdk: () => transport.loadSdk() }));
vi.mock("lib/solana/rpc", () => ({ getSolanaRpc: () => transport.rpc }));
vi.mock("lib/solana/lookupTables", () => ({ fetchGmsolLookupTables: async () => transport.tables }));
vi.mock("../fetchSolanaTradingEnabled", () => ({ fetchSolanaTradingEnabled: () => transport.flags() }));

const sdk = wasm as unknown as typeof Sdk;
const market = GMSOL_MARKETS.find((m) => m.marketTokenAddress === "Dqq58gS1TgRMDouUbdvhhzc51XXTNHG921WLxH9X2eB8")!;
let owner: string;
let signingKey: CryptoKeyPair;
let other: string;
const lifetime = { recentBlockhash: "11111111111111111111111111111111", lastValidBlockHeight: 1n };
function order(kind: GmsolCreateOrder["kind"] = "LimitIncrease", isLong = true): GmsolCreateOrder {
  return {
    kind,
    market,
    collateralToken: market.longTokenAddress,
    indexTokenDecimals: 8,
    isLong,
    sizeDeltaUsd: 10n ** 31n,
    collateralDeltaAmount: kind.includes("Increase") ? 1000000n : 0n,
    minOutput: 0n,
    acceptablePrice: 100000n * 10n ** 30n,
    triggerPrice: kind.includes("Market") ? undefined : 90000n * 10n ** 30n,
    payToken: undefined,
    payWithNativeSol: false,
    receiveToken: undefined,
    swapPath: [],
    unwrapNative: false,
    validFromTs: undefined,
    decreaseSwapType: undefined,
  };
}
async function build(orders: GmsolCreateOrder[], atomic = false, lookupTables: Record<string, string[]> = {}) {
  return buildGmsolOrderTransactions({
    owner,
    action: { type: "create", orders, atomic },
    ...lifetime,
    lookupTables,
    sdk,
  });
}
beforeAll(async () => {
  const bytes = readFileSync("node_modules/@gmsol-labs/gmsol-sdk/index_bg.wasm");
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(GMSOL_SDK_WASM_SHA256);
  const { instance } = await WebAssembly.instantiate(bytes, { "./index_bg.js": wasm });
  wasm.__wbg_set_wasm(instance.exports);
  const start = instance.exports.__wbindgen_start;
  if (typeof start !== "function") throw new Error("Missing WASM start");
  start();
  const wallet = new sdk.Keypair();
  owner = wallet.pubkey().toString();
  signingKey = await createKeyPairFromBytes(wallet.toBytes());
  wallet.free();
  other = new sdk.Keypair().pubkey().toString();
});
it("validates pinned WASM create, update and cancel transactions for both sides FESOL-56", async () => {
  for (const kind of [
    "MarketIncrease",
    "LimitIncrease",
    "MarketDecrease",
    "LimitDecrease",
    "StopLossDecrease",
  ] as const)
    for (const isLong of [true, false]) {
      const plan = await build([order(kind, isLong)]);
      const result = await validateGmsolTransactionPlan(plan);
      expect(result.orderAddresses).toHaveLength(1);
      expect(result.keeperLamports).toBe(300000n);
      const context = {
        kind,
        isLong,
        address: result.orderAddresses[0],
        marketToken: market.marketTokenAddress,
        owner,
        receiver: owner,
        rentReceiver: owner,
        referrer: undefined,
        initialCollateralToken: kind.includes("Increase") ? market.longTokenAddress : undefined,
        finalOutputToken: kind.includes("Increase") ? undefined : market.longTokenAddress,
        longToken: market.longTokenAddress,
        shortToken: market.shortTokenAddress,
        unwrapNative: false,
        callback: undefined,
      };
      for (const action of [
        {
          type: "update" as const,
          order: context,
          changes: {
            kind,
            indexTokenDecimals: 8,
            isLong,
            sizeDeltaUsd: 20n * 10n ** 30n,
            acceptablePrice: 100001n * 10n ** 30n,
            triggerPrice: 90001n * 10n ** 30n,
            minOutput: undefined,
            validFromTs: undefined,
          },
        },
        { type: "cancel" as const, order: context },
      ]) {
        const edited = await buildGmsolOrderTransactions({ owner, action, ...lifetime, lookupTables: {}, sdk });
        await expect(validateGmsolTransactionPlan(edited)).resolves.toBeDefined();
      }
    }
});
it("validates native SOL wrapping without allowing arbitrary token operations FESOL-56", async () => {
  const solMarket = GMSOL_MARKETS.find((m) => m.marketTokenAddress === "BvC73rarCMrhEnk3JmqaLntpnrwfUCR5eTrf7HQu6ieg")!;
  const native = {
    ...order("MarketIncrease"),
    market: solMarket,
    collateralToken: solMarket.longTokenAddress,
    payToken: solMarket.longTokenAddress,
    payWithNativeSol: true,
    collateralDeltaAmount: 10000000n,
    indexTokenDecimals: 5,
  };
  const plan = await build([native]);
  expect((await validateGmsolTransactionPlan(plan)).wrapLamports).toBe(10000000n);
});
it("keeps increase and TP/SL in one size-bounded v0 transaction with lookup tables FESOL-56", async () => {
  const first = await build([order()]);
  const keys = decodeGmsolTransaction(first.groups[0][0], first).compiled.staticAccounts.filter((k) => k !== owner);
  const tables = { [GMSOL_LOOKUP_TABLE_ADDRESSES[0]]: keys };
  const plan = await build([order("MarketIncrease"), order("LimitDecrease"), order("StopLossDecrease")], true, tables);
  expect(plan.groups).toHaveLength(1);
  expect(plan.groups[0]).toHaveLength(1);
  expect(plan.groups[0][0].length).toBeLessThanOrEqual(1232);
  expect(decodeGmsolTransaction(plan.groups[0][0], plan).compiled.addressTableLookups?.length).toBeGreaterThan(0);
  expect((await validateGmsolTransactionPlan(plan)).orderAddresses).toHaveLength(3);
  for (const ix of decodeGmsolTransaction(plan.groups[0][0], plan).message.instructions) {
    if (ix.programAddress !== GMSOL_STORE_PROGRAM_ID) continue;
    const decoded = decodeGmsolInstruction(
      copySolanaBytes(ix.data!),
      [...ix.accounts!].map((account) => account.address)
    );
    if (decoded.name !== "create_order_v2") continue;
    decoded.reader.read(32);
    expect(readCreateOrderParams(decoded.reader).minOutput).toBeUndefined();
  }
});
it("prepares wallet accounts before an indivisible increase with TP/SL", async () => {
  const market = GMSOL_MARKETS.find(
    (item) => item.marketTokenAddress === "BvC73rarCMrhEnk3JmqaLntpnrwfUCR5eTrf7HQu6ieg"
  )!;
  const createOrder = (kind: GmsolCreateOrder["kind"]) => ({
    ...order(kind),
    market,
    collateralToken: market.longTokenAddress,
    indexTokenDecimals: 5,
  });
  const first = await build([createOrder("LimitIncrease")]);
  const walletAccounts = new Set([
    owner,
    await gmsolPda("user", [GMSOL_STORE_ADDRESS, owner]),
    await getGmsolPositionAddress({
      owner,
      marketToken: market.marketTokenAddress,
      collateralToken: market.longTokenAddress,
      isLong: true,
    }),
    await getGmsolAta(owner, market.longTokenAddress),
    await getGmsolAta(owner, market.shortTokenAddress),
  ]);
  const keys = first.groups
    .flat()
    .flatMap((bytes) => [...decodeGmsolTransaction(bytes, first).compiled.staticAccounts]);
  const tables = {
    [GMSOL_LOOKUP_TABLE_ADDRESSES[0]]: [...new Set(keys)].filter((key) => !walletAccounts.has(key)),
    [GMSOL_LOOKUP_TABLE_ADDRESSES[1]]: [],
  };
  const plan = await build(
    [createOrder("LimitIncrease"), createOrder("LimitDecrease"), createOrder("StopLossDecrease")],
    true,
    tables
  );
  expect(plan.groups.map((group) => group.length)).toEqual([1, 1]);
  const instructions = plan.groups.flat().map((bytes) => [...decodeGmsolTransaction(bytes, plan).message.instructions]);
  const isOrder = (ix: Instruction) =>
    ix.programAddress === GMSOL_STORE_PROGRAM_ID &&
    decodeGmsolInstruction(
      copySolanaBytes(ix.data!),
      (ix.accounts ?? []).map((account) => account.address)
    ).name === "create_order_v2";
  expect(instructions.map((group) => group.filter(isOrder).length)).toEqual([0, 3]);
  const validated = await validateGmsolTransactionPlan(plan);
  expect(validated.transactionCosts.map((cost) => cost.keeperLamports)).toEqual([0n, 900000n]);
  expect(plan.groups.flat().every((bytes) => bytes.length <= 1232)).toBe(true);
  const encode = (instructions: Instruction[]) =>
    copySolanaBytes(
      getTransactionEncoder().encode(
        compileTransaction(
          compressTransactionMessageUsingAddressLookupTables(
            {
              version: 0,
              feePayer: { address: address(owner) },
              lifetimeConstraint: { blockhash: blockhash(lifetime.recentBlockhash), lastValidBlockHeight: 1n },
              instructions,
            },
            Object.fromEntries(Object.entries(tables).map(([key, values]) => [key, values.map(address)]))
          )
        )
      )
    );
  for (const unsafe of [
    instructions[1].find(isOrder)!,
    instructions[1].find((ix) => ix.programAddress === ASSOCIATED_TOKEN_PROGRAM && ix.accounts?.[2].address !== owner)!,
  ]) {
    expect(unsafe).toBeDefined();
    const changed = structuredClone(plan);
    changed.groups = [[encode([...instructions[0], unsafe])], [encode(instructions[1].filter((ix) => ix !== unsafe))]];
    await expect(validateGmsolTransactionPlan(changed)).rejects.toThrow("must stay in the final transaction");
  }
  transport.tables = tables;
  transport.rpc.getSignatureStatuses.mockReturnValue({
    send: async () => ({
      value: [{ err: { InstructionError: [0, "Custom"] }, confirmationStatus: "confirmed", slot: 2n }],
    }),
  });
  const signedOrderCounts: number[] = [];
  await expect(
    sendGmsolOrderTransactions({
      plan,
      getWalletAddress: () => owner,
      signTransaction: async (bytes) => {
        signedOrderCounts.push(decodeGmsolTransaction(bytes, plan).message.instructions.filter(isOrder).length);
        return copySolanaBytes(
          getTransactionEncoder().encode(await signTransaction([signingKey], getTransactionDecoder().decode(bytes)))
        );
      },
      onConfirmed: async () => undefined,
    })
  ).rejects.toThrow();
  expect(signedOrderCounts).toEqual([0]);
});
function mutateInstructions(plan: GmsolTransactionPlan, change: (ix: Instruction[]) => Instruction[]) {
  const next = structuredClone(plan);
  const decoded = decodeGmsolTransaction(next.groups[0][0], next);
  const instructions = change([...decoded.message.instructions]);
  next.groups = [
    [
      copySolanaBytes(
        getTransactionEncoder().encode(
          compileTransaction({
            version: 0,
            feePayer: { address: address(owner) },
            lifetimeConstraint: { blockhash: blockhash(lifetime.recentBlockhash), lastValidBlockHeight: 1n },
            instructions,
          })
        )
      ),
    ],
  ];
  return next;
}
it("compacts only zero output bounds while preserving finite prices and strict validation FESOL-56", async () => {
  for (const kind of ["LimitIncrease", "LimitDecrease", "StopLossDecrease"] as const)
    for (const isLong of [true, false])
      for (const minOutput of [0n, 10n ** 10n]) {
        const plan = await build([{ ...order(kind, isLong), minOutput }]);
        let saved = 0;
        const compact = mutateInstructions(plan, (instructions) =>
          instructions.map((ix) => {
            if (ix.programAddress !== GMSOL_STORE_PROGRAM_ID) return ix;
            const original = copySolanaBytes(ix.data!);
            const accounts = [...ix.accounts!].map((account) => account.address);
            const data = compactCreateOrderData(original, accounts);
            saved += original.length - data.length;
            const before = decodeGmsolInstruction(original, accounts);
            if (before.name === "create_order_v2") {
              const after = decodeGmsolInstruction(data, accounts);
              before.reader.read(32);
              after.reader.read(32);
              const expected = readCreateOrderParams(before.reader);
              expect(readCreateOrderParams(after.reader)).toEqual({
                ...expected,
                minOutput: minOutput === 0n ? undefined : expected.minOutput,
              });
            }
            return { ...ix, data };
          })
        );
        expect(saved).toBe(minOutput === 0n ? 16 : 0);
        await expect(validateGmsolTransactionPlan(compact)).resolves.toBeDefined();
        if (minOutput === 0n && compact.action.type === "create") {
          compact.action.orders[0].minOutput = 10n ** 10n;
          await expect(validateGmsolTransactionPlan(compact)).rejects.toThrow("Unexpected order minOutput");
        }
      }
});
it("rejects unexpected programs, gmsol instructions, receivers, amounts and truncated input FESOL-56", async () => {
  const plan = await build([order()]);
  for (const mutation of ["program", "gmsol", "receiver", "amount", "truncated"] as const) {
    const malicious = mutateInstructions(plan, (ixs) =>
      ixs.map((ix) => {
        if (ix.programAddress !== GMSOL_STORE_PROGRAM_ID || ix.data?.[0] !== 200) return ix;
        const data = copySolanaBytes(ix.data!);
        const accounts = [...ix.accounts!];
        if (mutation === "program") return { ...ix, programAddress: address(other) };
        if (mutation === "gmsol") data[0] = 0;
        if (mutation === "receiver") accounts[1] = { ...accounts[1], address: address(other) };
        if (mutation === "amount") data[51] ^= 1;
        return { ...ix, accounts, data: mutation === "truncated" ? data.slice(0, 45) : data };
      })
    );
    await expect(validateGmsolTransactionPlan(malicious), mutation).rejects.toThrow();
  }
  const unresolved = await build([order()], false, {
    [GMSOL_LOOKUP_TABLE_ADDRESSES[0]]: decodeGmsolTransaction(plan.groups[0][0], plan).compiled.staticAccounts.filter(
      (k) => k !== owner
    ),
  });
  unresolved.lookupTables = {};
  await expect(validateGmsolTransactionPlan(unresolved)).rejects.toThrow(/lookup/i);
});

beforeEach(() => {
  localStorage.removeItem("gmsol-pending-submissions");
  transport.loadSdk.mockResolvedValue(sdk);
  transport.flags.mockReset().mockResolvedValue(true);
  const respond = (result: unknown) => vi.fn(() => ({ send: async () => result }));
  transport.rpc = {
    getBalance: respond({ value: 1000000000n }),
    getFeeForMessage: respond({ value: 5000n }),
    simulateTransaction: respond({ context: { slot: 1n }, value: { err: null, accounts: [{ lamports: 990000000n }] } }),
    getBlockHeight: respond(1n),
    getLatestBlockhash: respond({ value: { blockhash: lifetime.recentBlockhash, lastValidBlockHeight: 1n } }),
    getSignatureStatuses: respond({ value: [{ err: null, confirmationStatus: "confirmed", slot: 2n }] }),
    sendTransaction: vi.fn((encoded: string) => ({
      send: async () =>
        getSignatureFromTransaction(
          getTransactionDecoder().decode(copySolanaBytes(getBase64Encoder().encode(encoded)))
        ),
    })),
  };
});
async function sendFixture() {
  const plan = await build([order()]);
  transport.tables = { [GMSOL_LOOKUP_TABLE_ADDRESSES[0]]: [], [GMSOL_LOOKUP_TABLE_ADDRESSES[1]]: [] };
  plan.lookupTables = transport.tables;
  const sign = vi.fn(async (bytes: Uint8Array) =>
    copySolanaBytes(
      getTransactionEncoder().encode(await signTransaction([signingKey], getTransactionDecoder().decode(bytes)))
    )
  );
  return { plan, sign };
}
it("confirms a real Ed25519 signature and preserves confirmed success when refresh fails FESOL-56", async () => {
  const { plan, sign } = await sendFixture();
  const result = await sendGmsolOrderTransactions({
    plan,
    getWalletAddress: () => owner,
    signTransaction: sign,
    onConfirmed: async () => {
      throw new Error("API indexing delayed");
    },
  });
  expect(result.signatures).toHaveLength(1);
  expect(result.slot).toBe(2n);
  expect(result.refreshErrors).toHaveLength(1);
  expect(sign).toHaveBeenCalledTimes(1);
});
it("blocks signing on preflight failure and blocks sending after the trading flag changes FESOL-56", async () => {
  for (const failure of ["simulation", "funds", "flag-before", "flag-after", "wallet-message"] as const) {
    const { plan, sign } = await sendFixture();
    transport.flags.mockReset().mockResolvedValue(true);
    transport.rpc.sendTransaction.mockClear();
    transport.rpc.simulateTransaction.mockReturnValue({
      send: async () => ({
        context: { slot: 1n },
        value: {
          err: failure === "simulation" ? { InstructionError: [0, "Custom"] } : null,
          accounts: [{ lamports: 990000000n }],
        },
      }),
    });
    transport.rpc.getBalance.mockReturnValue({ send: async () => ({ value: failure === "funds" ? 0n : 1000000000n }) });
    if (failure === "flag-before") transport.flags.mockResolvedValue(false);
    if (failure === "flag-after") transport.flags.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    if (failure === "wallet-message")
      sign.mockImplementationOnce(async () => {
        const changed = mutateInstructions(plan, (ix) => ix.slice(1));
        return changed.groups[0][0];
      });
    await expect(
      sendGmsolOrderTransactions({
        plan,
        getWalletAddress: () => owner,
        signTransaction: sign,
        onConfirmed: async () => undefined,
      }),
      failure
    ).rejects.toThrow();
    expect(transport.rpc.sendTransaction, failure).not.toHaveBeenCalled();
    expect(sign.mock.calls.length, failure).toBe(failure === "flag-after" || failure === "wallet-message" ? 1 : 0);
  }
});

it("recovers from a definitive send rejection without clearing another submission TRD-72", async () => {
  for (const replaced of [false, true]) {
    localStorage.removeItem("gmsol-pending-submissions");
    const { plan, sign } = await sendFixture();
    const replacement = getBase58Decoder().decode(new Uint8Array(64).fill(1));
    const rejection = getSolanaErrorFromJsonRpcError({
      code: -32002,
      message: "Transaction simulation failed",
      data: { err: { InsufficientFundsForRent: { account_index: 1 } }, logs: [] },
    });
    transport.rpc.sendTransaction.mockImplementationOnce(() => ({
      send: async () => {
        if (replaced) {
          setPendingGmsolSubmission(owner, { ...getPendingGmsolSubmission(owner)!, signature: replacement });
        }
        throw rejection;
      },
    }));
    const send = () =>
      sendGmsolOrderTransactions({
        plan,
        getWalletAddress: () => owner,
        signTransaction: sign,
        onConfirmed: async () => undefined,
      });
    await expect(send()).rejects.toMatchObject({
      originalError: rejection,
      pendingSignature: undefined,
      submittedSignatures: [],
    });
    if (replaced) {
      expect(getPendingGmsolSubmission(owner)?.signature).toBe(replacement);
    } else {
      expect(getPendingGmsolSubmission(owner)).toBeUndefined();
      expect(await reconcileGmsolSubmission(owner)).toBeUndefined();
      expect((await send()).signatures).toHaveLength(1);
    }
  }
});

it("retains an ambiguous broadcast signature for reconciliation FESOL-56", async () => {
  const { plan, sign } = await sendFixture();
  transport.rpc.sendTransaction.mockReturnValue({
    send: async () => {
      throw new Error("RPC timeout");
    },
  });
  try {
    await sendGmsolOrderTransactions({
      plan,
      getWalletAddress: () => owner,
      signTransaction: sign,
      onConfirmed: async () => undefined,
    });
    throw new Error("Expected an ambiguous send failure");
  } catch (error) {
    expect(error).toBeInstanceOf(GmsolTransactionError);
    const failure = error as GmsolTransactionError;
    expect(failure.pendingSignature).toMatch(/^[1-9A-HJ-NP-Za-km-z]{80,90}$/);
    expect(failure.submittedSignatures).toEqual([]);
    expect(failure.message).toContain("before retrying");
  }
});
it("preserves token versus USD minimum-output units and rejects dust edits FESOL-56", () => {
  const changes = {
    kind: "LimitIncrease" as const,
    indexTokenDecimals: 8,
    isLong: true,
    sizeDeltaUsd: undefined,
    acceptablePrice: undefined,
    triggerPrice: undefined,
    minOutput: 1234567n,
    validFromTs: undefined,
  };
  expect(toGmsolUpdateParams(changes).min_output).toBe(1234567n);
  expect(toGmsolUpdateParams({ ...changes, kind: "LimitDecrease", minOutput: 10n ** 30n }).min_output).toBe(10n ** 20n);
  expect(() => toGmsolUpdateParams({ ...changes, sizeDeltaUsd: 1n })).toThrow(/smallest gmsol unit/);
});

it("preserves gmsol price bounds through the real WASM for both sides and all order kinds FESOL-56", async () => {
  const precision = 10n ** 30n;
  const priceUnit = 10n ** 18n; // BTC has 8 decimals; gmsol USD has 20.
  const indexPrice = 90_000n * precision + priceUnit / 2n;
  const tokens = mockTokensData({ BTC: { decimals: 8, prices: { minPrice: indexPrice, maxPrice: indexPrice } } });
  const mathMarket = { ...mockMarginCheckMarketInfo(tokens), tradeMath: "gmsol" as const };
  for (const kind of [
    "MarketIncrease",
    "LimitIncrease",
    "MarketDecrease",
    "LimitDecrease",
    "StopLossDecrease",
  ] as const) {
    for (const isLong of [true, false]) {
      const input = order(kind, isLong);
      const isIncrease = kind.includes("Increase");
      const isMarket = kind.includes("Market");
      const math = getAcceptablePriceInfo({
        marketInfo: mathMarket,
        isIncrease,
        isLimit: !isMarket,
        isLong,
        indexPrice,
        sizeDeltaUsd: input.sizeDeltaUsd,
        maxNegativePriceImpactBps: undefined,
      });
      const plan = await build([
        {
          ...input,
          acceptablePrice: math.acceptablePrice,
          triggerPrice: isMarket ? undefined : indexPrice,
          minOutput: isIncrease ? 1234567n : precision + 1n,
        },
      ]);
      const instructions = plan.groups
        .flat()
        .flatMap((bytes) => decodeGmsolTransaction(bytes, plan).message.instructions);
      const create = instructions
        .map((ix) =>
          ix.programAddress === GMSOL_STORE_PROGRAM_ID
            ? decodeGmsolInstruction(
                copySolanaBytes(ix.data!),
                [...ix.accounts!].map((account) => account.address)
              )
            : undefined
        )
        .find((ix) => ix?.name === "create_order_v2")!;
      create.reader.read(32);
      const params = readCreateOrderParams(create.reader);
      expect(params.size).toBe(10n ** 21n);
      expect(params.minOutput).toBe(isIncrease ? 1234567n : 10n ** 20n + 1n);
      const bound = params.acceptablePrice! * priceUnit;
      const maximum = isLong === isIncrease;
      expect(maximum ? bound <= math.acceptablePrice : bound >= math.acceptablePrice).toBe(true);
      expect(maximum ? math.acceptablePrice - bound : bound - math.acceptablePrice).toBeLessThan(priceUnit);
      if (!isMarket) {
        const ceil = kind === "LimitDecrease" ? isLong : !isLong;
        expect(params.triggerPrice).toBe(90_000n * 10n ** 12n + (ceil ? 1n : 0n));
      }
    }
  }
  for (const isLong of [true, false]) {
    expect(
      toGmsolOrderParams({ ...order("LimitIncrease", isLong), acceptablePrice: isLong ? maxUint256 : 0n })
        .acceptable_price
    ).toBeUndefined();
    expect(() => toGmsolOrderParams({ ...order("MarketIncrease", isLong), acceptablePrice: 0n })).toThrow(
      /finite positive/
    );
  }
});

it("snapshots order intent before asynchronous RPC preparation FESOL-56", async () => {
  const input = order();
  let resolveBlockhash!: (value: unknown) => void;
  transport.tables = {};
  transport.rpc.getLatestBlockhash.mockReturnValue({
    send: () =>
      new Promise((resolve) => {
        resolveBlockhash = resolve;
      }),
  });
  const preparing = prepareGmsolOrderTransactions({
    owner,
    action: { type: "create", orders: [input], atomic: false },
  });
  input.sizeDeltaUsd = 20n * 10n ** 30n;
  resolveBlockhash({ value: { blockhash: lifetime.recentBlockhash, lastValidBlockHeight: 1n } });
  const plan = await preparing;
  expect(plan.action).toMatchObject({ type: "create", orders: [{ sizeDeltaUsd: 10n ** 31n }] });
  await expect(validateGmsolTransactionPlan(plan)).resolves.toBeDefined();
});

it("does not broadcast after rejection, wallet changes, expiry or an invalid signature FESOL-56", async () => {
  for (const failure of ["reject", "wallet", "expired-before", "expired-after", "signature", "fee"] as const) {
    const { plan, sign } = await sendFixture();
    transport.rpc.sendTransaction.mockClear();
    transport.rpc.getBlockHeight.mockReturnValue({ send: async () => 1n });
    transport.rpc.getFeeForMessage.mockReturnValue({ send: async () => ({ value: failure === "fee" ? null : 5000n }) });
    let connected: string | undefined = owner;
    if (failure === "reject") sign.mockRejectedValueOnce(new Error("User rejected signature"));
    if (failure === "wallet")
      sign.mockImplementationOnce(async (bytes) => {
        connected = other;
        return signTransactionBytes(bytes);
      });
    if (failure === "signature") sign.mockImplementationOnce(async (bytes) => bytes);
    if (failure === "expired-before") transport.rpc.getBlockHeight.mockReturnValue({ send: async () => 2n });
    if (failure === "expired-after")
      transport.rpc.getBlockHeight
        .mockReturnValueOnce({ send: async () => 1n })
        .mockReturnValue({ send: async () => 2n });
    await expect(
      sendGmsolOrderTransactions({
        plan,
        getWalletAddress: () => connected,
        signTransaction: sign,
        onConfirmed: async () => undefined,
      }),
      failure
    ).rejects.toBeInstanceOf(GmsolTransactionError);
    expect(transport.rpc.sendTransaction, failure).not.toHaveBeenCalled();
  }
});

async function signTransactionBytes(bytes: Uint8Array) {
  return copySolanaBytes(
    getTransactionEncoder().encode(await signTransaction([signingKey], getTransactionDecoder().decode(bytes)))
  );
}

it("retains the accepted signature when confirmation times out FESOL-56", async () => {
  const { plan, sign } = await sendFixture();
  transport.rpc.getSignatureStatuses.mockReturnValue({ send: async () => ({ value: [null] }) });
  const clock = vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValue(90_001);
  try {
    const error = await sendGmsolOrderTransactions({
      plan,
      getWalletAddress: () => owner,
      signTransaction: sign,
      onConfirmed: async () => undefined,
    }).catch((error: unknown) => error);
    expect(error).toBeInstanceOf(GmsolTransactionError);
    const failure = error as GmsolTransactionError;
    expect(failure.submittedSignatures).toHaveLength(1);
    expect(failure.pendingSignature).toBe(failure.submittedSignatures[0]);
    expect(failure.message).toContain("before retrying");
  } finally {
    clock.mockRestore();
  }
});

it("preserves confirmed preparation when the later order signature is rejected FESOL-56", async () => {
  const { plan, sign } = await sendFixture();
  const isCreate = (ix: Instruction) => ix.programAddress === GMSOL_STORE_PROGRAM_ID && ix.data?.[0] === 200;
  const preparation = mutateInstructions(plan, (ixs) => ixs.filter((ix) => !isCreate(ix)));
  const creation = mutateInstructions(plan, (ixs) => ixs.filter((ix) => isCreate(ix) || ix.accounts?.length === 0));
  plan.groups = [preparation.groups[0], creation.groups[0]];
  await expect(validateGmsolTransactionPlan(plan)).resolves.toBeDefined();
  sign.mockImplementationOnce(signTransactionBytes).mockRejectedValueOnce(new Error("User rejected order"));
  const confirmed: string[] = [];
  const error = await sendGmsolOrderTransactions({
    plan,
    getWalletAddress: () => owner,
    signTransaction: sign,
    onConfirmed: async ({ signature }) => {
      confirmed.push(signature);
    },
  }).catch((error: unknown) => error);
  expect(error).toBeInstanceOf(GmsolTransactionError);
  const failure = error as GmsolTransactionError;
  expect(failure.submittedSignatures).toEqual(confirmed);
  expect(confirmed).toHaveLength(1);
  expect(failure.pendingSignature).toBeUndefined();
  expect(transport.rpc.sendTransaction).toHaveBeenCalledTimes(1);
});

it("reconciles a retained broadcast before another signature and never guesses from missing history FESOL-56", async () => {
  const { plan, sign } = await sendFixture();
  transport.rpc.sendTransaction.mockReturnValue({
    send: async () => {
      throw new Error("transport timeout");
    },
  });
  const send = () =>
    sendGmsolOrderTransactions({
      plan,
      getWalletAddress: () => owner,
      signTransaction: sign,
      onConfirmed: async () => undefined,
    });
  await expect(send()).rejects.toThrow("before retrying");
  const retained = getPendingGmsolSubmission(owner)!;
  expect(retained.orderAddresses).toHaveLength(1);
  expect(getPendingGmsolSubmission(other)).toBeUndefined();
  const signatures = sign.mock.calls.length;
  await expect(send()).rejects.toThrow("before retrying");
  expect(sign.mock.calls.length).toBe(signatures);
  for (const status of [null, { err: null, confirmationStatus: "processed", slot: 2n }]) {
    transport.rpc.getSignatureStatuses.mockReturnValue({ send: async () => ({ value: [status] }) });
    await expect(reconcileGmsolSubmission(owner)).rejects.toThrow("not yet confirmed");
    expect(getPendingGmsolSubmission(owner)).toEqual(retained);
  }
  transport.rpc.getSignatureStatuses.mockReturnValue({
    send: async () => ({ value: [{ err: null, confirmationStatus: "confirmed", slot: 3n }] }),
  });
  expect(await reconcileGmsolSubmission(owner)).toEqual({ ...retained, failed: false, slot: 3n });
  expect(getPendingGmsolSubmission(owner)).toEqual(retained);
});

// Phantom's observed account/token assertion encodings, including Borsh LogLevel ordinal 4.
const lighthouse = address("L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95");
const accountAssertion = Uint8Array.of(6, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
const tokenAssertion = Uint8Array.of(
  10,
  4,
  4,
  2,
  156,
  177,
  63,
  1,
  0,
  0,
  0,
  0,
  4,
  3,
  0,
  0,
  6,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  5,
  8
);
function walletMessage(plan: GmsolTransactionPlan, change: (ix: Instruction[]) => Instruction[]) {
  const { message } = decodeGmsolTransaction(plan.groups[0][0], plan);
  const assertion: Instruction = {
    programAddress: lighthouse,
    accounts: [{ address: address(owner), role: 3 }],
    data: accountAssertion,
  };
  return compileTransaction(
    compressTransactionMessageUsingAddressLookupTables(
      {
        version: 0,
        feePayer: { address: address(owner) },
        lifetimeConstraint: {
          blockhash: blockhash(plan.recentBlockhash),
          lastValidBlockHeight: plan.lastValidBlockHeight,
        },
        instructions: change([assertion, ...message.instructions, { ...assertion, data: tokenAssertion }]),
      },
      Object.fromEntries(Object.entries(plan.lookupTables).map(([key, values]) => [key, values.map(address)]))
    )
  );
}

it("accepts Phantom protection assertions with real signatures and preserved LUTs TRD-72", async () => {
  const fixture = await sendFixture();
  const keys = decodeGmsolTransaction(fixture.plan.groups[0][0], fixture.plan).compiled.staticAccounts.filter(
    (k) => k !== owner
  );
  for (const tables of [{}, { [GMSOL_LOOKUP_TABLE_ADDRESSES[0]]: keys }]) {
    const plan = await build([order()], false, tables);
    const lookupTables = { ...transport.tables, ...tables };
    plan.lookupTables = lookupTables;
    transport.tables = lookupTables;
    const signed = await signTransaction(
      [signingKey],
      walletMessage(plan, (ix) => ix)
    );
    const signedBytes = copySolanaBytes(getTransactionEncoder().encode(signed));
    expect(validateGmsolWalletTransaction({ originalBytes: plan.groups[0][0], signedBytes, plan }).hasAssertions).toBe(
      true
    );
    const result = await sendGmsolOrderTransactions({
      plan,
      getWalletAddress: () => owner,
      signTransaction: async () => signedBytes,
      onConfirmed: async () => undefined,
    });
    expect(result.signatures).toEqual([getSignatureFromTransaction(signed)]);
    const sent = getTransactionDecoder().decode(
      copySolanaBytes(getBase64Encoder().encode(transport.rpc.sendTransaction.mock.lastCall![0]))
    );
    expect(copySolanaBytes(sent.messageBytes)).toEqual(copySolanaBytes(signed.messageBytes));
  }
});

it("rejects wallet mutations and unsupported or malformed Lighthouse instructions TRD-72", async () => {
  const { plan } = await sendFixture();
  const changes: Record<string, (ix: Instruction[]) => Instruction[]> = {
    remove: (ix) => ix.filter((_, i) => i !== 2),
    reorder: (ix) => [ix[0], ix[2], ix[1], ...ix.slice(3)],
    fees: (ix) => ix.map((x, i) => (i === 1 ? { ...x, data: Uint8Array.of(2, 1, 0, 0, 0) } : x)),
    program: (ix) => ix.map((x, i) => (i === 0 ? { ...x, programAddress: address(other) } : x)),
    unrelated: (ix) => ix.map((x, i) => (i === 0 ? { ...x, accounts: [{ address: address(other), role: 0 }] } : x)),
    permissions: (ix) =>
      ix.map((x, i) => (i === 0 ? { ...x, accounts: [{ address: address(GMSOL_STORE_ADDRESS), role: 1 }] } : x)),
    extraAccounts: (ix) => ix.map((x, i) => (i === 0 ? { ...x, accounts: [...x.accounts!, ...x.accounts!] } : x)),
    memoryWrite: (ix) => ix.map((x, i) => (i === 0 ? { ...x, data: Uint8Array.of(0, 4, 1) } : x)),
    memoryClose: (ix) => ix.map((x, i) => (i === 0 ? { ...x, data: Uint8Array.of(1, 4, 1) } : x)),
    truncated: (ix) => ix.map((x, i) => (i === 0 ? { ...x, data: accountAssertion.slice(0, -1) } : x)),
    trailing: (ix) => ix.map((x, i) => (i === 0 ? { ...x, data: Uint8Array.from([...accountAssertion, 0]) } : x)),
    unknownField: (ix) => ix.map((x, i) => (i === 0 ? { ...x, data: Uint8Array.of(6, 4, 1, 9) } : x)),
    unknownLog: (ix) =>
      ix.map((x, i) => (i === 0 ? { ...x, data: Uint8Array.of(6, 7, 1, 0, ...new Uint8Array(9)) } : x)),
    compact: (ix) =>
      ix.map((x, i) => (i === 0 ? { ...x, data: Uint8Array.of(6, 4, 129, 0, 0, ...new Uint8Array(9)) } : x)),
  };
  for (const [name, change] of Object.entries(changes)) {
    const signedBytes = copySolanaBytes(getTransactionEncoder().encode(walletMessage(plan, change)));
    expect(
      () => validateGmsolWalletTransaction({ originalBytes: plan.groups[0][0], signedBytes, plan }),
      name
    ).toThrow();
  }
});

it("blocks broadcast when the signed Lighthouse simulation fails TRD-72", async () => {
  const { plan } = await sendFixture();
  const signed = await signTransaction(
    [signingKey],
    walletMessage(plan, (ix) => ix)
  );
  transport.rpc.simulateTransaction
    .mockReturnValueOnce({
      send: async () => ({
        context: { slot: 1n },
        value: { err: null, accounts: [{ lamports: 990000000n }] },
      }),
    })
    .mockReturnValueOnce({ send: async () => ({ value: { err: { InstructionError: [0, "Custom"] } } }) });
  await expect(
    sendGmsolOrderTransactions({
      plan,
      getWalletAddress: () => owner,
      signTransaction: async () => copySolanaBytes(getTransactionEncoder().encode(signed)),
      onConfirmed: async () => undefined,
    })
  ).rejects.toThrow("Solana simulation failed");
  expect(transport.rpc.sendTransaction).not.toHaveBeenCalled();
});
