import { Trans } from "@lingui/macro";
import { useMemo } from "react";

import { formatAmountHuman } from "lib/numbers/formatting";

import { AmountWithUsdHuman } from "components/AmountWithUsd/AmountWithUsd";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { USD_DECIMALS } from "config/factors";
import { getPoolUsdWithoutPnl, getStrictestMaxPoolUsdForDeposit, GlvOrMarketInfo } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { TokenData } from "domain/synthetics/tokens";

export function MintableAmount({
  mintableInfo,
  market,
  token,
  longToken,
  shortToken,
  multiline,
}: {
  mintableInfo:
    | {
        mintableAmount: bigint;
        mintableUsd: bigint;
        longDepositCapacityUsd?: bigint;
        shortDepositCapacityUsd?: bigint;
        longDepositCapacityAmount?: bigint;
        shortDepositCapacityAmount?: bigint;
      }
    | undefined;
  market: GlvOrMarketInfo;
  token: TokenData;
  longToken?: TokenData;
  shortToken?: TokenData;
  multiline?: boolean;
}) {
  const isGlv = isGlvInfo(market);

  const longTokenMaxValue = useMemo(() => {
    if (isGlv || !longToken) {
      return undefined;
    }

    if (market?.isSameCollaterals) {
      const poolUsd = formatAmountHuman(
        getPoolUsdWithoutPnl(market, true, "midPrice") + getPoolUsdWithoutPnl(market, false, "midPrice"),
        USD_DECIMALS,
        true,
        2
      );
      const maxPoolUsd = formatAmountHuman(
        getStrictestMaxPoolUsdForDeposit(market, true) + getStrictestMaxPoolUsdForDeposit(market, false),
        USD_DECIMALS,
        true,
        2
      );

      return [
        <AmountWithUsdHuman
          key="longTokenMaxValue-isSameCollaterals"
          amount={(mintableInfo?.longDepositCapacityAmount ?? 0n) + (mintableInfo?.shortDepositCapacityAmount ?? 0n)}
          decimals={longToken.decimals}
          usd={(mintableInfo?.longDepositCapacityUsd ?? 0n) + (mintableInfo?.shortDepositCapacityUsd ?? 0n)}
        />,
        <span key="longTokenMaxValue-isSameCollaterals-ratio" className="text-body-small text-slate-100">
          ({poolUsd} / {maxPoolUsd})
        </span>,
      ];
    }

    const poolUsd = formatAmountHuman(getPoolUsdWithoutPnl(market, true, "midPrice"), USD_DECIMALS, true, 2);
    const maxPoolUsd = formatAmountHuman(getStrictestMaxPoolUsdForDeposit(market, true), USD_DECIMALS, true, 2);

    return [
      <AmountWithUsdHuman
        key="longTokenMaxValue"
        amount={mintableInfo?.longDepositCapacityAmount}
        decimals={longToken.decimals}
        usd={mintableInfo?.longDepositCapacityUsd}
        symbol={longToken.symbol}
      />,
      <span key="longTokenMaxValue-ratio" className="text-body-small text-slate-100">
        ({poolUsd} / {maxPoolUsd})
      </span>,
    ];
  }, [
    isGlv,
    longToken,
    market,
    mintableInfo?.longDepositCapacityAmount,
    mintableInfo?.longDepositCapacityUsd,
    mintableInfo?.shortDepositCapacityAmount,
    mintableInfo?.shortDepositCapacityUsd,
  ]);

  const shortTokenMaxValue = useMemo(() => {
    if (isGlv || !shortToken) {
      return undefined;
    }

    const poolUsd = formatAmountHuman(getPoolUsdWithoutPnl(market, false, "midPrice"), USD_DECIMALS, true, 2);
    const maxPoolUsd = formatAmountHuman(getStrictestMaxPoolUsdForDeposit(market, false), USD_DECIMALS, true, 2);

    return [
      <AmountWithUsdHuman
        key="shortTokenMaxValue"
        amount={mintableInfo?.shortDepositCapacityAmount}
        decimals={shortToken.decimals}
        usd={mintableInfo?.shortDepositCapacityUsd}
        symbol={shortToken.symbol}
      />,
      <span key="shortTokenMaxValue-ratio" className="text-body-small text-slate-100">
        ({poolUsd} / {maxPoolUsd})
      </span>,
    ];
  }, [isGlv, market, mintableInfo, shortToken]);

  const content = (
    <AmountWithUsdHuman
      multiline={multiline}
      amount={mintableInfo?.mintableAmount}
      decimals={token.decimals}
      usd={mintableInfo?.mintableUsd}
      symbol={token.symbol}
    />
  );

  if (!longToken || !shortToken) {
    return content;
  }

  return (
    <TooltipWithPortal
      handle={content}
      className="normal-case"
      position="bottom-end"
      handleClassName="!block"
      content={
        <>
          <p className="text-white">
            {market?.isSameCollaterals ? (
              <Trans>{longToken.symbol} can be used to buy GM for this market up to the specified buying caps.</Trans>
            ) : (
              <Trans>
                {longToken.symbol} and {shortToken.symbol} can be used to buy GM for this market up to the specified
                buying caps.
              </Trans>
            )}
          </p>
          <br />
          <StatsTooltipRow label={`Max ${longToken.symbol}`} value={longTokenMaxValue} />
          {!market.isSameCollaterals && (
            <StatsTooltipRow label={`Max ${shortToken.symbol}`} value={shortTokenMaxValue} />
          )}
        </>
      }
    />
  );
}
