import { BN } from '@coral-xyz/anchor';
import { OrderTxnType, PositionOrderInfo } from '@/selectors/order/types';
import { IncreasePositionAmounts } from '@/utils/tradebox/types';
import { DecreasePositionAmounts } from '@/utils/tradebox/types';

export type GroupPrefix = 'sl' | 'tp' | 'limit';

export type EntryField = {
  input: string;
  value: BN | null;
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
  mode: 'keepSize' | 'keepPercentage' | 'fitPercentage';
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
  updateEntry: (
    id: string,
    field: 'price' | 'sizeUsd' | 'percentage',
    value: string
  ) => void;
  deleteEntry: (id: string) => void;
  reset: () => void;
};

export type SidecarOrderEntryGroup =
  SidecarOrderEntryGroupBase<SidecarOrderEntry> & {
    totalPnL?: BN;
    totalPnLPercentage?: number;
    error?: null | {
      price?: string;
      percentage?: string;
    };
  };
