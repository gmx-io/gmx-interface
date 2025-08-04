import noop from "lodash/noop";
import { createContext, Dispatch, SetStateAction, useCallback, useContext, useMemo, useState } from "react";
import { useLocalStorage } from "react-use";

import { REDIRECT_POPUP_TIMESTAMP_KEY } from "config/localStorage";

import { LeaveHomepageRedirectModal } from "../LeaveHomepageRedirectModal/LeaveHompageRedirectModal";

type HomePageContextType = {
  redirectWithWarning: (to: string) => void;
  redirectModalTo: string | null;
  redirectPopupTimestamp: number | undefined;
  setRedirectPopupTimestamp: Dispatch<SetStateAction<number | undefined>>;
  shouldShowRedirectModal: () => boolean;
};

export const HomePageContext = createContext<HomePageContextType>({
  redirectWithWarning: noop,
  redirectModalTo: null,
  redirectPopupTimestamp: undefined,
  setRedirectPopupTimestamp: noop,
  shouldShowRedirectModal: () => false,
});
const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30;

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

  const shouldShowRedirectModal = useCallback(() => {
    if (!redirectPopupTimestamp) {
      return true;
    }

    const expiryTime = redirectPopupTimestamp + THIRTY_DAYS;
    const now = Date.now();
    if (redirectPopupTimestamp < 0 || redirectPopupTimestamp > now) {
      return true;
    }
    return now > expiryTime;
  }, [redirectPopupTimestamp]);
  const redirectWithWarning = useCallback(
    (to: string) => {
      if (shouldShowRedirectModal()) {
        setRedirectModalTo(to);
      } else {
        window.location.href = to;
      }
    },
    [shouldShowRedirectModal, setRedirectModalTo]
  );
  const value = useMemo(
    () => ({
      redirectWithWarning,
      redirectModalTo,
      redirectPopupTimestamp,
      setRedirectPopupTimestamp,
      shouldShowRedirectModal,
    }),
    [redirectWithWarning, redirectModalTo, redirectPopupTimestamp, setRedirectPopupTimestamp, shouldShowRedirectModal]
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
