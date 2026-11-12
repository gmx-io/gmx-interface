import { t } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { Fragment, useEffect, useState } from "react";

import AppPageLayout from "components/AppPageLayout/AppPageLayout";
import PageTitle from "components/PageTitle/PageTitle";
import Tabs from "components/Tabs/Tabs";

import { StatsChartCard } from "./StatsChartCard";
import { type CardConfig, END, fmtDate, getStatsTabs, type SectionTop, TAB_IDS, type TabId } from "./statsData";
import { type StatsDataState, StatsDataStateProvider } from "./statsDataState";
import { OverviewTop, SectionHeading } from "./StatsOverview";
import {
  BuybackKpis,
  FeeFlowCard,
  GmxTokenTop,
  HoldersCard,
  HoldingsCard,
  TopUsersCard,
  TreasuryKpis,
  TvlTotal,
} from "./StatsSpecialCards";

const SECTION_TOPS: Record<SectionTop, () => JSX.Element> = {
  treasuryKpis: TreasuryKpis,
  gmxToken: GmxTokenTop,
  buybackKpis: BuybackKpis,
  tvlTotal: TvlTotal,
};

function renderCard(c: CardConfig, i: number) {
  if ("special" in c) {
    if (c.special === "top") return <TopUsersCard key="top" />;
    if (c.special === "holders") return <HoldersCard key="holders" />;
    if (c.special === "holdings") return <HoldingsCard key="holdings" />;
    return <FeeFlowCard key={"feeflow" + i} />;
  }
  return <StatsChartCard key={c.id} cfg={c} />;
}

function readHash(): TabId {
  const h = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
  return TAB_IDS.find((id) => id === h) ?? "overview";
}

/* The public Stats page: four tabs, kept in the URL hash (#overview, #revenue, ...). */
export function StatsPage() {
  const { i18n } = useLingui();
  const tabs = getStatsTabs(i18n.locale);
  const [tab, setTab] = useState<TabId>(readHash);
  const selectTab = (id: TabId) => {
    setTab(id);
    try {
      window.history.replaceState(null, "", window.location.pathname + window.location.search + "#" + id);
    } catch {
      // ignore
    }
  };
  useEffect(() => {
    const onHash = () => setTab(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // The mock data is always ready. With real data the page is "loading" until every source behind it has answered
  // (at most 5 s) and "empty" when a source returns no data; a card can also get its own provider.
  const dataState: StatsDataState = "ready";

  const current = tabs.find((x) => x.id === tab) ?? tabs[0];
  const dataDay = fmtDate(END, "D", true);

  return (
    <AppPageLayout title={t`Stats`}>
      <StatsDataStateProvider value={dataState}>
        <PageTitle
          isTop
          title={t`Stats`}
          subtitle={
            t`One protocol across EVM (Arbitrum and Avalanche) and Solana` + " · " + t`Data through ${dataDay} (UTC)`
          }
          qa="stats-page"
        />

        <div className="mt-12 flex grow flex-col gap-8">
          <Tabs
            type="inline-primary"
            options={tabs.map((x) => ({ value: x.id, label: x.label }))}
            selectedValue={tab}
            onChange={selectTab}
            className="overflow-x-auto scrollbar-hide"
            regularOptionClassname="shrink-0"
            qa="stats-tabs"
          />

          <div key={tab} className="flex flex-col gap-8">
            {current.overview ? <OverviewTop /> : null}
            {current.sections.map((sec, si) => {
              const Top = sec.top ? SECTION_TOPS[sec.top] : null;
              return (
                <Fragment key={si}>
                  {sec.label ? <SectionHeading>{sec.label}</SectionHeading> : null}
                  {Top ? <Top /> : null}
                  {sec.cards.length ? (
                    <div className="grid gap-8 lg:grid-cols-2">{sec.cards.map(renderCard)}</div>
                  ) : null}
                </Fragment>
              );
            })}
          </div>
        </div>
      </StatsDataStateProvider>
    </AppPageLayout>
  );
}
