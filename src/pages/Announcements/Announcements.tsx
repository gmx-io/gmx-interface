import { autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react";
import { Popover, Portal } from "@headlessui/react";
import { MessageDescriptor } from "@lingui/core";
import { msg, t, Trans } from "@lingui/macro";
import cx from "classnames";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useHistory } from "react-router-dom";

import { getChainName } from "config/chains";
import { AnnouncementType, EventData, appEventsData } from "config/events";
import { getChainIcon } from "config/icons";
import { useDateRange, useNormalizeDateRange } from "lib/dates";
import { useLocalizedMap } from "lib/i18n";
import useSearchParams from "lib/useSearchParams";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import { DateRangeSelect } from "components/DateRangeSelect/DateRangeSelect";
import SearchInput from "components/SearchInput/SearchInput";
import { ButtonRowScrollFadeContainer } from "components/TableScrollFade/TableScrollFade";

import CalendarIcon from "img/ic_calendar.svg?react";
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
import { useAnnouncementsUiFlags } from "./useAnnouncementsUiFlags";

const TAB_LABELS: Record<AnnouncementTab, MessageDescriptor> = {
  all: msg`All Announcements`,
  listing: msg`Listings`,
  delisting: msg`Delistings`,
  update: msg`Updates`,
  maintenance: msg`Maintenances`,
};

