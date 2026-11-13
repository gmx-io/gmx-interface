import type { CreateOrderOptions, CreateOrdersBuilder } from "@gmsol-labs/gmsol-sdk";
import {
  address,
  blockhash,
  compileTransaction,
  compressTransactionMessageUsingAddressLookupTables,
  getTransactionEncoder,
  type Instruction,
} from "@solana/kit";

import { getIsSolanaNetworkEnabled } from "config/ab";
import { GMSOL_MARKETS } from "config/gmsol/markets";
import { GMSOL_STORE_ADDRESS, GMSOL_STORE_PROGRAM_ID, SOLANA_TOKEN_PROGRAM_ID } from "config/gmsol/program";
import { GMSOL_TOKENS } from "config/gmsol/tokens";
import { copySolanaBytes } from "lib/solana/bytes";

import { loadGmsolSdk } from "../loadGmsolSdk";
import { ASSOCIATED_TOKEN_PROGRAM, COMPUTE_BUDGET_PROGRAM, WRAPPED_SOL_MINT } from "./addresses";
import { decodeGmsolInstruction } from "./decodeInstruction";
import { toGmsolOrderParams, toGmsolUpdateParams } from "./orderInputs";
import type { GmsolOrderAction, GmsolTransactionPlan } from "./types";
import { decodeGmsolTransaction, requireGmsol, validateGmsolTransactionPlan } from "./validateTransaction";

function assertOwner(action: Exclude<GmsolOrderAction, { type: "create" }>, owner: string) {
  requireGmsol(
    action.order.owner === owner && action.order.receiver === owner && action.order.rentReceiver === owner,
    "Order owner and receivers must be the wallet"
  );
  requireGmsol(action.order.callback === undefined, "Callback orders are not supported by the pinned validator");
}

