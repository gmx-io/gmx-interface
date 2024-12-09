import { msg } from "@lingui/macro";

import { TradeMode, TradeType } from "domain/synthetics/trade";

import LongIcon from "img/long.svg?react";
import ShortIcon from "img/short.svg?react";
import SwapIcon from "img/swap.svg?react";

import "./TradeBox.scss";

export type Props = {
  setPendingTxns: (txns: any) => void;
};

export const tradeTypeIcons = {
  [TradeType.Long]: <LongIcon />,
  [TradeType.Short]: <ShortIcon />,
  [TradeType.Swap]: <SwapIcon />,
};

export const tradeModeLabels = {
  [TradeMode.Market]: msg`Market`,
  [TradeMode.Limit]: msg`Limit`,
  [TradeMode.Trigger]: msg`TP/SL`,
};

export const tradeTypeLabels = {
  [TradeType.Long]: msg`Long`,
  [TradeType.Short]: msg`Short`,
  [TradeType.Swap]: msg`Swap`,
};

/**
 * Colors are exceptions from palette
 * @see https://www.notion.so/gmxio/New-Colors-for-Red-Green-and-Disabled-buttons-14c03574745d8070b2edc89744f3eff4
 */
export const tradeTypeClassNames = {
  [TradeType.Long]: {
    active: "!bg-[#1F3445] !text-green-500 border-b border-b-green-500",
    regular: "border-b border-b-[transparent]",
  },
  [TradeType.Short]: {
    active: "!bg-[#392A46] !text-red-500 border-b border-b-red-500",
    regular: "border-b border-b-[transparent]",
  },
  [TradeType.Swap]: {
    active: "!bg-[#252B57] !text-blue-300 border-b border-b-blue-300",
    regular: "border-b border-b-[transparent]",
  },
};
