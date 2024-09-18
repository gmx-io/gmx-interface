import { Trans } from "@lingui/macro";

import { getMarketIndexName, GlvOrMarketInfo } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";

type Props = {
  marketInfo?: GlvOrMarketInfo;
};

export function MarketDescription({ marketInfo }: Props) {
  if (!marketInfo) {
    return null;
  }

  let text;

  if (isGlvInfo(marketInfo)) {
    text = (
      <Trans>
        This token is a vault of automatically rebalanced GM tokens that accrue fees from leverage trading and swaps
        from the included markets.
      </Trans>
    );
  } else {
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
  }

  return <div className="mb-16 leading-[2.2rem] opacity-70">{text}</div>;
}
