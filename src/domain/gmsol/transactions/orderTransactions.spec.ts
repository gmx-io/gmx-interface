import type * as Sdk from "@gmsol-labs/gmsol-sdk";
import * as wasm from "@gmsol-labs/gmsol-sdk/index_bg.js";
import {
  AccountRole,
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
import {
  GMSOL_STORE_PROGRAM_ID,
  GMSOL_STORE_ADDRESS,
  SOLANA_SYSTEM_PROGRAM_ID,
  SOLANA_TOKEN_PROGRAM_ID,
} from "config/gmsol/program";
import { GMSOL_SDK_WASM_SHA256 } from "config/gmsol/sdk";
import { GMSOL_TOKENS } from "config/gmsol/tokens";
import { copySolanaBytes } from "lib/solana/bytes";
import { mockMarginCheckMarketInfo, mockTokensData } from "sdk/test/mock";
import { getAcceptablePriceInfo } from "sdk/utils/prices";

import {
  ASSOCIATED_TOKEN_PROGRAM,
  COMPUTE_BUDGET_PROGRAM,
  WRAPPED_SOL_MINT,
  getGmsolAta,
  getGmsolPositionAddress,
  gmsolPda,
} from "./addresses";
import { buildGmsolOrderTransactions } from "./buildOrderTransactions";
import { compactCreateOrderData, decodeGmsolInstruction, readCreateOrderParams } from "./decodeInstruction";
import { toGmsolOrderParams, toGmsolUpdateParams } from "./orderInputs";
import {
  getPendingGmsolSubmission,
  GmsolSubmissionExpiredError,
  reconcileGmsolSubmission,
  setPendingGmsolSubmission,
} from "./pendingSubmission";
import {
  GmsolTransactionError,
  GmsolWalletPromptTimeoutError,
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
  balances: vi.fn(),
}));
vi.mock("../loadGmsolSdk", () => ({ loadGmsolSdk: () => transport.loadSdk() }));
vi.mock("lib/solana/balances", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fetchSolanaBalances: () => transport.balances(),
}));
vi.mock("lib/solana/rpc", () => ({ getSolanaRpc: () => transport.rpc }));
vi.mock("lib/solana/lookupTables", () => ({ fetchGmsolLookupTables: async () => transport.tables }));
vi.mock("../fetchSolanaTradingEnabled", () => ({ fetchSolanaTradingEnabled: () => transport.flags() }));

