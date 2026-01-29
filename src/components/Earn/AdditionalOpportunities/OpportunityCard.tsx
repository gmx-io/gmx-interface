import { Trans } from "@lingui/macro";

import { GlvAndGmMarketsInfoData } from "domain/synthetics/markets";
import { sendEarnOpportunityClickedEvent } from "lib/userAnalytics/earnEvents";
import { TokensData } from "sdk/utils/tokens/types";

import Badge from "components/Badge/Badge";
import Button from "components/Button/Button";

import UpRightArrowIcon from "img/ic_up_right_arrow.svg?react";

import { OpportunityAssets } from "./OpportunityAssets";
import { Opportunity, useOpportunityTagLabels } from "./useOpportunities";

type Props = {
  opportunity: Opportunity;
  marketsInfoData: GlvAndGmMarketsInfoData | undefined;
  tokensData: TokensData | undefined;
};

function OpportunityCard({ opportunity, marketsInfoData, tokensData }: Props) {
  const { name, description, tags, assets: tokens, link } = opportunity;

  const opportunityTagLabels = useOpportunityTagLabels();

  return (
    <div className="rounded-8 bg-slate-900">
      <div className="flex justify-end gap-12 rounded-t-8 bg-fill-surfaceElevated50 p-10">
        <OpportunityAssets assets={tokens} marketsInfoData={marketsInfoData} tokensData={tokensData} />
        {tags.length ? (
          <div className="flex flex-wrap gap-6">
            {tags.map((tag) => (
              <Badge key={tag} className="!bg-slate-700 px-8 py-4 text-12 text-typography-secondary">
                {opportunityTagLabels[tag]}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
      <div className="relative flex min-h-[136px] flex-col justify-end p-20 pt-28">
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

          <Button
            variant="secondary"
            to={link}
            newTab
            showExternalLinkArrow={false}
            onClick={() => sendEarnOpportunityClickedEvent(name)}
            className="max-sm:p-8"
          >
            <span className="max-sm:hidden">
              <Trans>Explore</Trans>
            </span>
            <UpRightArrowIcon className="size-16" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default OpportunityCard;
