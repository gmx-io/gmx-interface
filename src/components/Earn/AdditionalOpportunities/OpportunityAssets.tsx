import cx from "classnames";

import { getMarketIndexName, getMarketPoolName, GlvAndGmMarketsInfoData } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { mustNeverExist } from "lib/types";
import { useBreakpoints } from "lib/useBreakpoints";
import { getNormalizedTokenSymbol } from "sdk/configs/tokens";
import { TokensData } from "sdk/utils/tokens/types";

import TokenIcon from "components/TokenIcon/TokenIcon";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import GlvRoundedIcon from "img/ic_glv_rounded.svg?react";
import GmxRoundedIcon from "img/ic_gmx_rounded.svg?react";

import { getOpportunityAssetKey, OpportunityAsset } from "./useOpportunities";

export function OpportunityAssets({
  assets,
  marketsInfoData,
  tokensData,
}: {
  assets: OpportunityAsset[];
  marketsInfoData: GlvAndGmMarketsInfoData | undefined;
  tokensData: TokensData | undefined;
}) {
  const { isSmallMobile } = useBreakpoints();

  if (!assets.length) {
    return null;
  }

  const maxVisibleAssets = isSmallMobile ? 2 : 3;
  const visibleAssets = assets.slice(0, maxVisibleAssets);
  const remainingCount = assets.length - visibleAssets.length;

  return (
    <TooltipWithPortal
      handle={
        <div className="flex items-center justify-end">
          {visibleAssets.map((token) => (
            <span key={getOpportunityAssetKey(token)} className="relative -mr-6 size-24">
              <OpportunityTokenIcon
                asset={token}
                marketsInfoData={marketsInfoData}
                tokensData={tokensData}
                className="absolute left-0 border-2 border-slate-700 "
              />
            </span>
          ))}
          {remainingCount > 0 ? (
            <div className="relative -mr-6 size-24">
              <span
                className={cx(
                  "flex size-24 items-center justify-center rounded-full border-2 border-slate-700",
                  "bg-slate-700 text-[11px] font-medium normal-nums text-typography-secondary"
                )}
              >
                +{remainingCount}
              </span>
            </div>
          ) : null}
        </div>
      }
      content={
        <div className="flex flex-col gap-6 text-12">
          {assets.map((token) => (
            <span key={getOpportunityAssetKey(token)} className="flex items-center gap-6">
              <OpportunityTokenIcon asset={token} marketsInfoData={marketsInfoData} tokensData={tokensData} />

              <OpportunityTokenLabel asset={token} marketsInfoData={marketsInfoData} tokensData={tokensData} />
            </span>
          ))}
        </div>
      }
      variant="none"
      position="bottom"
      className="h-24"
    />
  );
}

function OpportunityTokenIcon({
  asset,
  marketsInfoData,
  tokensData,
  className: _className,
}: {
  asset: OpportunityAsset;
  marketsInfoData: GlvAndGmMarketsInfoData | undefined;
  tokensData: TokensData | undefined;
  className?: string;
}) {
  const className = cx("size-24 rounded-full", _className);
  const displaySize = 24;

  switch (asset.type) {
    case "stGmx":
      return <GmxRoundedIcon className={className} />;
    case "glv":
      return <GlvRoundedIcon className={className} />;
    case "market": {
      const marketInfo = marketsInfoData?.[asset.address];

      if (marketInfo && !isGlvInfo(marketInfo)) {
        const iconSymbol = marketInfo.isSpotOnly
          ? getNormalizedTokenSymbol(marketInfo.longToken.symbol) +
            getNormalizedTokenSymbol(marketInfo.shortToken.symbol)
          : getNormalizedTokenSymbol(marketInfo.indexToken.symbol);

        return <TokenIcon displaySize={displaySize} symbol={iconSymbol} className={className} />;
      }

      return null;
    }
    case "token": {
      const token = tokensData?.[asset.address];
      const symbol = token?.symbol;

      if (symbol === "GMX") {
        return <GmxRoundedIcon className={className} />;
      }

      if (!symbol) {
        return <div className="size-24 rounded-full bg-slate-800" />;
      }

      return <TokenIcon displaySize={displaySize} symbol={symbol} className={className} />;
    }
    default:
      mustNeverExist(asset);
  }
}

export const OpportunityTokenLabel = ({
  asset,
  marketsInfoData,
  tokensData,
}: {
  asset: OpportunityAsset;
  marketsInfoData: GlvAndGmMarketsInfoData | undefined;
  tokensData: TokensData | undefined;
}) => {
  switch (asset.type) {
    case "stGmx": {
      return "Staked GMX";
    }
    case "token": {
      const token = tokensData?.[asset.address];
      return token?.symbol;
    }
    case "glv": {
      const glvInfo = marketsInfoData?.[asset.address];
      if (glvInfo) {
        const poolName = getMarketPoolName(glvInfo);
        return (
          <span>
            <span className="font-medium text-typography-primary">{`GLV `}</span>
            <span className="text-typography-secondary">[{poolName}]</span>
          </span>
        );
      }
      return null;
    }
    case "market": {
      const marketInfo = marketsInfoData?.[asset.address];
      if (marketInfo) {
        const indexName = getMarketIndexName(marketInfo);
        const poolName = getMarketPoolName(marketInfo);
        return (
          <span>
            <span className="font-medium text-typography-primary">{`GM: ${indexName} `}</span>
            <span className="text-typography-secondary">[{poolName}]</span>
          </span>
        );
      }
      return null;
    }
    default:
      mustNeverExist(asset);
  }
};
