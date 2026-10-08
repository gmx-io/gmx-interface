import cx from "classnames";
import { Suspense, UIEvent, useCallback, useMemo, useRef, useState } from "react";
import { Redirect, useHistory, useLocation, useParams } from "react-router-dom";

import { getPageTitle } from "lib/legacy";

import ErrorBoundary from "components/Errors/ErrorBoundary";
import { PoolsTabs } from "components/PoolsTabs/PoolsTabs";
import SEO from "components/Seo/SEO";

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
};

const TAB_ORDER: DesignSystemTab[] = ["examples", "props", "guidelines", "changelog"];

/**
 * Dev-only design system site: /ui/<slug>?tab=<tab>. Pages are listed in designSystemRegistry.
 */
export default function DesignSystemPage() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const history = useHistory();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const page = DESIGN_SYSTEM_PAGES.find((item) => item.slug === slug);

  const tabs = useMemo(
    () => TAB_ORDER.filter((tab) => page?.tabs[tab]).map((tab) => ({ label: TAB_LABELS[tab], value: tab })),
    [page]
  );
  const requestedTab = new URLSearchParams(location.search).get("tab") as DesignSystemTab | null;
  const activeTab: DesignSystemTab = requestedTab && page?.tabs[requestedTab] ? requestedTab : "examples";

  const setActiveTab = useCallback(
    (tab: DesignSystemTab) => history.replace({ search: tab === "examples" ? "" : `?tab=${tab}` }),
    [history]
  );

  // The top bar gets smaller once the page scrolls
  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => setIsScrolled(event.currentTarget.scrollTop > 8),
    []
  );

  if (!page) {
    return <Redirect to={`/ui/${DESIGN_SYSTEM_PAGES[0].slug}`} />;
  }

  const TabContent = page.tabs[activeTab] ?? page.tabs.examples;

  return (
    <SEO title={getPageTitle(`${page.title} · Design system`)}>
      <div className="flex h-full w-full flex-col">
        {/* Top bar: the GMX logo on the left, Dark | Light on the right */}
        <header
          className={cx(
            "flex shrink-0 items-center justify-between gap-16 border-b border-slate-600 px-24 transition-[padding] duration-200 ease-out max-md:px-16",
            isScrolled ? "py-12 max-md:py-8" : "py-24 max-md:py-16"
          )}
        >
          <div className="flex items-center gap-5 text-typography-primary">
            <img src={logoIcon} alt="GMX logo" />
            <LogoText />
          </div>
          <DesignSystemThemeSwitcher />
        </header>

        <div className="flex min-h-0 grow">
          <div className="hidden px-8 py-16 lg:block">
            <DesignSystemNav activeSlug={page.slug} />
          </div>

          <div className="grow overflow-y-auto px-8 py-16 scrollbar-gutter-stable max-lg:px-16" onScroll={handleScroll}>
            <ErrorBoundary id="Page" variant="page">
              <div className="mx-auto flex w-full max-w-[1512px] items-start gap-24 pb-64">
                <div className="flex min-w-0 flex-1 flex-col gap-16">
                  <DesignSystemMobileNav activeSlug={page.slug} />
                  <h1 className="text-h1 font-medium">{page.title}</h1>
                  {/* Pages with only the Examples tab skip the tab row and its gap */}
                  {tabs.length > 1 && (
                    <PoolsTabs<DesignSystemTab>
                      tabs={tabs}
                      selected={activeTab}
                      setSelected={setActiveTab}
                      itemClassName="!text-body-large"
                    />
                  )}
                  <div ref={contentRef}>
                    <Suspense fallback={null}>
                      <TabContent />
                    </Suspense>
                  </div>
                </div>

                <aside className="sticky top-0 w-[220px] shrink-0 max-xl:hidden">
                  <DesignSystemSectionNav contentRef={contentRef} contentKey={`${page.slug}:${activeTab}`} />
                </aside>
              </div>
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </SEO>
  );
}
