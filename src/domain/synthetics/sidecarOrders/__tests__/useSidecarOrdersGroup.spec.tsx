import { act, cleanup, render } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { USD_DECIMALS } from "config/factors";
import type { PositionOrderInfo } from "domain/synthetics/orders";
import { expandDecimals } from "lib/numbers";

const { selectorValues } = vi.hoisted(() => ({
  selectorValues: new Map<string, unknown>(),
}));

// selectors are mocked to plain keys that useSelector reads from a test-controlled map
vi.mock("context/SyntheticsStateContext/selectors/statsSelectors", () => ({
  selectSelectedMarketVisualMultiplier: "visualMultiplier",
}));

vi.mock("context/SyntheticsStateContext/selectors/tradeboxSelectors/selectTradeboxSidecarOrders", () => ({
  makeSelectTradeboxSidecarOrdersEntriesIsUntouched: () => "isUntouched",
  makeSelectTradeboxSidecarOrdersState: () => "ordersState",
  makeSelectTradeboxSidecarOrdersTotalPercentage: () => "totalPercentage",
  selectTradeboxSidecarEntriesSetIsUntouched: "setIsUntouched",
  selectTradeboxSidecarOrdersTotalSizeUsd: "totalSizeUsd",
}));

vi.mock("context/SyntheticsStateContext/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("context/SyntheticsStateContext/utils")>()),
  useSelector: (key: string) => selectorValues.get(key),
}));

import type { InitialEntry, SidecarSlTpOrderEntry } from "../types";
import { useSidecarOrdersGroup } from "../useSidecarOrdersGroup";
import { getDefaultEntry, getDefaultEntryField, MAX_PERCENTAGE, PERCENTAGE_DECIMALS } from "../utils";

const POSITION_SIZE_USD = expandDecimals(2000, USD_DECIMALS);
const oldOrder = { key: "0xold" } as PositionOrderInfo;
const newOrder = { key: "0xnew" } as PositionOrderInfo;

const keepEntry = (entry: SidecarSlTpOrderEntry) => entry;

function makeEntry({
  price,
  txnType = null,
  order = null,
}: {
  price?: string;
  txnType?: SidecarSlTpOrderEntry["txnType"];
  order?: PositionOrderInfo | null;
}) {
  return getDefaultEntry<SidecarSlTpOrderEntry>("tp", {
    price: getDefaultEntryField(USD_DECIMALS, { input: price }),
    txnType,
    order,
    mode: "fitPercentage",
  });
}

const newPositionOrderEntries: InitialEntry[] = [
  {
    order: newOrder,
    price: getDefaultEntryField(USD_DECIMALS, { value: expandDecimals(120, USD_DECIMALS) }),
    sizeUsd: getDefaultEntryField(USD_DECIMALS, { value: POSITION_SIZE_USD }),
    percentage: getDefaultEntryField(PERCENTAGE_DECIMALS, { value: MAX_PERCENTAGE }),
    mode: "keepPercentage",
  },
];

function renderGroup(entry: SidecarSlTpOrderEntry, initialEntries?: InitialEntry[]) {
  const view: { entries: SidecarSlTpOrderEntry[]; carryOver?: (options: { keepTypedPrice: boolean }) => void } = {
    entries: [entry],
  };

  function Harness() {
    const [entries, setEntries] = useState<SidecarSlTpOrderEntry[]>([entry]);
    view.entries = entries;
    selectorValues.set("ordersState", [entries, setEntries]);
    view.carryOver = useSidecarOrdersGroup<SidecarSlTpOrderEntry>({
      prefix: "tp",
      errorHandler: keepEntry,
      initialEntries,
      canAddEntry: false,
    }).carryOver;
    return null;
  }

  render(<Harness />);

  return view;
}

beforeEach(() => {
  selectorValues.set("isUntouched", false);
  selectorValues.set("setIsUntouched", vi.fn());
  selectorValues.set("totalSizeUsd", POSITION_SIZE_USD);
  selectorValues.set("visualMultiplier", 1);
  selectorValues.set("totalPercentage", MAX_PERCENTAGE);
});

afterEach(cleanup);

describe("useSidecarOrdersGroup carryOver", () => {
  it.each([
    {
      name: "keeps a typed price as a full-position order after a switch to the other side",
      entry: makeEntry({ price: "105", txnType: "create" }),
      keepTypedPrice: true,
      expected: { price: "105", txnType: "create", orderKey: undefined, sizeUsd: POSITION_SIZE_USD },
    },
    {
      name: "keeps a price typed over the previous position's order as a new order",
      entry: makeEntry({ price: "110", txnType: "update", order: oldOrder }),
      keepTypedPrice: true,
      expected: { price: "110", txnType: "create", orderKey: undefined, sizeUsd: POSITION_SIZE_USD },
    },
    {
      name: "shows the new position's full-position order instead of a typed price",
      entry: makeEntry({ price: "105", txnType: "create" }),
      initialEntries: newPositionOrderEntries,
      keepTypedPrice: true,
      expected: { price: "120", txnType: null, orderKey: "0xnew", sizeUsd: POSITION_SIZE_USD },
    },
    {
      name: "clears a typed price after a market change",
      entry: makeEntry({ price: "105", txnType: "create" }),
      keepTypedPrice: false,
      expected: { price: "", txnType: null, orderKey: undefined, sizeUsd: POSITION_SIZE_USD },
    },
    {
      name: "does not carry a price filled in from the previous position's order",
      entry: makeEntry({ price: "110", order: oldOrder }),
      keepTypedPrice: true,
      expected: { price: "", txnType: null, orderKey: undefined, sizeUsd: POSITION_SIZE_USD },
    },
  ])("$name PRO-4416", ({ entry, initialEntries, keepTypedPrice, expected }) => {
    const group = renderGroup(entry, initialEntries);

    act(() => group.carryOver!({ keepTypedPrice }));

    expect(
      group.entries.map((result) => ({
        price: result.price.input,
        txnType: result.txnType,
        orderKey: result.order?.key,
        sizeUsd: result.sizeUsd.value,
      }))
    ).toEqual([expected]);
  });
});
