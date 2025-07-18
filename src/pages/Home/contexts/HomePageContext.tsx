import noop from "lodash/noop";
import { createContext, useContext, useMemo, useState } from "react";

import { LeaveHomepageRedirectModal } from "../sections/RedirectModal/LeaveHompageRedirectModal";

type HomePageContextType = {
  showRedirectModal: (to: string) => void;
  redirectModalTo: string | null;
};

export const HomePageContext = createContext<HomePageContextType>({
  showRedirectModal: noop,
  redirectModalTo: null,
});

export function HomePageContextProvider({ children }: { children: React.ReactNode }) {
  const [redirectModalTo, setRedirectModalTo] = useState<string | null>(null);

  const value = useMemo(
    () => ({ showRedirectModal: setRedirectModalTo, redirectModalTo }),
    [setRedirectModalTo, redirectModalTo]
  );

  return (
    <HomePageContext.Provider value={value}>
      {children}
      {redirectModalTo && <LeaveHomepageRedirectModal to={redirectModalTo} onClose={() => setRedirectModalTo(null)} />}
    </HomePageContext.Provider>
  );
}

export function useHomePageContext() {
  return useContext(HomePageContext);
}
