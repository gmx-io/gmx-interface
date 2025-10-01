import { Trans } from "@lingui/macro";

import Badge from "components/Badge/Badge";
import Button from "components/Button/Button";
import TooltipWithPortal from "components/Tooltip/TooltipWithPortal";

import { Opportunity, OpportunityTag, useOpportunityTagLabels } from "./useOpportunities";

type Props = {
  opportunity: Opportunity;
};

const tokenChipClass =
  "rounded-8 bg-slate-800 px-8 py-4 text-12 font-medium uppercase tracking-[0.08em] text-typography-secondary";

function OpportunityTokens({ tokens }: { tokens: string[] }) {
  if (!tokens.length) {
    return null;
  }

  const visibleTokens = tokens.slice(0, 1);
  const remainingCount = tokens.length - visibleTokens.length;

  const tooltipContent = (
    <div className="flex flex-col gap-4 text-12">
      {tokens.map((token) => (
        <span key={token} className="text-typography-primary">
          {token}
        </span>
      ))}
    </div>
  );

  const chips = (
    <div className="flex flex-wrap justify-end gap-6">
      {visibleTokens.map((token) => (
        <span key={token} className={tokenChipClass}>
          {token}
        </span>
      ))}
      {remainingCount > 0 ? <span className={tokenChipClass}>{`+${remainingCount}`}</span> : null}
    </div>
  );

  return (
    <div className="flex flex-col items-end gap-6 text-right">
      {tokens.length > visibleTokens.length ? (
        <TooltipWithPortal
          handle={chips}
          content={tooltipContent}
          variant="none"
          tooltipClassName="!rounded-12 !bg-slate-800 !p-12"
          contentClassName="text-left"
          fitHandleWidth
        />
      ) : (
        chips
      )}
    </div>
  );
}

export function OpportunityCard({ opportunity }: Props) {
  const { name, description, tags, tokens, link } = opportunity;

  const opportunityTagLabels = useOpportunityTagLabels();

  return (
    <div>
      <div className="flex justify-end gap-8 rounded-t-8 bg-slate-750 p-10">
        <OpportunityTokens tokens={tokens} />
        {tags.length ? (
          <div className="flex flex-wrap gap-6">
            {tags.map((tag) => (
              <Badge key={tag} className="bg-slate-800 px-8 py-4 text-12 text-typography-secondary">
                {opportunityTagLabels[tag as OpportunityTag]}
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
