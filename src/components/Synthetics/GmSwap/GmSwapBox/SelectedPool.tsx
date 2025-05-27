import { isGlvInfo } from "domain/synthetics/markets/glv";
import { GlvOrMarketInfo } from "domain/synthetics/markets/types";
import { getMarketIndexName } from "domain/synthetics/markets/utils";
import { getGlvDisplayName } from "domain/synthetics/markets/utils";
import { getByKey } from "lib/objects";
import { getNormalizedTokenSymbol } from "sdk/configs/tokens";

import TokenIcon from "components/TokenIcon/TokenIcon";

export function SelectedPool({
  selectedMarketAddress,
  glvAndMarketsInfoData,
}: {
  selectedMarketAddress: string | undefined;
  glvAndMarketsInfoData: Record<string, GlvOrMarketInfo>;
}) {
  const marketInfo = getByKey(glvAndMarketsInfoData, selectedMarketAddress);
  return (
    <div className="flex items-center gap-2">
      {marketInfo ? (
        <TokenIcon
          className="mr-5"
          symbol={
            marketInfo.isSpotOnly
              ? getNormalizedTokenSymbol(marketInfo.longToken.symbol) +
                getNormalizedTokenSymbol(marketInfo.shortToken.symbol)
              : isGlvInfo(marketInfo)
                ? marketInfo.glvToken.symbol
                : marketInfo?.indexToken.symbol
          }
          importSize={40}
          displaySize={20}
        />
      ) : null}
      <SelectedPoolLabel marketInfo={marketInfo} />
    </div>
  );
}

function SelectedPoolLabel({ marketInfo }: { marketInfo: GlvOrMarketInfo | undefined }) {
  if (!marketInfo) return "...";
  let name: string;

  if (isGlvInfo(marketInfo)) {
    name = getGlvDisplayName(marketInfo);
  } else {
    name = getMarketIndexName(marketInfo);
  }

  return <div>{name ? name : "..."}</div>;
}
