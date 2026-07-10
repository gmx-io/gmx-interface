import { format, isAfter, parse } from "date-fns";
import { ReactNode } from "react";

import { AnnouncementType, EventData } from "config/events";

export const ANNOUNCEMENTS_PAGE_SIZE = 20;

export type AnnouncementTab = "all" | AnnouncementType;

export function parseEventDate(raw: string): Date {
  return parse(`${raw}, +00`, "d MMM yyyy, H:mm, x", new Date());
}

export function getEventSortDate(event: EventData): Date {
  return parseEventDate(event.startDate ?? event.endDate);
}

export function formatEventDate(date: Date): string {
  return format(date, "EEEE, MMMM d, yyyy");
}

export function isEventActiveByFlag(event: EventData, uiFlags: Record<string, boolean> | undefined): boolean {
  if (event.flagId !== undefined) {
    return uiFlags?.[event.flagId] === true;
  }
  return event.isActive === true;
}

export function hasEventStarted(event: EventData, now: Date): boolean {
  if (!event.startDate) return true;
  return isAfter(now, parseEventDate(event.startDate));
}

export function reactNodeToText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(reactNodeToText).join(" ");
  if (typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: ReactNode } }).props;
    if (props?.children !== undefined) {
      return reactNodeToText(props.children);
    }
  }
  return "";
}

export function tokenizeSearchQuery(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export function matchesAllTokens(haystack: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const lower = haystack.toLowerCase();
  return tokens.every((token) => lower.includes(token));
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function splitByMatches(text: string, tokens: string[]): Array<{ text: string; matched: boolean }> {
  if (!text || tokens.length === 0) return [{ text, matched: false }];

  const dedupedTokens = Array.from(new Set(tokens.filter(Boolean))).sort((a, b) => b.length - a.length);
  if (dedupedTokens.length === 0) return [{ text, matched: false }];

  const pattern = new RegExp(`(${dedupedTokens.map(escapeRegex).join("|")})`, "gi");
  const segments: Array<{ text: string; matched: boolean }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), matched: false });
    }
    segments.push({ text: match[0], matched: true });
    lastIndex = match.index + match[0].length;
    if (match[0].length === 0) pattern.lastIndex++;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), matched: false });
  }
  return segments;
}
