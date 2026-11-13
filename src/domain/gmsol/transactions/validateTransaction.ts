import {
  address,
  decompileTransactionMessage,
  getCompiledTransactionMessageDecoder,
  getTransactionDecoder,
  getTransactionEncoder,
} from "@solana/kit";

import { GMSOL_LOOKUP_TABLE_ADDRESSES } from "config/gmsol/lookupTables";
import {
  GMSOL_STORE_ADDRESS,
  GMSOL_STORE_PROGRAM_ID,
  SOLANA_SYSTEM_PROGRAM_ID,
  SOLANA_TOKEN_PROGRAM_ID,
} from "config/gmsol/program";
import { copySolanaBytes } from "lib/solana/bytes";

import {
  ASSOCIATED_TOKEN_PROGRAM,
  COMPUTE_BUDGET_PROGRAM,
  WRAPPED_SOL_MINT,
  getGmsolAta,
  getGmsolPositionAddress,
  gmsolPda,
} from "./addresses";
import { GmsolInstructionReader, decodeGmsolInstruction, readCreateOrderParams } from "./decodeInstruction";
import { toGmsolOrderParams, toGmsolUpdateParams } from "./orderInputs";
import type { GmsolCreateOrder, GmsolTransactionPlan } from "./types";

const kindIds = { MarketIncrease: 3n, MarketDecrease: 4n, LimitIncrease: 6n, LimitDecrease: 7n, StopLossDecrease: 8n };
const swapIds = { NoSwap: 0n, PnlTokenToCollateralToken: 1n, CollateralToPnlToken: 2n };

