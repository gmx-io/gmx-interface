import { t } from "@lingui/macro";
import cx from "classnames";
import { cloneElement, Fragment, isValidElement, ReactNode } from "react";

import { getChainName } from "config/chains";
import { AnnouncementType, EventData } from "config/events";
import { getChainIcon } from "config/icons";

import { formatEventDate, getEventSortDate, reactNodeToText, splitByMatches } from "./announcementsHelpers";

const EMPTY_TOKENS: string[] = [];

type AnnouncementCardProps = {
  event: EventData;
  searchTokens?: string[];
  isHighlighted?: boolean;
};

export function AnnouncementCard({ event, searchTokens = EMPTY_TOKENS, isHighlighted }: AnnouncementCardProps) {
  const date = getEventSortDate(event);
  const titleText = reactNodeToText(event.title);

  return (
    <article
      data-announcement-id={event.id}
      className={cx(
        "flex flex-col gap-20 rounded-8 bg-fill-card p-20 transition-shadow duration-500 max-lg:gap-16",
        isHighlighted && "ring-2 ring-inset ring-blue-300"
      )}
    >
      <div className="grid grid-cols-[1fr_auto] items-start gap-x-12 gap-y-8 max-lg:grid-cols-1">
        <p className="text-body-small font-medium text-blue-300">{formatEventDate(date)}</p>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-4 max-lg:order-last max-lg:mt-4 max-lg:justify-start">
          {event.chains?.map((chainId) => <ChainBadge key={chainId} chainId={chainId} />)}
          <TypeTag type={event.type} />
        </div>
        <h3 className="text-h2 col-span-full max-w-[600px] text-typography-primary">
          <HighlightedText text={titleText} tokens={searchTokens} />
        </h3>
      </div>

      <div className="text-body-medium flex max-w-[600px] flex-col gap-12 leading-[1.3] text-typography-secondary [&_a:hover]:!underline [&_a]:!text-blue-300 [&_a]:!no-underline">
        {event.summary !== undefined && <div>{highlightNode(event.summary, searchTokens)}</div>}
        <div>{highlightNode(event.description, searchTokens)}</div>
        {event.link && (
          <a
            className="self-start"
            href={event.link.href}
            target={event.link.newTab ? "_blank" : undefined}
            rel={event.link.newTab ? "noopener noreferrer" : undefined}
          >
            {event.link.text}
          </a>
        )}
      </div>
    </article>
  );
}

function highlightNode(node: ReactNode, tokens: string[]): ReactNode {
  if (tokens.length === 0) return node;
  if (node === null || node === undefined || typeof node === "boolean") return node;
  if (typeof node === "string" || typeof node === "number") {
    return <HighlightedText text={String(node)} tokens={tokens} />;
  }
  if (Array.isArray(node)) {
    return node.map((child, i) => <Fragment key={i}>{highlightNode(child, tokens)}</Fragment>);
  }
  if (isValidElement(node)) {
    const children = (node.props as { children?: ReactNode }).children;
    if (children === undefined) return node;
    return cloneElement(node, undefined, highlightNode(children, tokens));
  }
  return node;
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
    <span className="text-body-small inline-flex h-18 items-center gap-2 rounded-full border-1/2 border-stroke-primary pl-[0.5px] pr-6 text-typography-secondary">
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
