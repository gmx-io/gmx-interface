import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHistory } from "react-router-dom";

import { getChainName } from "config/chains";
import { AnnouncementType, EventData, appEventsData } from "config/events";
import { getChainIcon } from "config/icons";
import { useUiFlagsRequest } from "domain/synthetics/uiFlags/useUiFlagsRequest";
import { useOutsideClick } from "lib/useOutsideClick";
import useSearchParams from "lib/useSearchParams";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { DateSelect } from "components/DateRangeSelect/DateRangeSelect";
import SearchInput from "components/SearchInput/SearchInput";

import ChainIcon from "img/ic_chain.svg?react";
import ChevronDownIcon from "img/ic_chevron_down.svg?react";

import { AnnouncementCard } from "./AnnouncementCard";
import {
  ANNOUNCEMENTS_CHAINS,
  ANNOUNCEMENTS_PAGE_SIZE,
  AnnouncementTab,
  getEventSortDate,
  hasEventStarted,
  isEventActiveByFlag,
  matchesAllTokens,
  reactNodeToText,
  tokenizeSearchQuery,
} from "./announcementsHelpers";

export default function AnnouncementsPage() {
  const { id: deepLinkId } = useSearchParams<{ id?: string }>();
  const history = useHistory();
  const { uiFlags } = useUiFlagsRequest();

  const [tab, setTab] = useState<AnnouncementTab>("all");
  const [search, setSearch] = useState("");
  const [selectedChainId, setSelectedChainId] = useState<number | null>(null);
  const [timeFrom, setTimeFrom] = useState<Date | undefined>(undefined);
  const [visibleCount, setVisibleCount] = useState(ANNOUNCEMENTS_PAGE_SIZE);

  const clearDeepLink = useCallback(() => {
    history.replace({ pathname: "/announcements", search: "" });
  }, [history]);

  const exitDeepLink = useCallback(() => {
    if (deepLinkId) clearDeepLink();
  }, [deepLinkId, clearDeepLink]);

  const handleSetTab = useCallback(
    (value: AnnouncementTab) => {
      const isAllAlreadyActive = !deepLinkId && tab === "all";
      if (value === "all" && isAllAlreadyActive) {
        setSearch("");
        setSelectedChainId(null);
        setTimeFrom(undefined);
      }
      setTab(value);
      exitDeepLink();
    },
    [deepLinkId, tab, exitDeepLink]
  );
  const handleSetSearch = useCallback(
    (value: string) => {
      setSearch(value);
      exitDeepLink();
    },
    [exitDeepLink]
  );
  const handleSetChain = useCallback(
    (value: number | null) => {
      setSelectedChainId(value);
      exitDeepLink();
    },
    [exitDeepLink]
  );
  const handleSetTimeFrom = useCallback(
    (value: Date | undefined) => {
      setTimeFrom(value);
      exitDeepLink();
    },
    [exitDeepLink]
  );

  const searchTokens = useMemo(() => tokenizeSearchQuery(search), [search]);

  const allEligible = useMemo<EventData[]>(() => {
    const now = new Date();
    return appEventsData
      .filter((event) => !event.requiresOpenPosition)
      .filter((event) => isEventActiveByFlag(event, uiFlags))
      .filter((event) => hasEventStarted(event, now))
      .sort((a, b) => {
        const aTime = getEventSortDate(a).getTime();
        const bTime = getEventSortDate(b).getTime();
        if (aTime !== bTime) return bTime - aTime;
        return a.id.localeCompare(b.id);
      });
  }, [uiFlags]);

  const filteredExceptTab = useMemo<EventData[]>(() => {
    const fromTime = timeFrom?.getTime();
    return allEligible.filter((event) => {
      if (selectedChainId !== null && (!event.chains || !event.chains.includes(selectedChainId))) return false;
      if (fromTime !== undefined && getEventSortDate(event).getTime() < fromTime) return false;
      if (searchTokens.length > 0) {
        const haystack = `${reactNodeToText(event.title)} ${reactNodeToText(event.description)}`;
        if (!matchesAllTokens(haystack, searchTokens)) return false;
      }
      return true;
    });
  }, [allEligible, selectedChainId, timeFrom, searchTokens]);

  const typeCounts = useMemo<Record<AnnouncementType | "all", number>>(() => {
    const counts: Record<AnnouncementType | "all", number> = {
      all: filteredExceptTab.length,
      listing: 0,
      delisting: 0,
      update: 0,
      maintenance: 0,
    };
    for (const event of filteredExceptTab) counts[event.type]++;
    return counts;
  }, [filteredExceptTab]);

  const filtered = useMemo<EventData[]>(
    () => (tab === "all" ? filteredExceptTab : filteredExceptTab.filter((event) => event.type === tab)),
    [filteredExceptTab, tab]
  );

  useEffect(() => {
    if (tab !== "all" && typeCounts[tab] === 0) setTab("all");
  }, [tab, typeCounts]);

  const deepLinkTarget = useMemo(
    () => (deepLinkId ? allEligible.find((event) => event.id === deepLinkId) : undefined),
    [deepLinkId, allEligible]
  );

  const list = useMemo<EventData[]>(() => {
    if (deepLinkId) return deepLinkTarget ? [deepLinkTarget] : [];
    return filtered.slice(0, visibleCount);
  }, [deepLinkId, deepLinkTarget, filtered, visibleCount]);

  const hasMore = !deepLinkId && list.length < filtered.length;

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((prev) => prev + ANNOUNCEMENTS_PAGE_SIZE);
        }
      },
      { rootMargin: "200px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore]);

  const tabOptions = useMemo(
    () =>
      [
        { value: "all" as const, label: t`All Announcements` },
        { value: "listing" as const, label: t`Listings` },
        { value: "delisting" as const, label: t`Delistings` },
        { value: "update" as const, label: t`Updates` },
        { value: "maintenance" as const, label: t`Maintenances` },
      ] satisfies { value: AnnouncementTab; label: string }[],
    []
  );

  const visibleTabs = useMemo(
    () => tabOptions.filter((opt) => opt.value === "all" || typeCounts[opt.value] > 0),
    [tabOptions, typeCounts]
  );

  return (
    <AppPageLayout title={t`Announcements`}>
      <div className="default-container page-layout">
        <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-20">
          <div>
            <h1 className="text-h1 font-medium text-typography-primary">
              <Trans>Announcements</Trans>
            </h1>
            <p className="text-body-medium mt-8 max-w-[440px] text-typography-secondary">
              <Trans>Stay up to date with the latest listings, updates and maintenance notices.</Trans>
            </p>
          </div>

          <div className="flex flex-col gap-12">
            <FiltersBar
              search={search}
              setSearch={handleSetSearch}
              activeTab={deepLinkId ? null : tab}
              setTab={handleSetTab}
              tabOptions={visibleTabs}
              selectedChainId={selectedChainId}
              setSelectedChainId={handleSetChain}
              timeFrom={timeFrom}
              setTimeFrom={handleSetTimeFrom}
            />

            <div className="flex min-h-[70vh] flex-col gap-8">
              {list.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-8 bg-fill-card p-32 text-center text-typography-secondary">
                  <Trans>No announcements found</Trans>
                </div>
              ) : (
                list.map((event) => <AnnouncementCard key={event.id} event={event} searchTokens={searchTokens} />)
              )}
              {hasMore && <div ref={sentinelRef} className="h-1" />}
            </div>
          </div>
        </div>
      </div>
    </AppPageLayout>
  );
}

