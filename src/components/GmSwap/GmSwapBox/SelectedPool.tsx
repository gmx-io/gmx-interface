import { isGlvInfo } from "domain/synthetics/markets/glv";
import { GlvOrMarketInfo } from "domain/synthetics/markets/types";
import {
  getGlvDisplayName,
  getGlvOrMarketIconSymbol,
  getMarketIndexName,
  getMarketPoolName,
} from "domain/synthetics/markets/utils";
import { getByKey } from "lib/objects";

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
        <TokenIcon className="mr-5" symbol={getGlvOrMarketIconSymbol(glvOrMarketInfo)} displaySize={20} />
      ) : null}
      <SelectedPoolLabel glvOrMarketInfo={glvOrMarketInfo} />
    </div>
  );
}

export function SelectedPoolLabel({ glvOrMarketInfo }: { glvOrMarketInfo: GlvOrMarketInfo | undefined }) {
  if (!glvOrMarketInfo) return "...";
  let name: string;

  if (isGlvInfo(glvOrMarketInfo)) {
    name = getGlvDisplayName(glvOrMarketInfo);
  } else {
    name = `GM: ${glvOrMarketInfo.isSpotOnly ? getMarketPoolName(glvOrMarketInfo) : getMarketIndexName(glvOrMarketInfo)}`;
  }

  return <div>{name ? name : "..."}</div>;
}
