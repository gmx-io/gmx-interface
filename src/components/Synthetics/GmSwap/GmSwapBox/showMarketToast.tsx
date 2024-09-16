import { MarketInfo } from "domain/synthetics/markets";
import { Trans } from "@lingui/macro";

import { getGlvDisplayName, getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets/utils";
import { helperToast } from "lib/helperToast";
import { isGlv } from "../../../../domain/synthetics/markets/glv";
import { GlvMarketInfo } from "domain/synthetics/markets/useGlvMarkets";

export function showMarketToast(market: MarketInfo | GlvMarketInfo) {
  if (!market) return;

  const isGlvMarket = isGlv(market);
  const indexName = isGlvMarket ? undefined : getMarketIndexName(market);
  const poolName = getMarketPoolName(market);
  const titlePrefix = isGlvMarket ? getGlvDisplayName(market) : "GM: ";

  helperToast.success(
    <Trans>
      <div className="inline-flex">
        {titlePrefix}
        {indexName ? <span>&nbsp;{indexName}</span> : null}
        <span className="subtext gm-toast">[{poolName}]</span>
      </div>{" "}
      <span>selected in order form</span>
    </Trans>
  );
}
