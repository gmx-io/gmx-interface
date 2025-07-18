import noop from "lodash/noop";
import { createContext, Dispatch, SetStateAction, useContext, useMemo, useState } from "react";
import { useLocalStorage } from "react-use";

import { REDIRECT_POPUP_TIMESTAMP_KEY } from "config/localStorage";

import { LeaveHomepageRedirectModal } from "../sections/RedirectModal/LeaveHompageRedirectModal";

type HomePageContextType = {
  showRedirectModal: (to: string) => void;
  redirectModalTo: string | null;
  redirectPopupTimestamp: number | undefined;
  setRedirectPopupTimestamp: Dispatch<SetStateAction<number | undefined>>;
};

export const HomePageContext = createContext<HomePageContextType>({
  showRedirectModal: noop,
  redirectModalTo: null,
  redirectPopupTimestamp: undefined,
  setRedirectPopupTimestamp: noop,
});

export function HomePageContextProvider({ children }: { children: React.ReactNode }) {
  const [redirectModalTo, setRedirectModalTo] = useState<string | null>(null);
  // TODO: After App redesign remove the same from GlobalContext, needed only here
  const [redirectPopupTimestamp, setRedirectPopupTimestamp] = useLocalStorage<number | undefined>(
    REDIRECT_POPUP_TIMESTAMP_KEY,
    undefined,
    {
      raw: false,
      deserializer: (val) => {
        if (!val) {
          return undefined;
        }
        const num = parseInt(val);

        if (Number.isNaN(num)) {
          return undefined;
        }

        return num;
      },
      serializer: (val) => (val ? val.toString() : ""),
    }
  );
  const value = useMemo(
    () => ({
      showRedirectModal: setRedirectModalTo,
      redirectModalTo,
      redirectPopupTimestamp,
      setRedirectPopupTimestamp,
    }),
    [setRedirectModalTo, redirectModalTo, redirectPopupTimestamp, setRedirectPopupTimestamp]
  );

  return (
    <HomePageContext.Provider value={value}>
      {children}
      {redirectModalTo && (
        <LeaveHomepageRedirectModal
          to={redirectModalTo}
          onClose={() => setRedirectModalTo(null)}
          setRedirectPopupTimestamp={setRedirectPopupTimestamp}
        />
      )}
    </HomePageContext.Provider>
  );
}

export function useHomePageContext() {
  return useContext(HomePageContext);
}
