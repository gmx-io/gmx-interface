import { GlvOrMarketInfo } from "domain/synthetics/markets";
import { Trans } from "@lingui/macro";

import { getGlvDisplayName, getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets/utils";
import { helperToast } from "lib/helperToast";
import { isGlvInfo } from "../../../../domain/synthetics/markets/glv";

export function showMarketToast(market: GlvOrMarketInfo) {
  if (!market) return;

  const isGlv = isGlvInfo(market);
  const indexName = isGlv ? undefined : getMarketIndexName(market);
  const poolName = getMarketPoolName(market);
  const titlePrefix = isGlv ? getGlvDisplayName(market) : "GM: ";

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
