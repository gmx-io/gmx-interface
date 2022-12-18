import {
  getMarketPoolData,
  getMarketTokenData,
  Market,
  MarketPoolType,
  MarketsPoolsData,
  MarketTokensData,
} from "domain/synthetics/markets";
import { BigNumber } from "ethers";
import { t } from "@lingui/macro";
import { getTokenData, TokenData, TokensData } from "domain/synthetics/tokens";

export enum Operation {
  deposit = "deposit",
  withdraw = "withdraw",
}

export enum Mode {
  single = "single",
  pair = "pair",
}

export const operationTexts = {
  [Operation.deposit]: t`Deposit`,
  [Operation.withdraw]: t`Withdraw`,
};

export const modeTexts = {
  [Mode.single]: t`Single`,
  [Mode.pair]: t`Pair`,
};

export type PoolDelta = {
  tokenAddress: string;
  token: TokenData;
  tokenAmount: BigNumber;
  usdAmount: BigNumber;
  usdDelta: BigNumber;
  poolType: MarketPoolType;
};

export function getSubmitError(p: {
  operation: Operation;
  tokensData: TokensData;
  marketTokensData: MarketTokensData;
  poolsData: MarketsPoolsData;
  market?: Market;
  marketTokenAmount?: BigNumber;
  longDelta?: PoolDelta;
  shortDelta?: PoolDelta;
  isHighPriceImpact?: boolean;
  isHighPriceImpactAccepted?: boolean;
}) {
  const marketToken = getMarketTokenData(p.marketTokensData, p.market?.marketTokenAddress);
  const pools = getMarketPoolData(p.poolsData, p.market?.marketTokenAddress);

  if (!p.market || !marketToken || !pools) {
    return t`Loading...`;
  }

  if (!p.marketTokenAmount?.gt(0)) {
    return t`Enter an amount`;
  }

  if (p.isHighPriceImpact && !p.isHighPriceImpactAccepted) {
    return t`Need to accept price impact`;
  }

  if (p.operation === Operation.deposit) {
    const insuficcientBalanceDelta = [p.longDelta, p.shortDelta].filter(Boolean).find((delta) => {
      const token = getTokenData(p.tokensData, delta!.tokenAddress);

      return delta!.tokenAmount.gt(token?.balance || BigNumber.from(0));
    });

    if (insuficcientBalanceDelta?.token) {
      return t`Insufficient ${insuficcientBalanceDelta.token.symbol} balance`;
    }
  } else {
    if (p.marketTokenAmount.gt(marketToken?.balance || BigNumber.from(0))) {
      return t`Insufficient ${marketToken?.symbol} balance`;
    }

    if (p.shortDelta && p.shortDelta.tokenAmount.gt(pools.shortPoolAmount || BigNumber.from(0))) {
      const shortToken = getTokenData(p.tokensData, p.shortDelta.tokenAddress);

      return t`Insufficient ${shortToken?.symbol} liquidity`;
    }

    if (p.longDelta && p.longDelta.tokenAmount.gt(pools.longPoolAmount || BigNumber.from(0))) {
      const longToken = getTokenData(p.tokensData, p.longDelta.tokenAddress);

      return t`Insufficient ${longToken?.symbol} liquidity`;
    }
  }

  return undefined;
}
