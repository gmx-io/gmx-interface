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
    <div className={cx("flex h-full w-full gap-8 p-8 pr-0 lg:pb-0", className)}>
      <div className="hidden lg:block">{sideNav ? sideNav : <SideNav />}</div>
      <div className="flex h-full grow flex-col overflow-y-auto pr-8 scrollbar-gutter-stable">
        <div className="flex grow flex-col gap-8">
          {header ? header : <AppHeader />}
          {children}
          <div className="mt-auto hidden lg:block">
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
}
