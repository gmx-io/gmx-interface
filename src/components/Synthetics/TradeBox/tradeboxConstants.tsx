import { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/macro";

import { TradeMode, TradeType } from "domain/synthetics/trade";

import LongIcon from "img/long.svg?react";
import ShortIcon from "img/short.svg?react";
import SwapIcon from "img/swap.svg?react";

export const tradeTypeIcons = {
  [TradeType.Long]: <LongIcon />,
  [TradeType.Short]: <ShortIcon />,
  [TradeType.Swap]: <SwapIcon />,
};

export const tradeModeLabels: Record<TradeMode, MessageDescriptor> = {
  [TradeMode.Market]: msg`Market`,
  [TradeMode.Limit]: msg`Limit`,
  [TradeMode.Trigger]: msg`TP/SL`,
  [TradeMode.StopMarket]: msg`Stop Market`,
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
    active: "!bg-[#192E38] border-b-2 border-b-green-500 pb-9",
    regular: "border-b border-b-slate-600",
  },
  [TradeType.Short]: {
    active: "!bg-[#2D192D] border-b-2 border-b-red-500 pb-9",
    regular: "border-b border-b-slate-600",
  },
  [TradeType.Swap]: {
    active: "!bg-[#22243A] border-b-2 border-b-blue-300 pb-9",
    regular: "border-b border-b-slate-600",
  },
};

export const mobileTradeTypeClassNames = {
  [TradeType.Long]: "!bg-[#192E38] border-b-[2px] border-b-green-500",
  [TradeType.Short]: "!bg-[#2D192D] border-b-[2px] border-b-red-500",
  [TradeType.Swap]: "!bg-[#22243A] border-b-[2px] border-b-blue-300",
};
