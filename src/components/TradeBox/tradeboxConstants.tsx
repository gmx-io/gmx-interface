import { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/macro";

import { TradeMode, TradeType } from "domain/synthetics/trade";

export const tradeModeLabels: Record<TradeMode, MessageDescriptor> = {
  [TradeMode.Market]: msg`Market`,
  [TradeMode.Limit]: msg`Limit`,
  [TradeMode.Trigger]: msg`TP/SL`,
  [TradeMode.StopMarket]: msg`Stop market`,
  [TradeMode.Twap]: msg`TWAP`,
};

export const tradeTypeLabels = {
  [TradeType.Long]: msg`Long`,
  [TradeType.Short]: msg`Short`,
  [TradeType.Swap]: msg`Swap`,
};

/**
 * Colors are exceptions from palette
 * @see https://www.figma.com/design/U973bt4fbRrn9jTg2GfVTd/%F0%9F%93%8A-Trade-Page?node-id=896-87735&t=gJBQW6iIUmrYfMaP-0
 */
export const tradeTypeClassNames = {
  [TradeType.Long]: {
    active: "!bg-green-900 border-b-green-500 pb-9",
    regular: "border-b-transparent",
  },
  [TradeType.Short]: {
    active: "!bg-red-900 border-b-red-500 pb-9",
    regular: "border-b-transparent",
  },
  [TradeType.Swap]: {
    active: "!bg-blue-300/10 border-b-blue-300 pb-9",
    regular: "border-b-transparent",
  },
};
