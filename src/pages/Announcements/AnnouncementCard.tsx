import { t } from "@lingui/macro";

import { getChainName } from "config/chains";
import { AnnouncementType, EventData } from "config/events";
import { getChainIcon } from "config/icons";

import { formatEventDate, getEventSortDate, reactNodeToText, splitByMatches } from "./announcementsHelpers";

const EMPTY_TOKENS: string[] = [];

type AnnouncementCardProps = {
  event: EventData;
  searchTokens?: string[];
};

export function AnnouncementCard({ event, searchTokens = EMPTY_TOKENS }: AnnouncementCardProps) {
  const date = getEventSortDate(event);
  const titleText = reactNodeToText(event.title);

  return (
    <article data-announcement-id={event.id} className="flex flex-col gap-20 rounded-8 bg-fill-card p-20">
      <div className="flex items-start justify-between gap-12">
        <div className="flex min-w-0 max-w-[600px] flex-col gap-8">
          <p className="text-body-small font-medium text-blue-100">{formatEventDate(date)}</p>
          <h3 className="text-h2 text-typography-primary">
            <HighlightedText text={titleText} tokens={searchTokens} />
          </h3>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-4">
          {event.chains?.map((chainId) => <ChainBadge key={chainId} chainId={chainId} />)}
          <TypeTag type={event.type} />
        </div>
      </div>

      <div className="text-body-medium max-w-[600px] text-typography-secondary [&_a]:text-blue-300 hover:[&_a]:underline">
        {event.description}
      </div>
    </article>
  );
}

function HighlightedText({ text, tokens }: { text: string; tokens: string[] }) {
  if (tokens.length === 0) return <>{text}</>;
  const segments = splitByMatches(text, tokens);
  return (
    <>
      {segments.map((segment, i) =>
        segment.matched ? (
          <mark key={i} className="rounded-2 bg-blue-300/25 text-typography-primary">
            {segment.text}
          </mark>
        ) : (
          <span key={i}>{segment.text}</span>
        )
      )}
    </>
  );
}

function ChainBadge({ chainId }: { chainId: number }) {
  const name = getChainName(chainId);
  const icon = getChainIcon(chainId);
  return (
    <span className="text-body-small inline-flex h-18 items-center gap-2 rounded-full border-1/2 border-stroke-primary pl-2 pr-6 text-typography-secondary">
      <img src={icon} alt="" className="size-16" />
      {name}
    </span>
  );
}

function TypeTag({ type }: { type: AnnouncementType }) {
  const labels: Record<AnnouncementType, string> = {
    listing: t`Listing`,
    delisting: t`Delisting`,
    update: t`Update`,
    maintenance: t`Maintenance`,
  };
  return (
    <span
      className="text-body-small inline-flex h-18 items-center rounded-full border-1/2 border-stroke-primary px-6 text-typography-secondary"
      data-qa={`announcement-tag-${type}`}
    >
      {labels[type]}
    </span>
  );
}
