import cx from "classnames";
import { Suspense, useCallback, useMemo, useRef } from "react";
import { Redirect, useHistory, useLocation, useParams } from "react-router-dom";

import { getPageTitle } from "lib/legacy";

import ErrorBoundary from "components/Errors/ErrorBoundary";
import SEO from "components/Seo/SEO";
import Tabs from "components/Tabs/Tabs";

import logoIcon from "img/logo-icon.svg";
import LogoText from "img/logo-text.svg?react";

import { DesignSystemMobileNav, DesignSystemNav } from "./DesignSystemNav";
import { DESIGN_SYSTEM_PAGES, DesignSystemTab } from "./designSystemRegistry";
import { DesignSystemSectionNav } from "./DesignSystemSectionNav";
import { DesignSystemThemeSwitcher } from "./DesignSystemThemeSwitcher";

const TAB_LABELS: Record<DesignSystemTab, string> = {
  examples: "Examples",
  props: "Props",
  guidelines: "Guidelines",
  changelog: "Changelog",
  experiment1: "Experiment 1",
  experiment2: "Experiment 2",
};

const TAB_ORDER: DesignSystemTab[] = ["examples", "props", "guidelines", "changelog", "experiment1", "experiment2"];

// Top bar and the top of the side menu share one height, so their lines meet
const BAR_CLASSNAME = "flex h-56 shrink-0 items-center border-b border-slate-700";

// A little more room between the tabs than in the app's underline tabs
const TAB_CLASSNAME = "mr-8";

/**
 * Dev-only design system site: /ui/<slug>?tab=<tab>. Pages are listed in designSystemRegistry.
 */
export default function DesignSystemPage() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const history = useHistory();
  const contentRef = useRef<HTMLDivElement>(null);
  const page = DESIGN_SYSTEM_PAGES.find((item) => item.slug === slug);

  const tabs = useMemo(
    () => TAB_ORDER.filter((tab) => page?.tabs[tab]).map((tab) => ({ label: TAB_LABELS[tab], value: tab })),
    [page]
  );
  const requestedTab = new URLSearchParams(location.search).get("tab") as DesignSystemTab | null;
  const defaultTab = tabs[0]?.value ?? "examples";
  const activeTab: DesignSystemTab = requestedTab && page?.tabs[requestedTab] ? requestedTab : defaultTab;

  const setActiveTab = useCallback(
    (tab: DesignSystemTab) => history.replace({ search: tab === defaultTab ? "" : `?tab=${tab}` }),
    [history, defaultTab]
  );

  if (!page) {
    return <Redirect to={`/ui/${DESIGN_SYSTEM_PAGES[0].slug}`} />;
  }

  const TabContent = page.tabs[activeTab];

  return (
    <SEO title={getPageTitle(`${page.title} · Design system`)}>
      <div className="flex h-full w-full">
        {/* Side menu, full height: the logo on top, the pages below */}
        <aside className="hidden w-[248px] shrink-0 flex-col border-r border-slate-700 lg:flex">
          <div className={cx(BAR_CLASSNAME, "px-20")}>
            <DesignSystemBrand />
          </div>
          <DesignSystemNav activeSlug={page.slug} />
        </aside>

        <div className="flex min-w-0 grow flex-col">
          {/* Top bar: the logo on small screens, Dark | Light on the right */}
          <header className={cx(BAR_CLASSNAME, "gap-16 px-24 max-md:px-16")}>
            <DesignSystemBrand className="lg:hidden" />
            <div className="ml-auto">
              <DesignSystemThemeSwitcher />
            </div>
          </header>

          <div className="min-h-0 grow overflow-y-auto scrollbar-gutter-stable">
            <ErrorBoundary id="Page" variant="page">
              <div className="mx-auto flex w-full max-w-[1200px] items-start gap-48 px-40 pb-96 pt-32 max-lg:px-16 max-lg:pt-16">
                <div className="flex min-w-0 flex-1 flex-col gap-24">
                  <DesignSystemMobileNav activeSlug={page.slug} />
                  <div className="flex flex-col gap-12">
                    <h1 className="text-h1 font-medium">{page.title}</h1>
                    {page.description && (
                      <p className="text-body-large text-typography-secondary">{page.description}</p>
                    )}
                    {/* Pages with a single tab skip the tab row */}
                    {tabs.length > 1 && (
                      <Tabs<DesignSystemTab>
                        type="underline"
                        options={tabs}
                        selectedValue={activeTab}
                        onChange={setActiveTab}
                        className="border-b-1/2 border-b-slate-600"
                        regularOptionClassname={TAB_CLASSNAME}
                      />
                    )}
                  </div>
                  <div ref={contentRef}>
                    <Suspense fallback={null}>{TabContent && <TabContent />}</Suspense>
                  </div>
                </div>

                {!page.hideSectionNav && (
                  <aside className="sticky top-32 w-[200px] shrink-0 max-xl:hidden">
                    <DesignSystemSectionNav contentRef={contentRef} contentKey={`${page.slug}:${activeTab}`} />
                  </aside>
                )}
              </div>
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </SEO>
  );
}

/**
 * The GMX logo and the site name: at the top of the side menu, or in the top bar on small screens.
 */
function DesignSystemBrand({ className }: { className?: string }) {
  return (
    <div className={cx("flex items-center gap-10 text-typography-primary", className)}>
      <div className="flex items-center gap-5">
        <img src={logoIcon} alt="GMX logo" />
        <LogoText />
      </div>
      <span className="h-16 w-1 bg-slate-600 max-md:hidden" />
      <span className="text-body-medium font-medium max-md:hidden">Design system</span>
    </div>
  );
}
