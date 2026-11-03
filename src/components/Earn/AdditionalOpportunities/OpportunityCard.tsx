import { Trans } from "@lingui/macro";

import { GlvAndGmMarketsInfoData } from "domain/synthetics/markets";
import { sendEarnOpportunityClickedEvent } from "lib/userAnalytics/earnEvents";

import Badge from "components/Badge/Badge";
import Button from "components/Button/Button";

import UpRightArrowIcon from "img/ic_up_right_arrow.svg?react";

import { OpportunityAssets } from "./OpportunityAssets";
import { Opportunity, useOpportunityTagLabels } from "./useOpportunities";

type Props = {
  opportunity: Opportunity;
  marketsInfoData: GlvAndGmMarketsInfoData | undefined;
};

function OpportunityCard({ opportunity, marketsInfoData }: Props) {
  const { name, description, tags, assets: tokens, link } = opportunity;

  const opportunityTagLabels = useOpportunityTagLabels();

  return (
    <div className="rounded-8 bg-fill-surfaceBase">
      <div className="flex items-center justify-between gap-12 rounded-t-8 bg-fill-surfaceElevated50 px-20 py-10">
        <img
          className="flex size-40 shrink-0 items-center justify-center rounded-full bg-fill-surfaceElevated"
          src={opportunity.icon}
          alt={name}
        />
        <div className="flex min-w-0 items-center justify-end gap-12">
          <OpportunityAssets assets={tokens} marketsInfoData={marketsInfoData} />
          {tags.length ? (
            <div className="flex min-w-0 flex-wrap justify-end gap-6">
              {tags.map((tag) => (
                <Badge key={tag} className="text-body-small !bg-button-background px-8 py-4 text-textIcon-secondary">
                  {opportunityTagLabels[tag]}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex min-h-[112px] flex-col justify-end p-20">
        <div className="flex items-end justify-between gap-16">
          <div className="flex flex-col gap-4">
            <h3 className="text-body-large font-medium text-textIcon-primary">{name}</h3>
            <p className="text-body-medium text-textIcon-secondary">{description}</p>
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
