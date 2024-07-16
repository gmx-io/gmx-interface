import { PositionOrderInfo, OrderTxnType } from "domain/synthetics/orders";
import { DecreasePositionAmounts, IncreasePositionAmounts } from "domain/synthetics/trade";

export type GroupPrefix = "sl" | "tp" | "limit";

export type EntryField = {
  input: string;
  value: bigint | null;
  error: string | null;
};

export type InitialEntry = {
  order: PositionOrderInfo | null;
  sizeUsd: EntryField;
  price: EntryField;
};

export type SidecarOrderEntryBase = {
  id: string;
  price: EntryField;
  sizeUsd: EntryField;
  percentage: EntryField;
  txnType: OrderTxnType | null;
  mode: "keepSize" | "keepPercentage" | "fitPercentage";
  order: null | PositionOrderInfo;
};

export type SidecarSlTpOrderEntry = SidecarOrderEntryBase & {
  increaseAmounts: undefined;
  decreaseAmounts?: DecreasePositionAmounts;
};

export type SidecarSlTpOrderEntryValid = SidecarSlTpOrderEntry & {
  decreaseAmounts: DecreasePositionAmounts;
};

export type SidecarLimitOrderEntry = SidecarOrderEntryBase & {
  increaseAmounts?: IncreasePositionAmounts;
  decreaseAmounts: undefined;
};

export type SidecarLimitOrderEntryValid = SidecarLimitOrderEntry & {
  increaseAmounts: IncreasePositionAmounts;
};

export type SidecarOrderEntry = SidecarSlTpOrderEntry | SidecarLimitOrderEntry;

export type SidecarOrderEntryGroupBase<T extends SidecarOrderEntryBase> = {
  entries: T[];
  canAddEntry: boolean;
  allowAddEntry: boolean;
  addEntry: () => void;
  updateEntry: (id: string, field: "price" | "sizeUsd" | "percentage", value: string) => void;
  deleteEntry: (id: string) => void;
  reset: () => void;
};

export type SidecarOrderEntryGroup = SidecarOrderEntryGroupBase<SidecarOrderEntry> & {
  totalPnL: bigint;
  totalPnLPercentage: bigint;
  error?: null | {
    price?: string;
    percentage?: string;
  };
};