const sdk = wasm as unknown as typeof Sdk;
const market = GMSOL_MARKETS.find((m) => m.marketTokenAddress === "Dqq58gS1TgRMDouUbdvhhzc51XXTNHG921WLxH9X2eB8")!;
const solMarket = GMSOL_MARKETS.find((m) => m.marketTokenAddress === "BvC73rarCMrhEnk3JmqaLntpnrwfUCR5eTrf7HQu6ieg")!;
let owner: string;
let signingKey: CryptoKeyPair;
let other: string;
const lifetime = { recentBlockhash: "11111111111111111111111111111111", lastValidBlockHeight: 1n };
// Mainnet's current rate rather than the long-standing default, so a hardcoded rent cannot pass.
const rentFor = (size: bigint) => (size + 128n) * 5_080n;
function order(kind: GmsolCreateOrder["kind"] = "LimitIncrease", isLong = true, selected = market): GmsolCreateOrder {
  return {
    kind,
    market: selected,
    collateralToken: selected.longTokenAddress,
    indexTokenDecimals: GMSOL_TOKENS.find((token) => token.address === selected.indexTokenAddress)!.decimals,
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
// Same layout as the frozen tables: shared accounts in the first, the market only in the second.
async function frozenTables(selected = market) {
  const marketPda = await gmsolPda("market", [GMSOL_STORE_ADDRESS, selected.marketTokenAddress]);
  const excluded = new Set([
    owner,
    marketPda,
    await gmsolPda("user", [GMSOL_STORE_ADDRESS, owner]),
    await getGmsolPositionAddress({
      owner,
      marketToken: selected.marketTokenAddress,
      collateralToken: selected.longTokenAddress,
      isLong: true,
    }),
    await getGmsolAta(owner, selected.longTokenAddress),
    await getGmsolAta(owner, selected.shortTokenAddress),
  ]);
  const single = await build([order("LimitIncrease", true, selected)]);
  const keys = single.groups
    .flat()
    .flatMap((bytes) => [...decodeGmsolTransaction(bytes, single).compiled.staticAccounts]);
  return {
    [GMSOL_LOOKUP_TABLE_ADDRESSES[0]]: [...new Set(keys)].filter((key) => !excluded.has(key)),
    [GMSOL_LOOKUP_TABLE_ADDRESSES[1]]: [marketPda],
  };
}
const instructionsOf = (plan: GmsolTransactionPlan) =>
  plan.groups.flat().map((bytes) => [...decodeGmsolTransaction(bytes, plan).message.instructions]);
const gmsolName = (ix: Instruction) =>
  ix.programAddress === GMSOL_STORE_PROGRAM_ID
    ? decodeGmsolInstruction(
        copySolanaBytes(ix.data!),
        (ix.accounts ?? []).map((account) => account.address)
      ).name
    : undefined;
function orderContext(kind: GmsolCreateOrder["kind"], isLong: boolean, orderAddress: string) {
  return {
    kind,
    isLong,
    address: orderAddress,
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
}
const orderUpdate = (kind: GmsolCreateOrder["kind"], isLong: boolean) => ({
  kind,
  indexTokenDecimals: 8,
  isLong,
  sizeDeltaUsd: 20n * 10n ** 30n,
  acceptablePrice: 100001n * 10n ** 30n,
  triggerPrice: 90001n * 10n ** 30n,
  minOutput: undefined,
  validFromTs: undefined,
});
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
  const lookupTables = await frozenTables();
  for (const kind of [
    "MarketIncrease",
    "LimitIncrease",
    "MarketDecrease",
    "LimitDecrease",
    "StopLossDecrease",
  ] as const)
    for (const isLong of [true, false]) {
      const plan = await build([order(kind, isLong)], false, lookupTables);
      const result = await validateGmsolTransactionPlan(plan);
      expect(result.orderAddresses).toHaveLength(1);
      // A new position also prefunds its position-cut order's keeper fee.
      expect(result.keeperLamports).toBe(kind.includes("Increase") ? 600000n : 300000n);
      const prepared = instructionsOf(plan)
        .flat()
        .filter((ix) => gmsolName(ix) === "prepare_position");
      expect(prepared, kind).toHaveLength(kind.includes("Increase") ? 1 : 0);
      const context = orderContext(kind, isLong, result.orderAddresses[0]);
      for (const action of [
        { type: "update" as const, order: context, changes: orderUpdate(kind, isLong) },
        { type: "cancel" as const, order: context },
      ]) {
        const edited = await buildGmsolOrderTransactions({ owner, action, ...lifetime, lookupTables, sdk });
        await expect(validateGmsolTransactionPlan(edited)).resolves.toBeDefined();
      }
    }
  // A swap escrows only its input and output tokens, and a cancel carries no order kind.
  const { kind: _kind, ...accounts } = orderContext("LimitIncrease", false, other);
  const swap = { ...accounts, finalOutputToken: market.shortTokenAddress, longToken: undefined, shortToken: undefined };
  const cancelled = await buildGmsolOrderTransactions({
    owner,
    action: { type: "cancel", order: swap },
    ...lifetime,
    lookupTables,
    sdk,
  });
  await expect(validateGmsolTransactionPlan(cancelled)).resolves.toBeDefined();
});
it("builds collateral-only market orders and keeps every other order sized TRD-83", async () => {
  for (const kind of ["MarketIncrease", "MarketDecrease"] as const)
    for (const isLong of [true, false]) {
      const plan = await build([{ ...order(kind, isLong), sizeDeltaUsd: 0n, collateralDeltaAmount: 1000000n }]);
      await validateGmsolTransactionPlan(plan);
      const create = plan.groups
        .flat()
        .flatMap((bytes) => decodeGmsolTransaction(bytes, plan).message.instructions)
        .filter((ix) => ix.programAddress === GMSOL_STORE_PROGRAM_ID)
        .map((ix) =>
          decodeGmsolInstruction(
            copySolanaBytes(ix.data!),
            [...ix.accounts!].map((a) => a.address)
          )
        )
        .find((ix) => ix.name === "create_order_v2")!;
      create.reader.read(32);
      expect(readCreateOrderParams(create.reader)).toMatchObject({ size: 0n, amount: 1000000n });
    }
  for (const [kind, sizeDeltaUsd, collateralDeltaAmount] of [
    ["MarketIncrease", 0n, 0n],
    ["MarketDecrease", 0n, 0n],
    ["LimitIncrease", 0n, 1000000n],
    ["LimitDecrease", 0n, 1000000n],
    ["StopLossDecrease", 0n, 1000000n],
  ] as const)
    expect(() => toGmsolOrderParams({ ...order(kind), sizeDeltaUsd, collateralDeltaAmount })).toThrow();
});
it("validates native SOL wrapping without allowing arbitrary token operations FESOL-56", async () => {
  const native = {
    ...order("MarketIncrease", true, solMarket),
    payToken: solMarket.longTokenAddress,
    payWithNativeSol: true,
    collateralDeltaAmount: 10000000n,
  };
  const plan = await build([native]);
  expect((await validateGmsolTransactionPlan(plan)).wrapLamports).toBe(10000000n);
});
it("keeps increase and TP/SL in one size-bounded v0 transaction with lookup tables FESOL-56", async () => {
  const tables = await frozenTables();
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
  const tables = await frozenTables(solMarket);
  const plan = await build(
    [
      order("MarketIncrease", true, solMarket),
      order("LimitDecrease", true, solMarket),
      order("StopLossDecrease", true, solMarket),
    ],
    true,
    tables
  );
  expect(plan.groups.map((group) => group.length)).toEqual([1, 1]);
  const instructions = instructionsOf(plan);
  const isOrder = (ix: Instruction) => gmsolName(ix) === "create_order_v2";
  expect(instructions.map((group) => group.filter(isOrder).length)).toEqual([0, 3]);
  const validated = await validateGmsolTransactionPlan(plan);
  expect(validated.transactionCosts.map((cost) => cost.keeperLamports)).toEqual([300000n, 900000n]);
  expect(validated.transactionCosts[1].createdAccounts).toEqual({ tokenAccount: 6, user: 0, position: 0, order: 3 });
  expect(plan.groups.flat().every((bytes) => bytes.length <= 1232)).toBe(true);
  for (const unsafe of [
    instructions[1].find(isOrder)!,
    instructions[1].find((ix) => ix.programAddress === ASSOCIATED_TOKEN_PROGRAM && ix.accounts?.[2].address !== owner)!,
  ]) {
    expect(unsafe).toBeDefined();
    const changed = structuredClone(plan);
    const kept = instructions[1].filter((ix) => ix !== unsafe);
    changed.groups = [[encode(plan, [...instructions[0], unsafe])], [encode(plan, kept)]];
    await expect(validateGmsolTransactionPlan(changed)).rejects.toThrow("must stay in the final transaction");
  }
  transport.tables = tables;
  transport.rpc.getSignatureStatuses.mockReturnValue({
    send: async () => ({
      value: [{ err: { InstructionError: [0, "Custom"] }, confirmationStatus: "confirmed", slot: 2n }],
    }),
  });
  const ordersReserve = 5000n + 900000n + 3n * rentFor(2472n) + 6n * rentFor(165n) + rentFor(0n);
  for (const postBalance of [ordersReserve - 1n, ordersReserve]) {
    transport.rpc.simulateTransaction.mockReturnValue({
      send: async () => ({ context: { slot: 1n }, value: { err: null, accounts: [{ lamports: postBalance }] } }),
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
    ).rejects.toThrow(postBalance < ordersReserve ? "Insufficient SOL" : "Solana transaction failed");
    expect(signedOrderCounts).toEqual(postBalance < ordersReserve ? [] : [0]);
  }
});
// The TradeBox's shape: a native increase that refunds as SOL, then SL before TP, which is not kind id order.
async function nativeAtomicFixture() {
  const tables = await frozenTables(solMarket);
  const action = {
    type: "create" as const,
    atomic: true,
    orders: [
      {
        ...order("MarketIncrease", true, solMarket),
        payToken: solMarket.longTokenAddress,
        payWithNativeSol: true,
        unwrapNative: true,
        collateralDeltaAmount: 5_000_000n,
      },
      order("StopLossDecrease", true, solMarket),
      order("LimitDecrease", true, solMarket),
    ],
  };
  return { tables, action };
}
it("wraps only the wallet WSOL shortfall before an indivisible native increase with TP/SL TRD-72", async () => {
  const { tables, action } = await nativeAtomicFixture();
  const isWrap = (ix: Instruction) =>
    ix.programAddress === SOLANA_SYSTEM_PROGRAM_ID || ix.programAddress === SOLANA_TOKEN_PROGRAM_ID;
  for (const [wrapped, shortfall] of [
    [0n, 5_000_000n],
    [2_000_000n, 3_000_000n],
    [5_000_000n, 0n],
    [7_000_000n, 0n],
  ] as const) {
    const plan = await buildGmsolOrderTransactions({
      owner,
      action,
      ...lifetime,
      lookupTables: tables,
      wrappedSolBalance: wrapped,
      sdk,
    });
    expect(plan.groups.map((group) => group.length)).toEqual([1, 1]);
    expect(plan.groups[1][0].length).toBe(1184);
    const [setup, orders] = instructionsOf(plan);
    expect(setup.filter(isWrap)).toHaveLength(shortfall > 0n ? 2 : 0);
    expect(orders.filter(isWrap)).toEqual([]);
    expect(
      orders.filter((ix) => ix.programAddress === ASSOCIATED_TOKEN_PROGRAM && ix.accounts?.[2].address !== owner)
    ).toHaveLength(6);
    const validated = await validateGmsolTransactionPlan(plan);
    expect(validated.orderAddresses).toHaveLength(3);
    expect(
      validated.transactionCosts.map(({ keeperLamports, wrapLamports }) => ({ keeperLamports, wrapLamports }))
    ).toEqual([
      { keeperLamports: 300000n, wrapLamports: shortfall },
      { keeperLamports: 900000n, wrapLamports: 0n },
    ]);
    const created = orders
      .filter((ix) => gmsolName(ix) === "create_order_v2")
      .map((ix) => {
        const decoded = decodeGmsolInstruction(
          copySolanaBytes(ix.data!),
          [...ix.accounts!].map((a) => a.address)
        );
        decoded.reader.read(32);
        const { kind, amount, unwrapNative } = readCreateOrderParams(decoded.reader);
        return [kind, amount, unwrapNative];
      });
    expect(created).toEqual([
      [3n, 5_000_000n, true],
      [8n, 0n, false],
      [7n, 0n, false],
    ]);
    // A plan built before an earlier wrap confirmed cannot wrap again.
    if (shortfall > 0n) {
      await expect(validateGmsolTransactionPlan({ ...plan, wrappedSolBalance: wrapped + shortfall })).rejects.toThrow(
        "Unexpected SOL transfer amount"
      );
    }
    await expect(validateGmsolTransactionPlan({ ...plan, wrappedSolBalance: undefined })).rejects.toThrow(
      "Invalid wrapped SOL snapshot"
    );
  }
});
it("signs native wrapping only against an unchanged wallet WSOL snapshot TRD-72", async () => {
  const { tables, action } = await nativeAtomicFixture();
  const wsol = (amount: bigint) => ({ [WRAPPED_SOL_MINT]: amount });
  transport.tables = tables;
  transport.balances.mockResolvedValue(wsol(2_000_000n));
  const plan = await prepareGmsolOrderTransactions({ owner, action });
  expect(plan.wrappedSolBalance).toBe(2_000_000n);
  // The original blockhash has expired by the second prompt; only one the sender fetched after the setup is valid.
  const fresh = { recentBlockhash: other, lastValidBlockHeight: 3n };
  transport.rpc.getLatestBlockhash.mockReturnValue({
    send: async () => ({
      context: { slot: 2n },
      value: { blockhash: fresh.recentBlockhash, lastValidBlockHeight: fresh.lastValidBlockHeight },
    }),
  });
  transport.rpc.getEpochInfo.mockReturnValue({ send: async () => ({ blockHeight: 2n, absoluteSlot: 2n }) });
  for (const failure of ["stale", "changed-after-signing", "unavailable", undefined] as const) {
    localStorage.removeItem("gmsol-pending-submissions");
    transport.rpc.sendTransaction.mockClear();
    transport.rpc.getBlockHeight
      .mockReset()
      .mockReturnValueOnce({ send: async () => 1n })
      .mockReturnValueOnce({ send: async () => 1n })
      .mockReturnValue({ send: async () => 2n });
    transport.balances.mockReset().mockResolvedValue(wsol(2_000_000n));
    if (failure === "stale") transport.balances.mockResolvedValue(wsol(5_000_000n));
    if (failure === "changed-after-signing") {
      transport.balances.mockResolvedValueOnce(wsol(2_000_000n)).mockResolvedValue(wsol(5_000_000n));
    }
    if (failure === "unavailable") transport.balances.mockRejectedValue(new Error("RPC unavailable"));
    const stored: unknown[][] = [];
    transport.rpc.getSignatureStatuses.mockImplementation(() => ({
      send: async () => {
        const record = getPendingGmsolSubmission(owner);
        stored.push([
          record?.lastValidBlockHeight,
          record?.confirmedSignatures,
          record?.wrappedLamports,
          record?.ownWrapLamports,
          record?.origin,
        ]);
        const status = stored.length === 2 ? null : { err: null, confirmationStatus: "confirmed", slot: 2n };
        return { context: { slot: 2n }, value: [status] };
      },
    }));
    let prompts = 0;
    let secondPrompt!: () => void;
    const prompted = new Promise<void>((resolve) => (secondPrompt = resolve));
    const sign = vi.fn(async (bytes: Uint8Array) => {
      if (++prompts === 2) secondPrompt();
      return signTransactionBytes(bytes);
    });
    const result = await sendGmsolOrderTransactions({
      plan,
      origin: "tradebox",
      getWalletAddress: () => owner,
      signTransaction: sign,
      // Settles only at the second prompt, so a send that waits for the setup's refresh first never gets there.
      onConfirmed: () => prompted,
    }).catch((error: unknown) => error);
    expect(result instanceof GmsolTransactionError, String(failure)).toBe(failure !== undefined);
    expect(sign.mock.calls.length, String(failure)).toBe(
      failure === undefined ? 2 : failure === "changed-after-signing" ? 1 : 0
    );
    expect(transport.rpc.sendTransaction.mock.calls.length, String(failure)).toBe(failure === undefined ? 2 : 0);
    if (failure === undefined) {
      const setup = [(result as { signatures: string[] }).signatures[0]];
      expect(stored).toEqual([
        ["1", undefined, undefined, "3000000", "tradebox"],
        ["3", setup, "3000000", undefined, "tradebox"],
        ["3", setup, "3000000", undefined, "tradebox"],
      ]);
      const signedOrders = decodeGmsolTransaction(sign.mock.calls[1][0], { ...plan, ...fresh });
      expect(signedOrders.compiled.lifetimeToken).toBe(fresh.recentBlockhash);
      expect([...signedOrders.message.instructions]).toEqual([
        ...decodeGmsolTransaction(plan.groups[1][0], plan).message.instructions,
      ]);
    }
  }
});
function compile(plan: GmsolTransactionPlan, instructions: Instruction[]) {
  return compileTransaction(
    compressTransactionMessageUsingAddressLookupTables(
      {
        version: 0,
        feePayer: { address: address(plan.owner) },
        lifetimeConstraint: {
          blockhash: blockhash(plan.recentBlockhash),
          lastValidBlockHeight: plan.lastValidBlockHeight,
        },
        instructions,
      },
      Object.fromEntries(Object.entries(plan.lookupTables).map(([key, values]) => [key, values.map(address)]))
    )
  );
}
const encode = (plan: GmsolTransactionPlan, instructions: Instruction[]) =>
  copySolanaBytes(getTransactionEncoder().encode(compile(plan, instructions)));
function mutateInstructions(plan: GmsolTransactionPlan, change: (ix: Instruction[]) => Instruction[]) {
  const next = structuredClone(plan);
  next.groups = [[encode(next, change([...decodeGmsolTransaction(next.groups[0][0], next).message.instructions]))]];
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
type Mutation = (ixs: Instruction[]) => Instruction[];
const foreignProgram: Mutation = (ixs) => [
  ...ixs,
  { ...ixs.find((ix) => gmsolName(ix) !== undefined)!, programAddress: address(other) },
];
const where =
  (match: (ix: Instruction) => boolean, change: (ix: Instruction) => Instruction): Mutation =>
  (ixs) =>
    ixs.map((ix) => (match(ix) ? change(ix) : ix));
const named = (name: string) => (ix: Instruction) => gmsolName(ix) === name;
const isComputePrice = (ix: Instruction) => ix.programAddress === COMPUTE_BUDGET_PROGRAM && ix.data?.[0] === 3;
const isAta = (ix: Instruction) => ix.programAddress === ASSOCIATED_TOKEN_PROGRAM;
const otherAccount = (index: number) => (ix: Instruction) => ({
  ...ix,
  accounts: ix.accounts!.map((account, i) =>
    i === index ? { address: address(other), role: AccountRole.READONLY } : account
  ),
});
const flipByte = (offset: number) => (ix: Instruction) => {
  const data = copySolanaBytes(ix.data!);
  data[offset] ^= 1;
  return { ...ix, data };
};
const truncate = (length: number) => (ix: Instruction) => ({ ...ix, data: copySolanaBytes(ix.data!).slice(0, length) });
async function expectRejections(plan: GmsolTransactionPlan, rows: [string, Mutation][]) {
  for (const [message, change] of rows)
    await expect(validateGmsolTransactionPlan(mutateInstructions(plan, change)), message).rejects.toThrow(message);
}
it("rejects each create rule at its own check on the frozen tables FESOL-56", async () => {
  const tables = await frozenTables();
  const plan = await build([order()], false, tables);
  const transfer: Instruction = {
    programAddress: address(SOLANA_SYSTEM_PROGRAM_ID),
    accounts: [
      { address: address(owner), role: AccountRole.WRITABLE_SIGNER },
      { address: address(other), role: AccountRole.WRITABLE },
    ],
    data: Uint8Array.of(2, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0),
  };
  await expectRejections(plan, [
    ["Unexpected instruction program", foreignProgram],
    ["Unexpected gmsol instruction", where(named("create_order_v2"), flipByte(0))],
    ["Unexpected receiver account", where(named("create_order_v2"), otherAccount(1))],
    ["Unexpected order executionLamports", where(named("create_order_v2"), flipByte(42))],
    ["Unexpected order amount", where(named("create_order_v2"), flipByte(51))],
    ["Truncated instruction data", where(named("create_order_v2"), truncate(45))],
    ["Invalid compute price", where(isComputePrice, flipByte(4))],
    ["Unexpected ATA owner or mint", where(isAta, otherAccount(2))],
    ["Unexpected SOL receiver", (ixs) => [...ixs, transfer]],
  ]);
  await expect(validateGmsolTransactionPlan({ ...plan, lookupTables: {} })).rejects.toThrow("Unresolved lookup table");
  await expect(build([order(), order("LimitDecrease")], true, tables)).rejects.toThrow(
    "TP/SL on a limit increase is not supported"
  );
});
it("rejects each update rule at its own check on the frozen tables FESOL-56", async () => {
  const lookupTables = await frozenTables();
  const orderAddress = await gmsolPda("order", [GMSOL_STORE_ADDRESS, owner], [new Uint8Array(32)]);
  const action = {
    type: "update" as const,
    order: orderContext("LimitIncrease", true, orderAddress),
    changes: orderUpdate("LimitIncrease", true),
  };
  const plan = await buildGmsolOrderTransactions({ owner, action, ...lifetime, lookupTables, sdk });
  await expectRejections(plan, [
    ["Unexpected instruction program", foreignProgram],
    ["Unexpected updated size_delta_value", where(named("update_order_v2"), flipByte(9))],
    ["Unexpected order account", where(named("update_order_v2"), otherAccount(3))],
  ]);
});
it("rejects each cancel rule at its own check on the frozen tables FESOL-56", async () => {
  const lookupTables = await frozenTables();
  const orderAddress = await gmsolPda("order", [GMSOL_STORE_ADDRESS, owner], [new Uint8Array(32)]);
  const action = { type: "cancel" as const, order: orderContext("LimitIncrease", true, orderAddress) };
  const plan = await buildGmsolOrderTransactions({ owner, action, ...lifetime, lookupTables, sdk });
  await expectRejections(plan, [
    ["Unexpected instruction program", foreignProgram],
    ["Unexpected receiver account", where(named("close_order_v2"), otherAccount(4))],
    ["Unexpected rent_receiver account", where(named("close_order_v2"), otherAccount(5))],
    ["Unexpected initial_collateral_token_ata account", where(named("close_order_v2"), otherAccount(17))],
    ["Unexpected close reason", where(named("close_order_v2"), flipByte(9))],
  ]);
  await expect(
    validateGmsolTransactionPlan({ ...plan, action: { ...action, order: { ...action.order, receiver: other } } })
  ).rejects.toThrow("Order owner and receivers must be the wallet");
});

beforeEach(() => {
  localStorage.removeItem("gmsol-pending-submissions");
  transport.loadSdk.mockResolvedValue(sdk);
  transport.flags.mockReset().mockResolvedValue(true);
  const respond = (result: unknown) => vi.fn(() => ({ send: async () => result }));
  transport.rpc = {
    getFeeForMessage: respond({ value: 5000n }),
    getMinimumBalanceForRentExemption: vi.fn((size: bigint) => ({ send: async () => rentFor(size) })),
    simulateTransaction: respond({ context: { slot: 1n }, value: { err: null, accounts: [{ lamports: 990000000n }] } }),
    getBlockHeight: respond(1n),
    getEpochInfo: respond({ blockHeight: 1n, absoluteSlot: 2n }),
    getLatestBlockhash: respond({
      context: { slot: 1n },
      value: { blockhash: lifetime.recentBlockhash, lastValidBlockHeight: 1n },
    }),
    getSignatureStatuses: respond({
      context: { slot: 2n },
      value: [{ err: null, confirmationStatus: "confirmed", slot: 2n }],
    }),
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
          accounts: [{ lamports: failure === "funds" ? rentFor(0n) - 1n : 990000000n }],
        },
      }),
    });
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
  resolveBlockhash({ context: { slot: 1n }, value: { blockhash: lifetime.recentBlockhash, lastValidBlockHeight: 1n } });
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

it("ends an unanswered wallet prompt at 120 s and never sends a later signature TRD-72", async () => {
  const { plan, sign } = await sendFixture();
  let open!: () => void;
  const prompted = new Promise<void>((resolve) => (open = resolve));
  let answer!: () => void;
  const answered = new Promise<void>((resolve) => (answer = resolve));
  sign.mockImplementationOnce(async (bytes) => {
    open();
    await answered;
    return signTransactionBytes(bytes);
  });
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  try {
    let settled = false;
    const sending = sendGmsolOrderTransactions({
      plan,
      getWalletAddress: () => owner,
      signTransaction: sign,
      onConfirmed: async () => undefined,
    });
    void sending
      .catch(() => undefined)
      .finally(() => {
        settled = true;
      });
    await prompted;
    await vi.advanceTimersByTimeAsync(119_999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(sending).rejects.toMatchObject({
      originalError: expect.any(GmsolWalletPromptTimeoutError),
      submittedSignatures: [],
      pendingSignature: undefined,
    });
  } finally {
    vi.useRealTimers();
  }
  answer();
  await sign.mock.results[0].value;
  // A send after the late signature would first need real signature verification and RPC reads.
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(sign).toHaveBeenCalledTimes(1);
  expect(transport.rpc.sendTransaction).not.toHaveBeenCalled();
  expect(getPendingGmsolSubmission(owner)).toBeUndefined();
});

it("keeps polling for 90 s through failed polls and drops a send only once its blockhash provably expired TRD-72", async () => {
  const confirmed = { err: null, confirmationStatus: "confirmed", slot: 2n };
  const rows = [
    ["confirmed", [null, { ...confirmed, confirmationStatus: "processed" }, confirmed]],
    ["confirmed", ["error", confirmed]],
    ["timeout", []],
    ["expired", []],
  ] as const;
  // Signing awaits real WebCrypto, so only the polling clock is faked.
  vi.useFakeTimers({ toFake: ["setTimeout", "Date"] });
  try {
    for (const [outcome, polls] of rows) {
      localStorage.removeItem("gmsol-pending-submissions");
      const { plan, sign } = await sendFixture();
      const queue: unknown[] = [...polls];
      let polled!: () => void;
      const firstPoll = new Promise<void>((resolve) => (polled = resolve));
      transport.rpc.getSignatureStatuses.mockImplementation(() => ({
        send: async () => {
          polled();
          const status = queue.shift() ?? null;
          if (status === "error") throw new Error("429 Too Many Requests");
          return { context: { slot: 3n }, value: [status] };
        },
      }));
      transport.rpc.getEpochInfo.mockReturnValue({
        send: async () => ({ blockHeight: outcome === "expired" ? 2n : 1n, absoluteSlot: 3n }),
      });
      let settled = false;
      const sending = sendGmsolOrderTransactions({
        plan,
        getWalletAddress: () => owner,
        signTransaction: sign,
        onConfirmed: async () => undefined,
      }).then(
        (result) => ({ result, error: undefined }),
        (error: GmsolTransactionError) => ({ result: undefined, error })
      );
      void sending.finally(() => {
        settled = true;
      });
      await firstPoll;
      if (outcome === "timeout") {
        await vi.advanceTimersByTimeAsync(89_000);
        expect(settled).toBe(false);
      }
      await vi.advanceTimersByTimeAsync(outcome === "confirmed" ? polls.length * 1_000 : 2_000);
      const { result, error } = await sending;
      if (outcome === "confirmed") {
        expect(result?.signatures).toHaveLength(1);
        expect(transport.rpc.getSignatureStatuses).toHaveBeenCalledTimes(polls.length);
      } else if (outcome === "timeout") {
        expect(error?.message).toContain("before retrying");
        expect(getPendingGmsolSubmission(owner)).toMatchObject({
          signature: error?.pendingSignature,
          lastValidBlockHeight: "1",
        });
      } else {
        expect(error?.originalError).toBeInstanceOf(GmsolSubmissionExpiredError);
        expect([error?.pendingSignature, error?.submittedSignatures]).toEqual([undefined, []]);
        expect(getPendingGmsolSubmission(owner)).toBeUndefined();
      }
      transport.rpc.getSignatureStatuses.mockClear();
    }
  } finally {
    vi.useRealTimers();
  }
});

it("resends the same signed bytes every 2 s without preflight until a confirmed status arrives TRD-72", async () => {
  const preflightRejection = getSolanaErrorFromJsonRpcError({
    code: -32002,
    message: "Transaction simulation failed",
    data: { err: "AlreadyProcessed", logs: [] },
  });
  const confirmed = { err: null, confirmationStatus: "confirmed", slot: 2n };
  const processed = { ...confirmed, confirmationStatus: "processed" };
  const rows = [
    ["accepted", [null, null, null, confirmed], [0, 2_000]],
    ["rejected", [null, null, null, confirmed], [0, 2_000]],
    ["preflight", [null, null, null, confirmed], [0, 2_000]],
    ["preflight", [null, null, null, null, null, confirmed], [0, 2_000, 4_000]],
    ["accepted", [null, processed, processed, processed, processed, confirmed], [0, 2_000, 4_000]],
  ] as const;
  vi.useFakeTimers({ toFake: ["setTimeout", "Date"] });
  try {
    for (const [resend, polls, offsets] of rows) {
      localStorage.removeItem("gmsol-pending-submissions");
      const { plan, sign } = await sendFixture();
      const sends: { at: number; wire: string; config: object }[] = [];
      transport.rpc.sendTransaction.mockImplementation((wire: string, config: object) => ({
        send: async () => {
          sends.push({ at: Date.now(), wire, config });
          if (sends.length > 1 && resend === "rejected") throw new Error("429 Too Many Requests");
          if (sends.length > 1 && resend === "preflight") throw preflightRejection;
          return getSignatureFromTransaction(
            getTransactionDecoder().decode(copySolanaBytes(getBase64Encoder().encode(wire)))
          );
        },
      }));
      const statuses: unknown[] = [...polls];
      const pendingAtPolls: (string | undefined)[] = [];
      let polled!: () => void;
      const firstPoll = new Promise<void>((resolve) => (polled = resolve));
      transport.rpc.getSignatureStatuses.mockImplementation(() => ({
        send: async () => {
          polled();
          pendingAtPolls.push(getPendingGmsolSubmission(owner)?.signature);
          return { context: { slot: 3n }, value: [statuses.shift() ?? null] };
        },
      }));
      const sending = sendGmsolOrderTransactions({
        plan,
        getWalletAddress: () => owner,
        signTransaction: sign,
        onConfirmed: async () => undefined,
      });
      await firstPoll;
      await vi.advanceTimersByTimeAsync((polls.length - 1) * 1_000);
      const { signatures } = await sending;
      await vi.advanceTimersByTimeAsync(10_000);
      expect(
        sends.map(({ at }) => at - sends[0].at),
        resend
      ).toEqual(offsets);
      expect(new Set(sends.map(({ wire }) => wire)).size).toBe(1);
      expect(sends.map(({ config }) => config)).toEqual([
        { encoding: "base64", skipPreflight: false, preflightCommitment: "confirmed", maxRetries: 0n },
        ...offsets.slice(1).map(() => ({ encoding: "base64", skipPreflight: true, maxRetries: 0n })),
      ]);
      expect(pendingAtPolls, resend).toEqual(Array(polls.length).fill(signatures[0]));
    }
  } finally {
    vi.useRealTimers();
  }
});

it("asks the wallet once more with a fresh blockhash when the signature expires before broadcast TRD-72", async () => {
  const fresh = { recentBlockhash: other, lastValidBlockHeight: 3n };
  for (const secondExpired of [false, true]) {
    localStorage.removeItem("gmsol-pending-submissions");
    const { plan, sign } = await sendFixture();
    transport.rpc.simulateTransaction.mockClear();
    transport.rpc.sendTransaction.mockClear();
    transport.rpc.getLatestBlockhash.mockReturnValue({
      send: async () => ({
        context: { slot: 2n },
        value: { blockhash: fresh.recentBlockhash, lastValidBlockHeight: fresh.lastValidBlockHeight },
      }),
    });
    // Before and after each prompt; the first signature arrives past its lastValidBlockHeight.
    const heights = [1n, 2n, 2n, secondExpired ? 4n : 3n];
    transport.rpc.getBlockHeight.mockImplementation(() => ({ send: async () => heights.shift() }));
    const atPrompts: unknown[] = [];
    sign.mockImplementation(async (bytes: Uint8Array) => {
      atPrompts.push([
        transport.rpc.simulateTransaction.mock.calls.length,
        transport.rpc.sendTransaction.mock.calls.length,
        getPendingGmsolSubmission(owner),
      ]);
      return signTransactionBytes(bytes);
    });
    const storedHeights: (string | undefined)[] = [];
    transport.rpc.getSignatureStatuses.mockImplementation(() => ({
      send: async () => {
        storedHeights.push(getPendingGmsolSubmission(owner)?.lastValidBlockHeight);
        return { context: { slot: 2n }, value: [{ err: null, confirmationStatus: "confirmed", slot: 2n }] };
      },
    }));
    const result = await sendGmsolOrderTransactions({
      plan,
      getWalletAddress: () => owner,
      signTransaction: sign,
      onConfirmed: async () => undefined,
    }).catch((error: unknown) => error);
    expect(atPrompts, String(secondExpired)).toEqual([
      [1, 0, undefined],
      [2, 0, undefined],
    ]);
    const [first, second] = sign.mock.calls.map(
      ([bytes], prompt) => decodeGmsolTransaction(bytes, prompt ? { ...plan, ...fresh } : plan).compiled
    );
    expect(second).toEqual({ ...first, lifetimeToken: fresh.recentBlockhash });
    const simulated = copySolanaBytes(getBase64Encoder().encode(transport.rpc.simulateTransaction.mock.calls[1][0]));
    expect(decodeGmsolTransaction(simulated, { ...plan, ...fresh }).compiled).toEqual(second);
    if (secondExpired) {
      expect(result).toBeInstanceOf(GmsolTransactionError);
      expect(result).toMatchObject({
        message: "Signed transaction expired; rebuild and sign again",
        pendingSignature: undefined,
        submittedSignatures: [],
      });
      expect(transport.rpc.sendTransaction).not.toHaveBeenCalled();
      expect(getPendingGmsolSubmission(owner)).toBeUndefined();
    } else {
      const signed = getTransactionDecoder().decode(await sign.mock.results[1].value);
      expect(result).toMatchObject({ signatures: [getSignatureFromTransaction(signed)] });
      expect(transport.rpc.sendTransaction).toHaveBeenCalledTimes(1);
      expect(storedHeights).toEqual(["3"]);
    }
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
    transport.rpc.getSignatureStatuses.mockReturnValue({
      send: async () => ({ context: { slot: 2n }, value: [status] }),
    });
    await expect(reconcileGmsolSubmission(owner)).rejects.toThrow("not yet confirmed");
    expect(getPendingGmsolSubmission(owner)).toEqual(retained);
  }
  transport.rpc.getEpochInfo.mockReturnValue({ send: async () => ({ blockHeight: 2n, absoluteSlot: 2n }) });
  transport.rpc.getSignatureStatuses.mockReturnValue({ send: async () => ({ context: { slot: 2n }, value: [null] }) });
  expect(await reconcileGmsolSubmission(owner)).toEqual({ ...retained, expired: true });
  transport.rpc.getSignatureStatuses.mockReturnValue({
    send: async () => ({ context: { slot: 2n }, value: [{ err: null, confirmationStatus: "confirmed", slot: 3n }] }),
  });
  expect(await reconcileGmsolSubmission(owner)).toEqual({ ...retained, expired: false, failed: false, slot: 3n });
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
  return compile(plan, change([assertion, ...message.instructions, { ...assertion, data: tokenAssertion }]));
}

it("accepts Phantom protection assertions with real signatures and preserved LUTs TRD-72", async () => {
  await sendFixture();
  for (const tables of [{}, await frozenTables()]) {
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
