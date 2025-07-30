import { AppHeader } from "components/AppHeader/AppHeader";
import Footer from "components/Footer/Footer";
import SideNav from "components/SideNav/SideNav";

export default function AppPageLayout({ children, header }: { children: React.ReactNode; header?: React.ReactNode }) {
  return (
    <div className="flex h-full w-full gap-8 p-8 pr-0 max-lg:pb-40 lg:pb-0">
      <div className="hidden lg:block">
        <SideNav />
      </div>
      <div className="flex h-full grow flex-col overflow-y-auto pr-8">
        <div className="flex flex-col gap-8 grow">
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