type FiltersBarProps = {
  search: string;
  setSearch: (v: string) => void;
  activeTab: AnnouncementTab | null;
  setTab: (v: AnnouncementTab) => void;
  tabOptions: { value: AnnouncementTab; label: string }[];
  selectedChainId: number | null;
  setSelectedChainId: (v: number | null) => void;
  timeFrom: Date | undefined;
  setTimeFrom: (v: Date | undefined) => void;
};

function FiltersBar({
  search,
  setSearch,
  activeTab,
  setTab,
  tabOptions,
  selectedChainId,
  setSelectedChainId,
  timeFrom,
  setTimeFrom,
}: FiltersBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-12">
      <div className="flex min-w-0 flex-auto flex-wrap items-center gap-12">
        <SearchInput value={search} setValue={setSearch} placeholder={t`Search`} className="!w-260 shrink-0 !grow-0" />

        <div className="w-px shrink-0 self-stretch bg-stroke-primary max-lg:hidden" />

        <div className="flex min-w-0 flex-auto flex-wrap items-center gap-4">
          {tabOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTab(opt.value)}
              className={cx(
                "inline-flex h-32 shrink-0 items-center whitespace-nowrap rounded-8 px-12 text-13 font-medium transition-colors",
                activeTab === opt.value
                  ? "bg-slate-800 text-typography-primary"
                  : "text-typography-secondary hover:text-typography-primary"
              )}
              data-qa={`announcements-tab-${opt.value}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <ChainDropdown selected={selectedChainId} onChange={setSelectedChainId} />
        <DateSelect date={timeFrom} onChange={setTimeFrom} buttonTextPrefix={t`From`} />
      </div>
    </div>
  );
}

function ChainDropdown({ selected, onChange }: { selected: number | null; onChange: (v: number | null) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, () => setIsOpen(false));

  return (
    <div ref={ref} className="relative">
      <DropdownButton isOpen={isOpen} onClick={() => setIsOpen((v) => !v)}>
        {selected !== null ? (
          <img src={getChainIcon(selected)} alt="" className="size-16" />
        ) : (
          <ChainIcon className="size-16 text-typography-secondary" />
        )}
        {selected === null ? <Trans>All chains</Trans> : getChainName(selected)}
      </DropdownButton>
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-4 min-w-[200px] rounded-8 border border-stroke-primary bg-slate-800 p-4 shadow-lg lg:left-auto lg:right-0">
          <DropdownItem
            isActive={selected === null}
            onClick={() => {
              onChange(null);
              setIsOpen(false);
            }}
          >
            <Trans>All chains</Trans>
          </DropdownItem>
          {ANNOUNCEMENTS_CHAINS.map((chainId) => (
            <DropdownItem
              key={chainId}
              isActive={selected === chainId}
              onClick={() => {
                onChange(chainId);
                setIsOpen(false);
              }}
            >
              <img src={getChainIcon(chainId)} alt="" className="size-16" />
              {getChainName(chainId)}
            </DropdownItem>
          ))}
        </div>
      )}
    </div>
  );
}

function DropdownButton({
  isOpen,
  onClick,
  children,
}: {
  isOpen: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex h-32 items-center gap-4 rounded-8 px-12 text-13 font-medium transition-colors",
        isOpen ? "text-typography-primary" : "text-typography-secondary hover:text-typography-primary"
      )}
    >
      {children}
      <ChevronDownIcon className={cx("size-16 transition-transform", isOpen && "rotate-180")} />
    </button>
  );
}

function DropdownItem({
  isActive,
  onClick,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "text-body-medium flex w-full items-center gap-8 rounded-4 px-8 py-6 text-left text-typography-primary hover:bg-slate-700",
        isActive && "bg-slate-700"
      )}
    >
      {children}
    </button>
  );
}
