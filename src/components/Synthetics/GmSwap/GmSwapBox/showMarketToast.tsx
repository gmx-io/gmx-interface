import { MarketInfo } from "domain/synthetics/markets";
import { Trans } from "@lingui/macro";

import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets/utils";
import { helperToast } from "lib/helperToast";
import { isGlv } from "../../../../domain/synthetics/markets/glv";

export function showMarketToast(market: MarketInfo) {
  if (!market) return;

  const isGlvMarket = isGlv(market);
  const indexName = isGlvMarket ? market.name : getMarketIndexName(market);
  const poolName = getMarketPoolName(market);

  helperToast.success(
    <Trans>
      <div className="inline-flex">
        {isGlvMarket ? "GLV" : "GM"}:&nbsp;<span>{indexName}</span>
        <span className="subtext gm-toast">[{poolName}]</span>
      </div>{" "}
      <span>selected in order form</span>
    </Trans>
  );
}
