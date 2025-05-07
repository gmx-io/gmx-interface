import cx from "classnames";
import { useMemo } from "react";
import { useMedia } from "react-use";

import { GlvAndGmMarketsInfoData, GlvOrMarketInfo, getGlvOrMarketAddress } from "domain/synthetics/markets";
import { TokensData } from "domain/synthetics/tokens";

import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { CompositionBar } from "./components/CompositionBar";
import { CompositionTableGm } from "./components/CompositionTable";
import { useGlvGmMarketsWithComposition } from "./hooks/useMarketGlvGmMarketsCompositions";

const MIN_MARKETS_FOR_SCROLL = 10;

type Props = {
  marketsInfoData: GlvAndGmMarketsInfoData | undefined;
  marketTokensData: TokensData | undefined;
  marketInfo: GlvOrMarketInfo | undefined;
};

export function MarketComposition({ marketInfo, marketsInfoData, marketTokensData }: Props) {
  const marketsComposition = useGlvGmMarketsWithComposition(true, marketInfo && getGlvOrMarketAddress(marketInfo));
  const largeMarketsTableEntries = useMemo(() => {
    return marketsComposition.length >= MIN_MARKETS_FOR_SCROLL;
  }, [marketsComposition]);

  return (
    <div className="flex size-full grow flex-col items-center">
      <div className="px-16 py-20">
        <CompositionBar marketInfo={marketInfo} marketsInfoData={marketsInfoData} marketTokensData={marketTokensData} />
      </div>
      <div className="relative max-h-[130px] flex-grow overflow-y-scroll">
        <CompositionTableGm marketInfo={marketInfo} />
      </div>
    </div>
  );
}
