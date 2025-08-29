import cx from "classnames";

import { AppHeader } from "components/AppHeader/AppHeader";
import Footer from "components/Footer/Footer";
import SideNav from "components/SideNav/SideNav";

export default function AppPageLayout({
  children,
  header,
  className,
  sideNav,
  contentClassName,
  pageWrapperClassName,
}: {
  children: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
  sideNav?: React.ReactNode;
  contentClassName?: string;
  pageWrapperClassName?: string;
}) {
  return (
    <div className={cx("flex h-full w-full", className)}>
      <div className="z-30 hidden p-8 lg:block">{sideNav ? sideNav : <SideNav />}</div>
      <div
        className={cx("flex h-full grow flex-col overflow-y-auto scrollbar-gutter-stable md:p-8", pageWrapperClassName)}
      >
        <div className="flex h-full grow flex-col items-center">
          <div className="w-full md:pb-8">{header ? header : <AppHeader />}</div>
          <div className={cx("flex w-full max-w-[1512px] grow flex-col gap-8 py-8 max-md:px-8", contentClassName)}>
            {children}
          </div>
          <div className="mt-auto hidden w-full pt-8 lg:block">
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
}
