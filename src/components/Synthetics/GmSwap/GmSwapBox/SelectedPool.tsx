import { isGlvInfo } from "domain/synthetics/markets/glv";
import { GlvOrMarketInfo } from "domain/synthetics/markets/types";
import { getMarketIndexName } from "domain/synthetics/markets/utils";
import { getGlvDisplayName } from "domain/synthetics/markets/utils";
import { getByKey } from "lib/objects";
import { getNormalizedTokenSymbol } from "sdk/configs/tokens";

import TokenIcon from "components/TokenIcon/TokenIcon";

export function SelectedPool({
  selectedGlvOrMarketAddress,
  glvAndMarketsInfoData,
}: {
  selectedGlvOrMarketAddress: string | undefined;
  glvAndMarketsInfoData: Record<string, GlvOrMarketInfo>;
}) {
  const glvOrMarketInfo = getByKey(glvAndMarketsInfoData, selectedGlvOrMarketAddress);
  return (
    <div className="flex items-center gap-2">
      {glvOrMarketInfo ? (
        <TokenIcon
          className="mr-5"
          symbol={
            glvOrMarketInfo.isSpotOnly
              ? getNormalizedTokenSymbol(glvOrMarketInfo.longToken.symbol) +
                getNormalizedTokenSymbol(glvOrMarketInfo.shortToken.symbol)
              : isGlvInfo(glvOrMarketInfo)
                ? glvOrMarketInfo.glvToken.symbol
                : glvOrMarketInfo?.indexToken.symbol
          }
          importSize={40}
          displaySize={20}
        />
      ) : null}
      <SelectedPoolLabel glvOrMarketInfo={glvOrMarketInfo} />
    </div>
  );
}

function SelectedPoolLabel({ glvOrMarketInfo }: { glvOrMarketInfo: GlvOrMarketInfo | undefined }) {
  if (!glvOrMarketInfo) return "...";
  let name: string;

  if (isGlvInfo(glvOrMarketInfo)) {
    name = getGlvDisplayName(glvOrMarketInfo);
  } else {
    name = `GM: ${getMarketIndexName(glvOrMarketInfo)}`;
  }

  return <div>{name ? name : "..."}</div>;
}
