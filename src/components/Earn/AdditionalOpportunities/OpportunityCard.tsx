import { Trans } from "@lingui/macro";
import cx from "classnames";

import { getMarketIndexName, getMarketPoolName, GlvAndGmMarketsInfoData } from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { mustNeverExist } from "lib/types";
import { sendEarnOpportunityClickedEvent } from "lib/userAnalytics";
import { getNormalizedTokenSymbol } from "sdk/configs/tokens";
import { TokensData } from "sdk/types/tokens";

import Badge from "components/Badge/Badge";
import Button from "components/Button/Button";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import GlvRoundedIcon from "img/ic_glv_rounded.svg?react";
import GmxRoundedIcon from "img/ic_gmx_rounded.svg?react";

import { getOpportunityAssetKey, Opportunity, OpportunityAsset, useOpportunityTagLabels } from "./useOpportunities";

type Props = {
  opportunity: Opportunity;
  marketsInfoData: GlvAndGmMarketsInfoData | undefined;
  tokensData: TokensData | undefined;
};

function OpportunityAssets({
  assets,
  marketsInfoData,
  tokensData,
}: {
  assets: OpportunityAsset[];
  marketsInfoData: GlvAndGmMarketsInfoData | undefined;
  tokensData: TokensData | undefined;
}) {
  if (!assets.length) {
    return null;
  }

  const visibleAssets = assets.slice(0, 3);
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
              <span className="flex size-24 items-center justify-center rounded-full border-2 border-slate-700 bg-slate-800 text-[11px] font-medium normal-nums text-typography-secondary">{`+${remainingCount}`}</span>
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

        return <TokenIcon importSize={24} displaySize={displaySize} symbol={iconSymbol} className={className} />;
      }

      return null;
    }
    case "token": {
      const token = tokensData?.[asset.address];
      const symbol = token?.symbol;

      if (symbol === "GMX") {
        return <GmxRoundedIcon className={className} />;
      }

      return <TokenIcon importSize={24} displaySize={displaySize} symbol={symbol!} className={className} />;
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
        const poolName = getMarketPoolName(glvInfo, "-");
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
        const poolName = getMarketPoolName(marketInfo, "-");
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

export function OpportunityCard({ opportunity, marketsInfoData, tokensData }: Props) {
  const { name, description, tags, assets: tokens, link } = opportunity;

  const opportunityTagLabels = useOpportunityTagLabels();

  const handleExploreClick = () => {
    sendEarnOpportunityClickedEvent(name);
  };

  return (
    <div>
      <div className="flex justify-end gap-12 rounded-t-8 bg-slate-750/50 p-10 dark:bg-slate-750">
        <OpportunityAssets assets={tokens} marketsInfoData={marketsInfoData} tokensData={tokensData} />
        {tags.length ? (
          <div className="flex flex-wrap gap-6">
            {tags.map((tag) => (
              <Badge key={tag} className="bg-slate-800 px-8 py-4 text-12 text-typography-secondary">
                {opportunityTagLabels[tag]}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
      <div className="relative flex min-h-[136px] flex-col justify-end rounded-b-8 bg-slate-900 p-20 pt-28">
        <img
          className="absolute -top-20 left-20 flex size-40 shrink-0 items-center justify-center rounded-full bg-slate-800"
          src={opportunity.icon}
          alt={name}
        />
        <div className="flex items-end justify-between gap-16">
          <div className="flex flex-col gap-4">
            <h3 className="text-16 font-medium text-typography-primary">{name}</h3>
            <p className="leading-5 text-13 text-typography-secondary">{description}</p>
          </div>

          {link ? (
            <Button variant="secondary" to={link} newTab showExternalLinkArrow onClick={handleExploreClick}>
              <Trans>Explore</Trans>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default OpportunityCard;
