import { describe, expect, it } from "vitest";

import { GMSOL_MARKETS } from "config/gmsol/markets";
import { GMSOL_TOKENS } from "config/gmsol/tokens";
import { NATIVE_TOKEN_ADDRESS } from "sdk/configs/tokens";
import { DecreasePositionSwapType, OrderType, type PositionOrderInfo } from "sdk/utils/orders/types";
import type { PositionInfo } from "sdk/utils/positions/types";
import type { TokenData } from "sdk/utils/tokens/types";
import type { DecreasePositionAmounts } from "sdk/utils/trade/types";

import { buildGmsolCancelAction, buildGmsolCloseAction, buildGmsolUpdateAction } from "./buildOrderActions";
import { GmsolTradeboxError } from "../tradebox/buildTradeboxOrderAction";
import { WRAPPED_SOL_MINT } from "../transactions/addresses";

const usd = 10n ** 30n;
const owner = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const market = GMSOL_MARKETS.find((item) => item.longTokenAddress === WRAPPED_SOL_MINT)!;
const token = (address: string) => GMSOL_TOKENS.find((item) => item.address === address)! as unknown as TokenData;
const indexToken = token(market.indexTokenAddress);
const wsol = token(WRAPPED_SOL_MINT);
const nativeSol = { ...wsol, address: NATIVE_TOKEN_ADDRESS, isNative: true, wrappedAddress: WRAPPED_SOL_MINT };
const usdc = token(market.shortTokenAddress);
const marketInfo = { ...market, tradeMath: "gmsol", isDisabled: false, indexToken };

const position = (isLong: boolean) =>
  ({
    account: owner,
    marketAddress: market.marketTokenAddress,
    marketInfo,
    indexToken,
    collateralTokenAddress: WRAPPED_SOL_MINT,
    collateralToken: wsol,
    isLong,
    sizeInUsd: 100n * usd,
  }) as unknown as PositionInfo;

const decrease = {
  sizeDeltaUsd: 40n * usd,
  collateralDeltaAmount: 1_000_000n,
  acceptablePrice: 200n * usd,
  decreaseSwapType: DecreasePositionSwapType.NoSwap,
} as DecreasePositionAmounts;

const order = (solana: Partial<NonNullable<PositionOrderInfo["solana"]>> | undefined) =>
  ({
    key: "order",
    account: owner,
    receiver: owner,
    marketAddress: market.marketTokenAddress,
    orderType: OrderType.LimitDecrease,
    isLong: true,
    isTwap: false,
    shouldUnwrapNativeToken: false,
    indexToken,
    sizeDeltaUsd: 40n * usd,
    triggerPrice: 250n * usd,
    acceptablePrice: 245n * usd,
    solana: solana && {
      orderAccount: "8qbHbw2BbbTHBW1sbeqakYXVKRQM8Ne7pLK7m6CVfeR",
      actionState: "pending",
      positionAccount: undefined,
      rentReceiver: owner,
      referrer: undefined,
      callback: undefined,
      escrowTokens: {
        initialCollateralToken: undefined,
        finalOutputToken: WRAPPED_SOL_MINT,
        longToken: undefined,
        shortToken: undefined,
      },
      ...solana,
    },
  }) as unknown as PositionOrderInfo;

