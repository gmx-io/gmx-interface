import cx from "classnames";

import { AppHeader } from "components/AppHeader/AppHeader";
import Footer from "components/Footer/Footer";
import SideNav from "components/SideNav/SideNav";

export default function AppPageLayout({
  children,
  header,
  className,
  sideNav,
}: {
  children: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
  sideNav?: React.ReactNode;
}) {
  return (
    <div className={cx("flex h-full w-full", className)}>
      <div className="z-30 hidden lg:block p-8">{sideNav ? sideNav : <SideNav />}</div>
      <div className="flex h-full grow flex-col overflow-y-auto scrollbar-gutter-stable md:p-8">
        <div className="flex grow flex-col">
          <div className="pb-8">{header ? header : <AppHeader />}</div>
          <div className="flex grow flex-col gap-8 py-8 max-md:px-8">{children}</div>
          <div className="mt-auto hidden lg:block pt-8">
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
}
