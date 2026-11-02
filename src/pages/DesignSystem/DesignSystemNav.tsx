import cx from "classnames";
import { Link } from "react-router-dom";

import { DESIGN_SYSTEM_PAGES } from "./designSystemRegistry";
import { DOCS_FOCUS_CLASSNAME } from "./DocsLayout";

type Props = {
  activeSlug: string;
};

// The colours of the app's side menu items (components/SideNav), in compact rows
const ITEM_CLASSNAME = `flex h-32 shrink-0 items-center rounded-8 px-8 text-left text-body-medium font-medium
  text-typography-secondary transition-colors duration-150 hover:bg-blue-400/20 hover:text-blue-400
  dark:hover:bg-slate-700 dark:hover:text-typography-primary`;
const ITEM_ACTIVE_CLASSNAME = "bg-blue-400/20 !text-blue-400 dark:bg-slate-700 dark:!text-typography-primary";

export function DesignSystemNav({ activeSlug }: Props) {
  return (
    <nav aria-label="Pages" className="flex min-h-0 grow flex-col gap-2 overflow-y-auto px-12 py-16">
      {DESIGN_SYSTEM_PAGES.map((page) => (
        <Link
          key={page.slug}
          to={`/ui/${page.slug}`}
          aria-current={page.slug === activeSlug ? "page" : undefined}
          className={cx(ITEM_CLASSNAME, DOCS_FOCUS_CLASSNAME, { [ITEM_ACTIVE_CLASSNAME]: page.slug === activeSlug })}
        >
          {page.title}
        </Link>
      ))}
    </nav>
  );
}

/**
 * On screens narrower than the side menu breakpoint, the pages are shown as a row of links that scrolls sideways.
 */
export function DesignSystemMobileNav({ activeSlug }: Props) {
  return (
    <nav aria-label="Pages" className="-mx-16 flex gap-4 overflow-x-auto px-16 py-2 scrollbar-hide lg:hidden">
      {DESIGN_SYSTEM_PAGES.map((page) => (
        <Link
          key={page.slug}
          to={`/ui/${page.slug}`}
          aria-current={page.slug === activeSlug ? "page" : undefined}
          className={cx(
            "text-body-medium flex h-32 shrink-0 items-center rounded-8 px-12 font-medium transition-colors duration-150",
            DOCS_FOCUS_CLASSNAME,
            {
              "bg-slate-700 text-typography-primary": page.slug === activeSlug,
              "text-typography-secondary hover:text-typography-primary": page.slug !== activeSlug,
            }
          )}
        >
          {page.title}
        </Link>
      ))}
    </nav>
  );
}
