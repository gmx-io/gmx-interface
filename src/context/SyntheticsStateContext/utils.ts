import { EnhancedSelector, createSelectionContext } from "@taskworld.com/rereselect";
import { useCallback } from "react";
import { Selector, createSelector as createSelectorCommon } from "reselect";
import { Context, createContext, useContext, useContextSelector } from "use-context-selector";

import type { OrderOption } from "domain/synthetics/trade/usePositionSellerState";
import type { ExternalSwapQuote, TradeMode, TradeType } from "sdk/types/trade";
import { LRUCache } from "sdk/utils/LruCache";
import type { BatchOrderTxnParams } from "sdk/utils/orderTransactions";

import type { SyntheticsState } from "./SyntheticsStateContextProvider";

const context = createSelectionContext<SyntheticsState>();
export const createSelector = context.makeSelector;

export function createSelectorFactory<SelectionResult, Args extends SupportedArg[]>(
  factory: (...args: Args) => CachedSelector<SelectionResult>
): (...args: Args) => CachedSelector<SelectionResult> {
  const cache = new LRUCache<CachedSelector<SelectionResult>>(20);

  return (...args: Args) => {
    const key = getKeyForArgs(...args);

    if (cache.has(key)) {
      const selector = cache.get(key);
      if (!selector) throw new Error("Selector is undefined");
      return selector;
    }

    const selector = factory(...args);
    cache.set(key, selector);

    return selector;
  };
}

export function getKeyForArgs(...args: SupportedArg[]) {
  return args
    .map((arg) =>
      typeof arg === "object" && arg
        ? Object.entries(arg)
            .map(([k, v]) => `${k}=${v}`)
            .join(";")
        : arg
    )
    .join(",");
}

/**
 * @deprecated use createSelector instead
 */
export const createSelectorDeprecated = createSelectorCommon.withTypes<SyntheticsState>();

type Arg =
  | boolean
  | string
  | undefined
  | null
  | number
  | TradeMode
  | TradeType
  | OrderOption
  | bigint
  | ExternalSwapQuote
  | BatchOrderTxnParams;

export type SupportedArg = Arg | Record<string, Arg>;

export type CachedSelector<T> = EnhancedSelector<SyntheticsState, T> | Selector<SyntheticsState, T>;

function useSyntheticsStateSelector<Selected>(selector: (s: SyntheticsState) => Selected) {
  const value = useContext(StateCtx);
  if (!value) {
    throw new Error("Used useSyntheticsStateSelector outside of SyntheticsStateContextProvider");
  }
  return useContextSelector(StateCtx as Context<SyntheticsState>, selector) as Selected;
}

export const useSelector = useSyntheticsStateSelector;

export function useCalcSelector() {
  return useCallback(function useCalcSelector<Selected>(selector: (state: SyntheticsState) => Selected) {
    if (!latestStateRef.current) throw new Error("Used calcSelector outside of SyntheticsStateContextProvider");
    return selector(latestStateRef.current);
  }, []);
}
export const StateCtx = createContext<SyntheticsState | null>(null);

export const latestStateRef: { current: SyntheticsState | null } = { current: null };
