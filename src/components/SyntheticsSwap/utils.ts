import { t } from "@lingui/macro";
import { getTokenData, TokensData } from "domain/synthetics/tokens";
import { BigNumber } from "ethers";

import longImg from "img/long.svg";
import shortImg from "img/short.svg";
import swapImg from "img/swap.svg";

export enum Operation {
  Long = "Long",
  Short = "Short",
  Swap = "Swap",
}

export enum Mode {
  Market = "Market",
  Limit = "Limit",
  Trigger = "Trigger",
}

export const operationTexts = {
  [Operation.Long]: t`Long`,
  [Operation.Short]: t`Short`,
  [Operation.Swap]: t`Swap`,
};

export const operationIcons = {
  [Operation.Long]: longImg,
  [Operation.Short]: shortImg,
  [Operation.Swap]: swapImg,
};

export const modeTexts = {
  [Mode.Market]: t`Market`,
  [Mode.Limit]: t`Limit`,
  [Mode.Trigger]: t`Trigger`,
};

export const avaialbleModes = {
  [Operation.Long]: [Mode.Market, Mode.Limit],
  [Operation.Short]: [Mode.Market, Mode.Limit],
  [Operation.Swap]: [Mode.Market, Mode.Limit],
};

export function getSubmitError(p: {
  operationType: Operation;
  mode: Mode;
  tokensData: TokensData;
  fromTokenAddress?: string;
  fromTokenAmount?: BigNumber;
  toTokenAddress?: string;
  swapPath?: string[];
}) {
  const fromToken = getTokenData(p.tokensData, p.fromTokenAddress);

  if (!fromToken) {
    return t`Loading...`;
  }

  if (p.fromTokenAmount?.gt(fromToken.balance || BigNumber.from(0))) {
    return t`Insufficient ${fromToken.symbol} balance`;
  }

  if (p.operationType === Operation.Swap) {
    if (p.fromTokenAddress === p.toTokenAddress) {
      return t`Select different tokens`;
    }
  }

  if (!p.fromTokenAmount?.gt(0)) {
    return t`Enter an amount`;
  }

  if (!p.swapPath) {
    return t`Couldn't find a swap path`;
  }
}