describe("Solana close, edit and cancel intents FESOL-59", () => {
  it.each([
    { isLong: true, receiveToken: wsol, acceptablePrice: 199n, unwrapNative: false },
    { isLong: false, receiveToken: wsol, acceptablePrice: 201n, unwrapNative: false },
    { isLong: true, receiveToken: nativeSol, acceptablePrice: 199n, unwrapNative: true },
    { isLong: false, receiveToken: nativeSol, acceptablePrice: 201n, unwrapNative: true },
  ])(
    "closes at market against the position with worst-price slippage (long=$isLong, receive $receiveToken.address)",
    ({ isLong, receiveToken, acceptablePrice, unwrapNative }) => {
      const action = buildGmsolCloseAction({
        position: position(isLong),
        decreaseAmounts: decrease,
        receiveToken,
        allowedSlippage: 50,
      });
      if (action.type !== "create") throw new Error("Expected create");
      expect(action.orders).toHaveLength(1);
      expect(action.orders[0]).toMatchObject({
        kind: "MarketDecrease",
        isLong,
        collateralToken: WRAPPED_SOL_MINT,
        sizeDeltaUsd: 40n * usd,
        collateralDeltaAmount: 1_000_000n,
        minOutput: 0n,
        acceptablePrice: acceptablePrice * usd,
        receiveToken: undefined,
        unwrapNative,
        decreaseSwapType: "NoSwap",
      });
    }
  );

  it.each([
    ["a receive token that needs a swap", { receiveToken: usdc }, "receive"],
    ["a size above the position", { decreaseAmounts: { ...decrease, sizeDeltaUsd: 101n * usd } }, "amounts"],
  ] as const)("rejects a close with %s", (_, override, code) => {
    expect(() =>
      buildGmsolCloseAction({
        position: position(true),
        decreaseAmounts: decrease,
        receiveToken: wsol,
        allowedSlippage: 50,
        ...override,
      })
    ).toThrow(new GmsolTradeboxError(code));
  });

  it("updates only the changed fields and ignores EVM unlimited prices", () => {
    const action = buildGmsolUpdateAction({
      order: { ...order({}), acceptablePrice: 0n } as PositionOrderInfo,
      changes: { sizeDeltaUsd: 40n * usd, triggerPrice: 260n * usd, acceptablePrice: 2n ** 256n - 1n },
    });
    if (action.type !== "update") throw new Error("Expected update");
    expect(action.changes).toEqual({
      kind: "LimitDecrease",
      indexTokenDecimals: indexToken.decimals,
      isLong: true,
      sizeDeltaUsd: undefined,
      triggerPrice: 260n * usd,
      acceptablePrice: undefined,
      minOutput: undefined,
      validFromTs: undefined,
    });
    expect(() =>
      buildGmsolUpdateAction({
        order: order({}),
        changes: { sizeDeltaUsd: undefined, triggerPrice: 250n * usd, acceptablePrice: undefined },
      })
    ).toThrow(new GmsolTradeboxError("amounts"));
  });

  it.each([
    ["the trigger moves", { sizeDeltaUsd: 40n * usd, triggerPrice: 300n * usd }],
    ["nothing else changes", { sizeDeltaUsd: 40n * usd, triggerPrice: 250n * usd }],
  ])("refuses to drop a bounded acceptable price when %s", (_, changes) => {
    expect(() => buildGmsolUpdateAction({ order: order({}), changes: { ...changes, acceptablePrice: 0n } })).toThrow(
      new GmsolTradeboxError("acceptablePrice")
    );
  });

  it("keeps a bounded acceptable price on a size-only edit and moves the trigger of an unlimited order", () => {
    const sizeOnly = buildGmsolUpdateAction({
      order: order({}),
      changes: { sizeDeltaUsd: 30n * usd, triggerPrice: 250n * usd, acceptablePrice: 0n },
    });
    if (sizeOnly.type !== "update") throw new Error("Expected update");
    expect(sizeOnly.changes).toMatchObject({
      sizeDeltaUsd: 30n * usd,
      triggerPrice: undefined,
      acceptablePrice: undefined,
    });

    const unlimited = { ...order({}), acceptablePrice: 0n } as PositionOrderInfo;
    const moved = buildGmsolUpdateAction({
      order: unlimited,
      changes: { sizeDeltaUsd: 40n * usd, triggerPrice: 300n * usd, acceptablePrice: 0n },
    });
    if (moved.type !== "update") throw new Error("Expected update");
    expect(moved.changes).toMatchObject({ triggerPrice: 300n * usd, acceptablePrice: undefined });
  });

  it.each([
    ["without API order fields", undefined],
    ["that is no longer pending", { actionState: "completed" as const }],
    ["with a callback", { callback: { version: 1, program: owner, sharedData: owner, partitionedData: owner } }],
  ])("refuses to cancel an order %s", (_, solana) => {
    expect(() => buildGmsolCancelAction(order(solana))).toThrow();
  });

  it("cancels with the API order account, rent receiver and escrow", () => {
    const action = buildGmsolCancelAction(order({ referrer: owner }));
    expect(action).toMatchObject({
      type: "cancel",
      order: {
        kind: "LimitDecrease",
        address: "8qbHbw2BbbTHBW1sbeqakYXVKRQM8Ne7pLK7m6CVfeR",
        owner,
        receiver: owner,
        rentReceiver: owner,
        referrer: owner,
        finalOutputToken: WRAPPED_SOL_MINT,
      },
    });
  });
});