export async function buildGmsolOrderTransactions({
  owner,
  action,
  recentBlockhash,
  lastValidBlockHeight,
  lookupTables,
  sdk = undefined,
}: Pick<GmsolTransactionPlan, "owner" | "action" | "recentBlockhash" | "lastValidBlockHeight" | "lookupTables"> & {
  sdk?: Awaited<ReturnType<typeof loadGmsolSdk>>;
}): Promise<GmsolTransactionPlan> {
  requireGmsol(getIsSolanaNetworkEnabled(), "Solana network is disabled");
  address(owner);
  // Snapshot the user's intent and LUT contents; later edits must not change a pending signature.
  const plan: GmsolTransactionPlan = structuredClone({
    owner,
    action,
    recentBlockhash,
    lastValidBlockHeight,
    lookupTables,
    groups: [],
  });
  action = plan.action;
  const wasm = sdk ?? (await loadGmsolSdk());
  const transaction_group = {
    luts: new Map(Object.entries(plan.lookupTables).map(([key, addresses]) => [key, [...addresses]])),
    max_transaction_size: 1232,
  };
  const common = {
    payer: owner,
    recent_blockhash: recentBlockhash,
    program: { id: GMSOL_STORE_PROGRAM_ID, store: GMSOL_STORE_ADDRESS },
    transaction_group,
  };
  let group: ReturnType<typeof wasm.create_orders>;
  if (action.type === "create") {
    requireGmsol(
      action.orders.length > 0 && action.orders.length <= 3,
      "One increase and at most two TP/SL orders are supported"
    );
    requireGmsol(action.atomic || action.orders.length === 1, "Multiple orders require an atomic increase with TP/SL");
    if (action.atomic) {
      const [increase, ...triggers] = action.orders;
      requireGmsol(
        new Set(triggers.map((order) => order.kind)).size === triggers.length,
        "Duplicate atomic TP/SL kind"
      );
      requireGmsol(
        increase.kind === "MarketIncrease" || increase.kind === "LimitIncrease",
        "Atomic order must start with an increase"
      );
      requireGmsol(
        triggers.every(
          (order) =>
            (order.kind === "LimitDecrease" || order.kind === "StopLossDecrease") &&
            order.market.marketTokenAddress === increase.market.marketTokenAddress &&
            order.collateralToken === increase.collateralToken &&
            order.isLong === increase.isLong &&
            order.sizeDeltaUsd <= increase.sizeDeltaUsd
        ),
        "Invalid atomic TP/SL intent"
      );
    }
    let builder: CreateOrdersBuilder | undefined;
    try {
      for (const order of action.orders) {
        const listed = GMSOL_MARKETS.find((market) => market.marketTokenAddress === order.market.marketTokenAddress);
        requireGmsol(
          listed && Object.entries(listed).every(([key, value]) => order.market[key as keyof typeof listed] === value),
          "Unknown or mismatched market metadata"
        );
        requireGmsol(
          order.collateralToken === listed.longTokenAddress || order.collateralToken === listed.shortTokenAddress,
          "Unsupported collateral token"
        );
        requireGmsol(
          GMSOL_TOKENS.find((token) => token.address === listed.indexTokenAddress)?.decimals ===
            order.indexTokenDecimals,
          "Index token decimals do not match the market"
        );
        requireGmsol(
          [listed.longTokenAddress, listed.shortTokenAddress].every(
            (mint) => GMSOL_TOKENS.find((token) => token.address === mint)?.tokenProgram === SOLANA_TOKEN_PROGRAM_ID
          ),
          "Token-2022 orders require a reviewed token program adapter"
        );
        // TODO(FESOL-56): extend the validator with swap remaining accounts and Token-2022 only after pinning their ABI.
        requireGmsol(
          order.swapPath.length === 0 &&
            (order.payToken === undefined || order.payToken === order.collateralToken) &&
            (order.receiveToken === undefined || order.receiveToken === order.collateralToken),
          "Swap routes are not supported by this pinned order builder"
        );
        requireGmsol(
          !order.payWithNativeSol || (order.payToken ?? order.collateralToken) === WRAPPED_SOL_MINT,
          "Native payment must use the WSOL mint"
        );
        requireGmsol(
          order.validFromTs === undefined || (Number.isSafeInteger(order.validFromTs) && order.validFromTs >= 0),
          "Invalid order timestamp"
        );
        const options: CreateOrderOptions = {
          ...common,
          collateral_or_swap_out_token: order.collateralToken,
          hints: new Map([
            [listed.marketTokenAddress, { long_token: listed.longTokenAddress, short_token: listed.shortTokenAddress }],
          ]),
          pay_token: order.payToken,
          receive_token: order.receiveToken,
          skip_wrap_native_on_pay: !order.payWithNativeSol,
          skip_unwrap_native_on_receive: !order.unwrapNative,
          // Idempotently prepares a missing position ahead of the order, including for an atomic TP/SL batch.
          force_create_positions: true,
        };
        const next = wasm.create_orders_builder(order.kind, [toGmsolOrderParams(order)], options);
        if (builder) {
          try {
            builder.merge(next);
          } finally {
            next.free();
          }
        } else builder = next;
      }
      requireGmsol(builder, "Missing order builder");
      const consumed = builder;
      builder = undefined;
      group = consumed.build_with_options();
    } finally {
      builder?.free();
    }
  } else if (action.type === "update") {
    assertOwner(action, owner);
    const market = GMSOL_MARKETS.find((item) => item.marketTokenAddress === action.order.marketToken);
    requireGmsol(
      market &&
        GMSOL_TOKENS.find((token) => token.address === market.indexTokenAddress)?.decimals ===
          action.changes.indexTokenDecimals &&
        action.order.kind === action.changes.kind &&
        action.order.isLong === action.changes.isLong,
      "Order update direction or market metadata does not match the original order"
    );
    const params = toGmsolUpdateParams(action.changes);
    requireGmsol(
      Object.values(params).some((value) => value !== undefined),
      "Empty order update"
    );
    group = wasm.update_orders({
      ...common,
      orders: new Map([
        [
          action.order.address,
          {
            params,
            hint: { market_token: action.order.marketToken, callback: undefined },
          },
        ],
      ]),
    });
  } else {
    assertOwner(action, owner);
    const order = action.order;
    group = wasm.close_orders({
      ...common,
      orders: new Map([
        [
          order.address,
          {
            owner,
            receiver: owner,
            rent_receiver: owner,
            referrer: order.referrer,
            initial_collateral_token: order.initialCollateralToken,
            final_output_token: order.finalOutputToken,
            long_token: order.longToken,
            short_token: order.shortToken,
            should_unwrap_native_token: order.unwrapNative,
            callback: undefined,
          },
        ],
      ]),
    });
  }
  try {
    plan.groups = group.serialize().map((txs) => txs.map((bytes) => Uint8Array.from(bytes)));
  } finally {
    group.free();
  }

  if (action.type === "create" && action.atomic && plan.groups.flat().length > 1) {
    // A WASM TransactionGroup is not atomic. Recompile the actual instruction sequence as one v0 message.
    const decoded = plan.groups.flat().map((bytes) => decodeGmsolTransaction(bytes, plan));
    const instructions: Instruction[] = [];
    let units = 0;
    const prepared = new Set<string>();
    for (const { message } of decoded)
      for (const ix of message.instructions) {
        if (ix.programAddress !== COMPUTE_BUDGET_PROGRAM) {
          const data = ix.data ? copySolanaBytes(ix.data) : new Uint8Array();
          const name =
            ix.programAddress === GMSOL_STORE_PROGRAM_ID
              ? decodeGmsolInstruction(
                  data,
                  (ix.accounts ?? []).map((account) => account.address)
                ).name
              : undefined;
          const idempotent =
            ix.programAddress === ASSOCIATED_TOKEN_PROGRAM || name === "prepare_user" || name === "prepare_position";
          const key = JSON.stringify([ix.programAddress, ix.accounts, [...data]]);
          if (!idempotent || !prepared.has(key)) instructions.push(ix);
          if (idempotent) prepared.add(key);
        } else {
          const bytes = ix.data ? copySolanaBytes(ix.data) : new Uint8Array();
          if (bytes[0] === 2) units += new DataView(bytes.buffer).getUint32(1, true);
        }
      }
    requireGmsol(units <= 1_400_000, "Atomic order exceeds the compute budget");
    const limit = new Uint8Array(5);
    limit[0] = 2;
    new DataView(limit.buffer).setUint32(1, units, true);
    const price = Uint8Array.of(3, 80, 195, 0, 0, 0, 0, 0, 0); // Pinned WASM default: 50,000 micro-lamports/CU.
    const message = compressTransactionMessageUsingAddressLookupTables(
      {
        version: 0,
        feePayer: { address: address(owner) },
        lifetimeConstraint: { blockhash: blockhash(recentBlockhash), lastValidBlockHeight },
        instructions: [
          { programAddress: address(COMPUTE_BUDGET_PROGRAM), data: limit },
          { programAddress: address(COMPUTE_BUDGET_PROGRAM), data: price },
          ...instructions,
        ],
      },
      Object.fromEntries(Object.entries(plan.lookupTables).map(([key, values]) => [key, values.map(address)]))
    );
    const bytes = copySolanaBytes(getTransactionEncoder().encode(compileTransaction(message)));
    requireGmsol(
      bytes.length <= 1232,
      `Atomic increase with TP/SL requires ${bytes.length} bytes (maximum 1232); no orders were submitted`
    );
    plan.groups = [[bytes]];
  }
  await validateGmsolTransactionPlan(plan);
  return plan;
}