export function requireGmsol(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function decodeGmsolTransaction(
  bytes: Uint8Array,
  plan: Pick<GmsolTransactionPlan, "owner" | "lookupTables" | "recentBlockhash" | "lastValidBlockHeight">
) {
  requireGmsol(bytes.length <= 1232, "Transaction exceeds the Solana packet size");
  const tx = getTransactionDecoder().decode(bytes);
  const canonical = copySolanaBytes(getTransactionEncoder().encode(tx));
  requireGmsol(
    canonical.length === bytes.length && canonical.every((value, index) => value === bytes[index]),
    "Noncanonical or truncated transaction bytes"
  );
  const compiled = getCompiledTransactionMessageDecoder().decode(tx.messageBytes);
  requireGmsol(compiled.version === 0, "Expected a versioned transaction");
  requireGmsol(
    compiled.header.numSignerAccounts === 1 && compiled.header.numReadonlySignerAccounts === 0,
    "Unexpected transaction signers"
  );
  requireGmsol(compiled.staticAccounts[0] === plan.owner, "Wallet must be the fee payer");
  requireGmsol(compiled.lifetimeToken === plan.recentBlockhash, "Unexpected transaction blockhash");
  for (const lookup of compiled.addressTableLookups ?? []) {
    requireGmsol(GMSOL_LOOKUP_TABLE_ADDRESSES.includes(lookup.lookupTableAddress), "Unexpected lookup table");
    const addresses = plan.lookupTables[lookup.lookupTableAddress];
    requireGmsol(addresses, "Unresolved lookup table");
    for (const index of [...lookup.writableIndexes, ...lookup.readonlyIndexes]) {
      requireGmsol(index < addresses.length, "Unresolved lookup table account");
    }
  }
  const message = decompileTransactionMessage(compiled, {
    addressesByLookupTableAddress: Object.fromEntries(
      Object.entries(plan.lookupTables).map(([key, values]) => [key, values.map(address)])
    ),
    lastValidBlockHeight: plan.lastValidBlockHeight,
  });
  return { tx, compiled, message };
}

async function expectedCreateAccounts(order: GmsolCreateOrder, owner: string, nonce: Uint8Array) {
  const program = GMSOL_STORE_PROGRAM_ID;
  const isIncrease = order.kind === "MarketIncrease" || order.kind === "LimitIncrease";
  const orderAccount = await gmsolPda("order", [GMSOL_STORE_ADDRESS, owner], [nonce]);
  const pay = order.payToken ?? order.collateralToken;
  const receive = order.receiveToken ?? order.collateralToken;
  const { longTokenAddress: long, shortTokenAddress: short } = order.market;
  return {
    owner,
    receiver: owner,
    store: GMSOL_STORE_ADDRESS,
    market: await gmsolPda("market", [GMSOL_STORE_ADDRESS, order.market.marketTokenAddress]),
    user: await gmsolPda("user", [GMSOL_STORE_ADDRESS, owner]),
    order: orderAccount,
    position: await getGmsolPositionAddress({
      owner,
      marketToken: order.market.marketTokenAddress,
      collateralToken: order.collateralToken,
      isLong: order.isLong,
    }),
    initial_collateral_token: isIncrease ? pay : program,
    final_output_token: isIncrease ? order.collateralToken : receive,
    long_token: long,
    short_token: short,
    initial_collateral_token_escrow: isIncrease ? await getGmsolAta(orderAccount, pay) : program,
    final_output_token_escrow: isIncrease ? program : await getGmsolAta(orderAccount, receive),
    long_token_escrow: await getGmsolAta(orderAccount, long),
    short_token_escrow: await getGmsolAta(orderAccount, short),
    initial_collateral_token_source: isIncrease ? await getGmsolAta(owner, pay) : program,
    system_program: SOLANA_SYSTEM_PROGRAM_ID,
    token_program: SOLANA_TOKEN_PROGRAM_ID,
    associated_token_program: ASSOCIATED_TOKEN_PROGRAM,
    callback_authority: program,
    callback_program: program,
    callback_shared_data_account: program,
    callback_partitioned_data_account: program,
    event_authority: await gmsolPda("__event_authority", []),
    program,
  };
}

function assertAccounts(actual: Record<string, string>, expected: Record<string, string>) {
  for (const [name, key] of Object.entries(actual)) requireGmsol(expected[name] === key, `Unexpected ${name} account`);
}

function assertCreateParams(
  actual: ReturnType<typeof readCreateOrderParams>,
  order: GmsolCreateOrder,
  preparing: boolean
) {
  const expected = toGmsolOrderParams(order);
  const fields: typeof actual = {
    kind: kindIds[order.kind],
    decreaseSwapType: order.decreaseSwapType === undefined ? undefined : swapIds[order.decreaseSwapType],
    executionLamports: preparing ? 0n : 300_000n,
    swapPathLength: 0n,
    amount: expected.amount ?? 0n,
    size: expected.size,
    isLong: order.isLong,
    isCollateralLong: order.collateralToken === order.market.longTokenAddress,
    minOutput: expected.min_output ?? 0n,
    triggerPrice: expected.trigger_price,
    acceptablePrice: expected.acceptable_price,
    unwrapNative: preparing ? false : order.unwrapNative,
    validFromTs: expected.valid_from_ts === undefined ? undefined : BigInt(expected.valid_from_ts),
  };
  for (const key of Object.keys(fields) as (keyof typeof fields)[]) {
    requireGmsol(actual[key] === fields[key], `Unexpected order ${key}`);
  }
}

/** Decode and validate the entire plan, including resolved LUT accounts, before any signature. */
export async function validateGmsolTransactionPlan(plan: GmsolTransactionPlan) {
  requireGmsol(plan.groups.length > 0 && plan.groups.every((group) => group.length > 0), "Empty transaction plan");
  requireGmsol(plan.groups.flat().length <= 4, "Too many transactions in one action");
  const action = plan.action;
  if (action.type === "create" && action.atomic)
    requireGmsol(plan.groups.length === 1 && plan.groups[0].length === 1, "Atomic orders must fit in one transaction");
  const owner = address(plan.owner);
  const program = GMSOL_STORE_PROGRAM_ID;
  const user = await gmsolPda("user", [GMSOL_STORE_ADDRESS, owner]);
  const event = await gmsolPda("__event_authority", []);
  const allowedAtaOwners = new Set<string>([owner]);
  const allowedMints = new Set<string>();
  const orders: string[] = [];
  let actionCount = 0;
  let keeperLamports = 0n;
  let wrapLamports = 0n;
  let nativePayment = 0n;
  const transactions = plan.groups.flat().map((bytes) => decodeGmsolTransaction(bytes, plan));

  // Resolve order PDAs first so ATA setup preceding create_order can be checked independently.
  for (const { message } of transactions)
    for (const ix of message.instructions) {
      if (ix.programAddress !== program) continue;
      const decoded = decodeGmsolInstruction(
        ix.data ? copySolanaBytes(ix.data) : new Uint8Array(),
        (ix.accounts ?? []).map((a) => a.address)
      );
      if (decoded.name === "create_order_v2") {
        const nonce = decoded.reader.read(32);
        const key = await gmsolPda("order", [GMSOL_STORE_ADDRESS, owner], [nonce]);
        allowedAtaOwners.add(key);
      }
    }
  if (action.type === "create")
    for (const order of action.orders) {
      [
        order.collateralToken,
        order.payToken,
        order.receiveToken,
        order.market.longTokenAddress,
        order.market.shortTokenAddress,
      ].forEach((mint) => mint && allowedMints.add(mint));
      if ((order.kind === "MarketIncrease" || order.kind === "LimitIncrease") && order.payWithNativeSol)
        nativePayment += order.collateralDeltaAmount;
    }
  else {
    requireGmsol(
      action.order.owner === owner && action.order.receiver === owner && action.order.rentReceiver === owner,
      "Order owner and receivers must be the wallet"
    );
    requireGmsol(
      action.order.callback === undefined,
      "Callbacks are not supported by the pinned transaction validator"
    );
    allowedAtaOwners.add(action.order.address);
    [
      action.order.initialCollateralToken,
      action.order.finalOutputToken,
      action.order.longToken,
      action.order.shortToken,
    ].forEach((mint) => mint && allowedMints.add(mint));
  }

  const transactionCosts: { keeperLamports: bigint; wrapLamports: bigint }[] = [];
  for (const { message } of transactions) {
    const startingKeeper = keeperLamports;
    const startingWrap = wrapLamports;
    let computeLimitSeen = false;
    let computePriceSeen = false;
    for (const ix of message.instructions) {
      const data = ix.data ? copySolanaBytes(ix.data) : new Uint8Array();
      const accounts = (ix.accounts ?? []).map((item) => item.address);
      const reader = new GmsolInstructionReader(data);
      if (ix.programAddress === COMPUTE_BUDGET_PROGRAM) {
        requireGmsol(accounts.length === 0, "Unexpected compute budget accounts");
        const kind = reader.uint(1);
        if (kind === 2n) {
          const units = reader.uint(4);
          requireGmsol(!computeLimitSeen && units > 0n && units <= 1_400_000n, "Invalid compute limit");
          computeLimitSeen = true;
        } else {
          requireGmsol(kind === 3n && !computePriceSeen && reader.uint(8) <= 1_000_000n, "Invalid compute price");
          computePriceSeen = true;
        }
      } else if (ix.programAddress === ASSOCIATED_TOKEN_PROGRAM) {
        requireGmsol(reader.uint(1) === 1n && accounts.length === 6, "Only idempotent ATA setup is allowed");
        requireGmsol(
          accounts[0] === owner && allowedAtaOwners.has(accounts[2]) && allowedMints.has(accounts[3]),
          "Unexpected ATA owner or mint"
        );
        requireGmsol(
          accounts[1] === (await getGmsolAta(accounts[2], accounts[3])) &&
            accounts[4] === SOLANA_SYSTEM_PROGRAM_ID &&
            accounts[5] === SOLANA_TOKEN_PROGRAM_ID,
          "Invalid ATA setup"
        );
      } else if (ix.programAddress === SOLANA_SYSTEM_PROGRAM_ID) {
        requireGmsol(
          reader.uint(4) === 2n && accounts.length === 2 && accounts[0] === owner,
          "Only wallet SOL wrapping transfers are allowed"
        );
        requireGmsol(accounts[1] === (await getGmsolAta(owner, WRAPPED_SOL_MINT)), "Unexpected SOL receiver");
        const lamports = reader.uint(8);
        wrapLamports += lamports;
        requireGmsol(wrapLamports <= nativePayment, "Unexpected SOL transfer amount");
      } else if (ix.programAddress === SOLANA_TOKEN_PROGRAM_ID) {
        const kind = reader.uint(1);
        requireGmsol(
          kind === 17n && accounts.length === 1 && accounts[0] === (await getGmsolAta(owner, WRAPPED_SOL_MINT)),
          "Only wallet SyncNative is allowed"
        );
      } else {
        requireGmsol(ix.programAddress === program, "Unexpected instruction program");
        const decoded = decodeGmsolInstruction(data, accounts);
        const r = decoded.reader;
        const a = decoded.accounts;
        if (decoded.name === "prepare_user") {
          requireGmsol(action.type === "create", "Unexpected user preparation");
          assertAccounts(a, { owner, store: GMSOL_STORE_ADDRESS, user, system_program: SOLANA_SYSTEM_PROGRAM_ID });
        } else if (decoded.name === "prepare_position") {
          requireGmsol(action.type === "create", "Unexpected position preparation");
          const params = readCreateOrderParams(r);
          const order = action.orders.find(
            (order) => kindIds[order.kind] === params.kind && order.isLong === params.isLong
          );
          requireGmsol(order, "Unexpected prepared position");
          assertCreateParams(params, order, true);
          assertAccounts(a, {
            owner,
            store: GMSOL_STORE_ADDRESS,
            market: await gmsolPda("market", [GMSOL_STORE_ADDRESS, order.market.marketTokenAddress]),
            position: await getGmsolPositionAddress({
              owner,
              marketToken: order.market.marketTokenAddress,
              collateralToken: order.collateralToken,
              isLong: order.isLong,
            }),
            system_program: SOLANA_SYSTEM_PROGRAM_ID,
          });
        } else if (decoded.name === "create_order_v2") {
          requireGmsol(action.type === "create" && actionCount < action.orders.length, "Unexpected created order");
          const order = action.orders[actionCount++];
          const nonce = r.read(32);
          assertCreateParams(readCreateOrderParams(r), order, false);
          requireGmsol(r.option(() => r.uint(1)) === undefined, "Unexpected callback");
          assertAccounts(a, await expectedCreateAccounts(order, owner, nonce));
          requireGmsol(!orders.includes(a.order), "Duplicate order account");
          orders.push(a.order);
          keeperLamports += 300_000n;
        } else if (decoded.name === "update_order_v2") {
          requireGmsol(action.type === "update", "Unexpected order update");
          const expected = toGmsolUpdateParams(action.changes);
          for (const field of [
            "size_delta_value",
            "acceptable_price",
            "trigger_price",
            "min_output",
            "valid_from_ts",
          ] as const) {
            const value = r.option(() => r.uint(field === "valid_from_ts" ? 8 : 16));
            requireGmsol(
              value === (expected[field] === undefined ? undefined : BigInt(expected[field]!)),
              `Unexpected updated ${field}`
            );
          }
          assertAccounts(a, {
            owner,
            store: GMSOL_STORE_ADDRESS,
            market: await gmsolPda("market", [GMSOL_STORE_ADDRESS, action.order.marketToken]),
            order: action.order.address,
            callback_authority: program,
            callback_program: program,
            callback_shared_data_account: program,
            callback_partitioned_data_account: program,
            event_authority: event,
            program,
          });
          actionCount++;
        } else {
          requireGmsol(action.type === "cancel", "Unexpected order cancellation");
          const length = Number(r.uint(4));
          requireGmsol(length <= 256, "Unexpected close reason");
          r.read(length);
          const order = action.order;
          const expected: Record<string, string> = {
            executor: owner,
            owner,
            receiver: owner,
            rent_receiver: owner,
            store: GMSOL_STORE_ADDRESS,
            store_wallet: await gmsolPda("store_wallet", [GMSOL_STORE_ADDRESS]),
            user,
            referrer_user: order.referrer ? await gmsolPda("user", [GMSOL_STORE_ADDRESS, order.referrer]) : program,
            order: order.address,
            system_program: SOLANA_SYSTEM_PROGRAM_ID,
            token_program: SOLANA_TOKEN_PROGRAM_ID,
            associated_token_program: ASSOCIATED_TOKEN_PROGRAM,
            callback_authority: program,
            callback_program: program,
            callback_shared_data_account: program,
            callback_partitioned_data_account: program,
            event_authority: event,
            program,
          };
          for (const [name, mint] of [
            ["initial_collateral_token", order.initialCollateralToken],
            ["final_output_token", order.finalOutputToken],
            ["long_token", order.longToken],
            ["short_token", order.shortToken],
          ] as const) {
            expected[name] = mint ?? program;
            expected[`${name}_escrow`] = mint ? await getGmsolAta(order.address, mint) : program;
            expected[`${name}_ata`] = mint
              ? order.unwrapNative && mint === WRAPPED_SOL_MINT
                ? owner
                : await getGmsolAta(owner, mint)
              : program;
          }
          assertAccounts(a, expected);
          actionCount++;
        }
        r.end();
        continue;
      }
      reader.end();
    }
    transactionCosts.push({
      keeperLamports: keeperLamports - startingKeeper,
      wrapLamports: wrapLamports - startingWrap,
    });
  }
  requireGmsol(
    actionCount === (action.type === "create" ? action.orders.length : 1),
    "Missing or duplicate order instructions"
  );
  requireGmsol(wrapLamports === nativePayment, "Missing SOL wrapping transfer");
  return { orderAddresses: orders, keeperLamports, wrapLamports, transactionCosts };
}
