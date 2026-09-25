import { msg } from "@lingui/macro";

import { isIncreaseKind, isMarketKind } from "./orderRules";
import { SOLANA_ORDER_KIND } from "./solanaOrderConstants";
import type { SolanaOrderError, SolanaOrderViewModel } from "./types";
import { getSolanaTokenConfig } from "../config/solanaProgram";
import type { SolanaPositionViewModel } from "../positions/types";

export type SolanaOrderErrorPosition = Pick<
  SolanaPositionViewModel,
  "marketTokenAddress" | "collateralTokenAddress" | "isLong" | "liquidationPrice" | "collateralSymbol"
>;

type PositionOrder = Extract<SolanaOrderViewModel, { category: "position" | "collateral" }>;

/** Native SOL orders settle into the wrapped mint, which is what position accounts store. */
function toPositionCollateral(address: string): string {
  const config = getSolanaTokenConfig(address);
  return config?.isNative && config.wrappedAddress ? config.wrappedAddress : address;
}

/** Source: gmx-solana-interface `isOrderForPosition`. */
export function isSolanaOrderForPosition(order: PositionOrder, position: SolanaOrderErrorPosition): boolean {
  if (order.marketTokenAddress !== position.marketTokenAddress || order.isLong !== position.isLong) return false;
  if (order.kind === SOLANA_ORDER_KIND.LimitIncrease) {
    return toPositionCollateral(order.targetCollateralTokenAddress) === position.collateralTokenAddress;
  }
  if (order.kind === SOLANA_ORDER_KIND.LimitDecrease || order.kind === SOLANA_ORDER_KIND.StopLossDecrease) {
    return order.targetCollateralTokenAddress === position.collateralTokenAddress;
  }
  return true;
}

const LEVEL_PRIORITY: Record<SolanaOrderError["level"], number> = { error: 1, warning: 2 };

/**
 * Read-only subset of gmx-solana-interface `getOrderErrors`: the checks that only need the wallet's
 * positions. Liquidity, price-impact and max-leverage checks need market pool state and are not ported.
 */
export function getSolanaOrderErrors(
  order: SolanaOrderViewModel,
  positions: readonly SolanaOrderErrorPosition[]
): SolanaOrderError[] {
  if (order.category === "swap") return [];
  const errors: SolanaOrderError[] = [];
  const position = positions.find((candidate) => isSolanaOrderForPosition(order, candidate));

  if (!position) {
    const sameMarketPosition = positions.find(
      (candidate) => candidate.marketTokenAddress === order.marketTokenAddress && candidate.isLong === order.isLong
    );
    if (sameMarketPosition) {
      const collateralSymbol = order.targetCollateralSymbol;
      const symbol = sameMarketPosition.collateralSymbol;
      errors.push({
        key: "collateralToken",
        level: "warning",
        message: sameMarketPosition.isLong
          ? msg`This order using ${collateralSymbol} as collateral will not be valid for the existing long position using ${symbol} as collateral.`
          : msg`This order using ${collateralSymbol} as collateral will not be valid for the existing short position using ${symbol} as collateral.`,
      });
    }
  }

  const isDecrease = order.category === "position" ? !isIncreaseKind(order.kind) : isMarketKind(order.kind) && !order.isDeposit;
  if (isDecrease && position && order.category === "position" && order.triggerPrice !== undefined) {
    const liquidationPrice = position.liquidationPrice;
    const beyondLiquidation =
      liquidationPrice === undefined
        ? false
        : position.isLong
          ? liquidationPrice > order.triggerPrice
          : liquidationPrice < order.triggerPrice;
    if (beyondLiquidation) {
      errors.push({
        key: "triggerPrice",
        level: "error",
        message: msg`The order will not be executed as its trigger price is beyond the position's liquidation price.`,
      });
    }
  }

  return errors.sort((a, b) => LEVEL_PRIORITY[a.level] - LEVEL_PRIORITY[b.level]);
}
