import { createSelector as createSelectorCommon } from "reselect";
import { EnhancedSelector, createSelectionContext } from "@taskworld.com/rereselect";
import { Selector } from "reselect";
import { OrderOption } from "domain/synthetics/trade/usePositionSellerState";
import { TradeMode, TradeType } from "domain/synthetics/trade/types";
import { LRUCache } from "./LruCache";
import { SyntheticsState } from "./SyntheticsStateContextProvider";
export { useSyntheticsStateSelector as useSelector } from "./SyntheticsStateContextProvider";

/**
 * @deprecated use createSelector instead
 */
export const createSelectorDeprecated = createSelectorCommon.withTypes<SyntheticsState>();
const context = createSelectionContext<SyntheticsState>();

export const createSelector = context.makeSelector;

type Arg = boolean | string | undefined | null | number | TradeMode | TradeType | OrderOption | bigint;
type SupportedArg = Arg | Record<string, Arg>;

type CachedSelector<T> = EnhancedSelector<SyntheticsState, T> | Selector<SyntheticsState, T>;

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

function getKeyForArgs(...args: SupportedArg[]) {
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
