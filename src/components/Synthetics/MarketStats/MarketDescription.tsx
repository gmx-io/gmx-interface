import { Trans } from "@lingui/macro";

import { getMarketIndexName, MarketInfo } from "domain/synthetics/markets";

import "./MarketStats.scss";

type Props = {
  marketInfo?: MarketInfo;
};

export function MarketDescription({ marketInfo }: Props) {
  if (!marketInfo) {
    return null;
  }

  let text;
  if (marketInfo.indexToken.isSynthetic) {
    text = (
      <Trans>
        This token automatically accrues fees from leverage trading and swaps for the {getMarketIndexName(marketInfo)}{" "}
        market. It is also exposed to {marketInfo.longToken.symbol} and {marketInfo.shortToken.symbol} as per the
        composition displayed.
      </Trans>
    );
  } else if (marketInfo.isSpotOnly) {
    text = (
      <Trans>
        This token automatically accrues fees from swaps for the {marketInfo.longToken.symbol}/
        {marketInfo.shortToken.symbol} market. It is also exposed to {marketInfo.longToken.symbol} and{" "}
        {marketInfo.shortToken.symbol} as per the composition displayed.
      </Trans>
    );
  } else {
    let composition =
      marketInfo.longToken.symbol === marketInfo.shortToken.symbol
        ? marketInfo.longToken.symbol
        : `${marketInfo.longToken.symbol} and ${marketInfo.shortToken.symbol}`;
    text = (
      <Trans>
        This token automatically accrues fees from leverage trading and swaps for the {getMarketIndexName(marketInfo)}{" "}
        market. It is also exposed to {composition} as per the composition displayed.
      </Trans>
    );
  }

  return <div className="mb-16 leading-[2.2rem] opacity-70">{text}</div>;
}
