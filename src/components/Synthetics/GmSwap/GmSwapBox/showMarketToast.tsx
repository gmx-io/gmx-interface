import { Trans } from "@lingui/macro";

import { getMarketIndexName, getMarketPoolName } from "domain/synthetics/markets/utils";
import { helperToast } from "lib/helperToast";

export function showMarketToast(market) {
  if (!market) return;

  const indexName = getMarketIndexName(market);
  const poolName = getMarketPoolName(market);
  helperToast.success(
    <Trans>
      <div className="inline-flex">
        GM:&nbsp;<span>{indexName}</span>
        <span className="subtext gm-toast">[{poolName}]</span>
      </div>{" "}
      <span>selected in order form</span>
    </Trans>
  );
}
