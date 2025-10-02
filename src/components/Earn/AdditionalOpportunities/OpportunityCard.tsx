import { Trans } from "@lingui/macro";
import cx from "classnames";

import {
  getMarketIndexName,
  getMarketPoolName,
  GlvAndGmMarketsInfoData,
  isMarketInfo,
  MarketInfo,
} from "domain/synthetics/markets";
import { isGlvInfo } from "domain/synthetics/markets/glv";
import { getNormalizedTokenSymbol } from "sdk/configs/tokens";

import Badge from "components/Badge/Badge";
import Button from "components/Button/Button";
import TokenIcon from "components/TokenIcon/TokenIcon";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import GlvRoundedIcon from "img/ic_glv_rounded.svg?react";
import GmxRoundedIcon from "img/ic_gmx_rounded.svg?react";

import { Opportunity, useOpportunityTagLabels } from "./useOpportunities";

type Props = {
  opportunity: Opportunity;
  marketsInfoData: GlvAndGmMarketsInfoData | undefined;
};

function OpportunityTokens({
  tokens,
  marketsInfoData,
}: {
  tokens: string[];
  marketsInfoData: GlvAndGmMarketsInfoData | undefined;
}) {
  if (!tokens.length) {
    return null;
  }

  const visibleTokens = tokens.slice(0, 3);
  const remainingCount = tokens.length - visibleTokens.length;

  return (
    <TooltipWithPortal
      handle={
        <div className="flex items-center justify-end">
          {visibleTokens.map((token) => (
            <span key={token} className="relative -mr-6 size-24">
              <OpportunityTokenIcon
                token={token}
                marketsInfoData={marketsInfoData}
                className="absolute left-0 border-2 border-slate-700 "
              />
            </span>
          ))}
          {remainingCount > 0 ? (
            <div className="relative -mr-6 size-24">
              <span className="flex size-24 items-center justify-center rounded-full border-2 border-slate-700 bg-slate-800 text-[9px] font-medium text-typography-secondary">{`+${remainingCount}`}</span>
            </div>
          ) : null}
        </div>
      }
      content={
        <div className="flex flex-col gap-6 text-12">
          {tokens.map((token) => (
            <span key={token} className="flex items-center gap-6">
              <OpportunityTokenIcon token={token} marketsInfoData={marketsInfoData} />

              <OpportunityTokenLabel token={token} marketsInfoData={marketsInfoData} />
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
  token,
  marketsInfoData,
  className: _className,
}: {
  token: string;
  marketsInfoData: GlvAndGmMarketsInfoData | undefined;
  className?: string;
}) {
  const className = cx("size-24 rounded-full", _className);
  const displaySize = 24;

  if (token === "stGMX" || token === "GMX") {
    return <GmxRoundedIcon className={className} />;
  }

  if (token.startsWith("GLV ")) {
    return <GlvRoundedIcon className={className} />;
  }

  if (token.startsWith("GM ")) {
    if (!marketsInfoData) {
      return null;
    }

    const market = Object.values(marketsInfoData).find(
      (marketInfo): marketInfo is MarketInfo =>
        isMarketInfo(marketInfo) && `GM ${getMarketPoolName(marketInfo, "-")}` === token
    );
    if (!market) {
      return null;
    }

    const iconSymbol = market.isSpotOnly
      ? getNormalizedTokenSymbol(market.longToken.symbol) + getNormalizedTokenSymbol(market.shortToken.symbol)
      : getNormalizedTokenSymbol(market.indexToken.symbol);

    return market ? (
      <TokenIcon importSize={24} displaySize={displaySize} symbol={iconSymbol} className={className} />
    ) : null;
  }

  return <TokenIcon importSize={24} displaySize={displaySize} symbol={token} className={className} />;
}

export const OpportunityTokenLabel = ({
  token,
  marketsInfoData,
}: {
  token: string;
  marketsInfoData: GlvAndGmMarketsInfoData | undefined;
}) => {
  if (token === "stGMX") {
    return "Staked GMX";
  }

  if (token.startsWith("GLV ") || token.startsWith("GM ")) {
    if (!marketsInfoData) {
      return null;
    }

    const market = Object.values(marketsInfoData).find(
      (marketInfo) => `${isGlvInfo(marketInfo) ? "GLV" : "GM"} ${getMarketPoolName(marketInfo, "-")}` === token
    );

    if (!market) {
      return null;
    }

    return (
      <span>
        <span className="font-medium text-typography-primary">
          {isGlvInfo(market) ? "GLV" : getMarketIndexName(market)}{" "}
        </span>
        <span className="text-typography-secondary">[{getMarketPoolName(market, "-")}]</span>
      </span>
    );
  }

  return token;
};

export function OpportunityCard({ opportunity, marketsInfoData }: Props) {
  const { name, description, tags, assets: tokens, link } = opportunity;

  const opportunityTagLabels = useOpportunityTagLabels();

  return (
    <div>
      <div className="flex justify-end gap-12 rounded-t-8 bg-slate-750/50 p-10 dark:bg-slate-750">
        <OpportunityTokens tokens={tokens} marketsInfoData={marketsInfoData} />
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
        <div
          aria-hidden
          className="absolute -top-20 left-20 flex size-40 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800"
        />
        <div className="flex items-end justify-between gap-16">
          <div className="flex flex-col gap-4">
            <h3 className="text-16 font-medium text-typography-primary">{name}</h3>
            <p className="leading-5 text-13 text-typography-secondary">{description}</p>
          </div>

          {link ? (
            <Button variant="secondary" to={link} newTab showExternalLinkArrow>
              <Trans>Explore</Trans>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default OpportunityCard;