export default function AnnouncementsPage() {
  const { id: deepLinkId } = useSearchParams<{ id?: string }>();
  const history = useHistory();
  const { uiFlags } = useAnnouncementsUiFlags();

  const [tab, setTab] = useState<AnnouncementTab>("all");
  const [search, setSearch] = useState("");
  const [selectedChainId, setSelectedChainId] = useState<number | null>(null);
  const [startDate, endDate, setDateRange] = useDateRange();
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
        setDateRange([undefined, undefined]);
      }
      setTab(value);
      setVisibleCount(ANNOUNCEMENTS_PAGE_SIZE);
      exitDeepLink();
    },
    [deepLinkId, tab, setDateRange, exitDeepLink]
  );
  const handleSetSearch = useCallback(
    (value: string) => {
      setSearch(value);
      setVisibleCount(ANNOUNCEMENTS_PAGE_SIZE);
      exitDeepLink();
    },
    [exitDeepLink]
  );
  const handleSetChain = useCallback(
    (value: number | null) => {
      setSelectedChainId(value);
      setVisibleCount(ANNOUNCEMENTS_PAGE_SIZE);
      exitDeepLink();
    },
    [exitDeepLink]
  );
  const handleSetDateRange = useCallback(
    (value: [Date | undefined, Date | undefined]) => {
      setDateRange(value);
      setVisibleCount(ANNOUNCEMENTS_PAGE_SIZE);
      exitDeepLink();
    },
    [setDateRange, exitDeepLink]
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

  const [fromTimestamp, toTimestamp] = useNormalizeDateRange(startDate, endDate);

  const filteredExceptTab = useMemo<EventData[]>(() => {
    return allEligible.filter((event) => {
      if (selectedChainId !== null && (!event.chains || !event.chains.includes(selectedChainId))) return false;
      const eventTime = getEventSortDate(event).getTime();
      if (fromTimestamp !== undefined && eventTime < fromTimestamp * 1000) return false;
      if (toTimestamp !== undefined && eventTime > toTimestamp * 1000) return false;
      if (searchTokens.length > 0) {
        const haystack = `${reactNodeToText(event.title)} ${reactNodeToText(event.summary)} ${reactNodeToText(
          event.description
        )}`;
        if (!matchesAllTokens(haystack, searchTokens)) return false;
      }
      return true;
    });
  }, [allEligible, selectedChainId, fromTimestamp, toTimestamp, searchTokens]);

  const typeCounts = useMemo<Record<AnnouncementType | "all", number>>(() => {
    const counts: Record<AnnouncementType | "all", number> = {
      all: allEligible.length,
      listing: 0,
      delisting: 0,
      update: 0,
      maintenance: 0,
    };
    for (const event of allEligible) counts[event.type]++;
    return counts;
  }, [allEligible]);

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

  const tabLabels = useLocalizedMap(TAB_LABELS);

  const tabOptions = useMemo(
    () => (Object.keys(TAB_LABELS) as AnnouncementTab[]).map((value) => ({ value, label: tabLabels[value] })),
    [tabLabels]
  );

  const visibleTabs = useMemo(
    () => tabOptions.filter((opt) => opt.value === "all" || typeCounts[opt.value] > 0),
    [tabOptions, typeCounts]
  );

  return (
    <AppPageLayout title={t`Announcements`}>
      <div className="default-container page-layout flex flex-col gap-20 max-lg:gap-16">
        <div>
          <h1 className="text-h1 font-medium text-typography-primary">
            <Trans>Announcements</Trans>
          </h1>
          <p className="text-body-medium mt-8 max-w-[440px] text-typography-secondary max-lg:text-12 max-lg:font-medium max-lg:leading-[1.25] max-lg:tracking-[-0.012em]">
            <Trans>Stay up to date with the latest listings, updates and maintenance notices.</Trans>
          </p>
        </div>

        <div className="flex flex-col gap-12 max-lg:gap-8">
          <FiltersBar
            search={search}
            setSearch={handleSetSearch}
            activeTab={deepLinkId ? null : tab}
            setTab={handleSetTab}
            tabOptions={visibleTabs}
            selectedChainId={selectedChainId}
            setSelectedChainId={handleSetChain}
            startDate={startDate}
            endDate={endDate}
            onDateRangeChange={handleSetDateRange}
          />

          <div className="flex min-h-[70vh] flex-col gap-8">
            {list.length === 0 ? (
              <div className="flex flex-1 items-center justify-center p-32 text-center text-typography-secondary">
                <Trans>No announcements found</Trans>
              </div>
            ) : (
              list.map((event) => <AnnouncementCard key={event.id} event={event} searchTokens={searchTokens} />)
            )}
            {hasMore && <div ref={sentinelRef} className="h-1" />}
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
  startDate: Date | undefined;
  endDate: Date | undefined;
  onDateRangeChange: (v: [Date | undefined, Date | undefined]) => void;
};

const FILTERS_BAR_GAP = 12;

function useCompactFiltersBar(labels: {
  selectedChainId: number | null;
  startDate: Date | undefined;
  endDate: Date | undefined;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tabsContentRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const fullControlsWidthRef = useRef(0);
  const [isCompact, setIsCompact] = useState(false);
  const isCompactRef = useRef(isCompact);
  isCompactRef.current = isCompact;

  const measure = useCallback(() => {
    const container = containerRef.current;
    const tabsContent = tabsContentRef.current;
    const controls = controlsRef.current;
    if (!container || !tabsContent || !controls) return;

    if (!isCompactRef.current) {
      fullControlsWidthRef.current = controls.offsetWidth;
    }

    const requiredFullWidth = tabsContent.scrollWidth + FILTERS_BAR_GAP + fullControlsWidthRef.current;
    setIsCompact(container.clientWidth < requiredFullWidth);
  }, []);

  useLayoutEffect(() => {
    if (isCompactRef.current) {
      setIsCompact(false);
    } else {
      measure();
    }
  }, [labels.selectedChainId, labels.startDate, labels.endDate, measure]);

  useLayoutEffect(() => {
    measure();
  }, [isCompact, measure]);

  useEffect(() => {
    const observer = new ResizeObserver(measure);
    if (containerRef.current) observer.observe(containerRef.current);
    if (tabsContentRef.current) observer.observe(tabsContentRef.current);
    return () => observer.disconnect();
  }, [measure]);

  return { isCompact, containerRef, tabsContentRef, controlsRef };
}

function FiltersBar({
  search,
  setSearch,
  activeTab,
  setTab,
  tabOptions,
  selectedChainId,
  setSelectedChainId,
  startDate,
  endDate,
  onDateRangeChange,
}: FiltersBarProps) {
  const { isCompact, containerRef, tabsContentRef, controlsRef } = useCompactFiltersBar({
    selectedChainId,
    startDate,
    endDate,
  });

  return (
    <div ref={containerRef} className="flex flex-wrap items-center gap-12 max-lg:gap-8 lg:flex-nowrap">
      <ButtonRowScrollFadeContainer className="min-w-0 grow max-lg:basis-full" gradientColor="slate-950">
        <div ref={tabsContentRef} className="flex w-max items-center gap-4">
          {tabOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={(event) => {
                setTab(opt.value);
                event.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
              }}
              className={cx(
                "inline-flex h-32 shrink-0 scroll-mx-32 items-center whitespace-nowrap rounded-8 px-12 text-13 font-medium transition-colors",
                activeTab === opt.value
                  ? "bg-button-secondary text-typography-primary"
                  : "text-typography-secondary hover:text-typography-primary"
              )}
              data-qa={`announcements-tab-${opt.value}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </ButtonRowScrollFadeContainer>

      <div ref={controlsRef} className="flex shrink-0 items-center max-lg:w-full max-lg:gap-8 lg:gap-0">
        <div className="flex items-center gap-4 max-lg:gap-8">
          <ChainDropdown selected={selectedChainId} onChange={setSelectedChainId} isCompact={isCompact} />
          <DateRangeSelect
            startDate={startDate}
            endDate={endDate}
            onChange={onDateRangeChange}
            handleClassName="outline-none"
            renderHandle={({ buttonText, open }) => (
              <span
                className={cx(
                  "inline-flex h-32 items-center gap-4 rounded-8 px-12 text-13 font-medium transition-colors",
                  "max-lg:w-32 max-lg:justify-center max-lg:bg-button-secondary max-lg:px-0",
                  isCompact && "lg:w-32 lg:justify-center lg:px-0",
                  open ? "text-typography-primary" : "text-typography-secondary hover:text-typography-primary"
                )}
              >
                <CalendarIcon className="size-16 shrink-0" />
                <span className={cx("whitespace-nowrap max-lg:sr-only", isCompact && "lg:sr-only")}>{buttonText}</span>
                <ChevronDownIcon
                  className={cx(
                    "size-16 transition-transform max-lg:hidden",
                    isCompact && "lg:hidden",
                    open && "rotate-180"
                  )}
                />
              </span>
            )}
          />
        </div>

        <div className="mx-12 h-20 w-1 shrink-0 bg-stroke-primary max-lg:hidden" />

        <SearchInput
          value={search}
          setValue={setSearch}
          placeholder={t`Search`}
          className="shrink-0 max-lg:order-first lg:!w-[260px] lg:!grow-0 [&_input:hover]:bg-button-secondaryHover [&_input:not(:focus)]:border-button-secondary [&_input]:bg-button-secondary"
        />
      </div>
    </div>
  );
}

function ChainDropdown({
  selected,
  onChange,
  isCompact,
}: {
  selected: number | null;
  onChange: (v: number | null) => void;
  isCompact: boolean;
}) {
  const { refs, floatingStyles } = useFloating({
    middleware: [offset(4), flip(), shift({ padding: 8 })],
    placement: "bottom-end",
    whileElementsMounted: autoUpdate,
  });

  return (
    <Popover className="relative" ref={refs.setReference}>
      {({ open, close }) => (
        <>
          <Popover.Button
            className={cx(
              "inline-flex h-32 items-center gap-4 rounded-8 px-12 text-13 font-medium outline-none transition-colors",
              "max-lg:w-32 max-lg:justify-center max-lg:bg-button-secondary max-lg:px-0",
              isCompact && "lg:w-32 lg:justify-center lg:px-0",
              open ? "text-typography-primary" : "text-typography-secondary hover:text-typography-primary"
            )}
          >
            {selected !== null ? (
              <img src={getChainIcon(selected)} alt="" className="size-16 shrink-0" />
            ) : (
              <ChainIcon className="size-16 shrink-0" />
            )}
            <span className={cx("whitespace-nowrap max-lg:sr-only", isCompact && "lg:sr-only")}>
              {selected === null ? <Trans>All chains</Trans> : getChainName(selected)}
            </span>
            <ChevronDownIcon
              className={cx(
                "size-16 transition-transform max-lg:hidden",
                isCompact && "lg:hidden",
                open && "rotate-180"
              )}
            />
          </Popover.Button>
          <Portal>
            <Popover.Panel
              ref={refs.setFloating}
              style={floatingStyles}
              className="z-50 min-w-[200px] rounded-8 border border-stroke-primary bg-slate-900 p-4 shadow-lg outline-none"
            >
              <DropdownItem
                isActive={selected === null}
                onClick={() => {
                  onChange(null);
                  close();
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
                    close();
                  }}
                >
                  <img src={getChainIcon(chainId)} alt="" className="size-16" />
                  {getChainName(chainId)}
                </DropdownItem>
              ))}
            </Popover.Panel>
          </Portal>
        </>
      )}
    </Popover>
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
        "text-body-medium flex w-full items-center gap-8 rounded-4 px-8 py-6 text-left text-typography-primary hover:bg-slate-800",
        isActive && "bg-slate-800"
      )}
    >
      {children}
    </button>
  );
}
