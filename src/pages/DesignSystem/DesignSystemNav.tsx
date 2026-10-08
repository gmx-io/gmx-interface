import cx from "classnames";
import { Link } from "react-router-dom";

import { DESIGN_SYSTEM_PAGES } from "./designSystemRegistry";

type Props = {
  activeSlug: string;
};

// Same look as the app's side menu items (components/SideNav)
const ITEM_CLASSNAME = `flex items-center rounded-8 px-12 py-10 text-left text-body-large font-medium
  text-typography-secondary hover:bg-blue-400/20 hover:text-blue-400
  dark:hover:bg-slate-700 dark:hover:text-typography-primary`;
const ITEM_ACTIVE_CLASSNAME = "bg-blue-400/20 !text-blue-400 dark:bg-slate-700 dark:!text-typography-primary";

export function DesignSystemNav({ activeSlug }: Props) {
  return (
    <nav className="flex h-full w-[200px] shrink-0 flex-col gap-4 overflow-y-auto bg-slate-950 pb-4">
      {DESIGN_SYSTEM_PAGES.map((page) => (
        <Link
          key={page.slug}
          to={`/ui/${page.slug}`}
          className={cx(ITEM_CLASSNAME, { [ITEM_ACTIVE_CLASSNAME]: page.slug === activeSlug })}
        >
          {page.title}
        </Link>
      ))}
    </nav>
  );
}

/**
 * On screens narrower than the side menu breakpoint, the pages are shown as a row of links.
 */
export function DesignSystemMobileNav({ activeSlug }: Props) {
  return (
    <div className="flex gap-8 overflow-x-auto pb-4 lg:hidden">
      {DESIGN_SYSTEM_PAGES.map((page) => (
        <Link
          key={page.slug}
          to={`/ui/${page.slug}`}
          className={cx("text-body-medium shrink-0 rounded-8 px-12 py-6", {
            "bg-slate-700 text-typography-primary": page.slug === activeSlug,
            "bg-slate-900 text-typography-secondary": page.slug !== activeSlug,
          })}
        >
          {page.title}
        </Link>
      ))}
    </div>
  );
}
