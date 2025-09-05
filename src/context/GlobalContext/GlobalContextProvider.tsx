import { Dispatch, PropsWithChildren, SetStateAction, createContext, memo, useContext, useMemo, useState } from "react";
import { useLocalStorage } from "react-use";

import { REDIRECT_POPUP_TIMESTAMP_KEY } from "config/localStorage";

type GlobalContextType = null | {
  tradePageVersion: number;
  setTradePageVersion: (version: number) => void;

  redirectPopupTimestamp: number | undefined;
  setRedirectPopupTimestamp: Dispatch<SetStateAction<number | undefined>>;

  notifyModalOpen: boolean;
  setNotifyModalOpen: (nextState: boolean) => void;
};

const context = createContext<GlobalContextType>(null);

const { Provider } = context;

export const GlobalStateProvider = memo(({ children }: PropsWithChildren<{}>) => {
  const [tradePageVersion, setTradePageVersion] = useTradePageVersion();

  const [notifyModalOpen, setNotifyModalOpen] = useState(false);

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
      tradePageVersion,
      setTradePageVersion,
      redirectPopupTimestamp,
      setRedirectPopupTimestamp,
      notifyModalOpen,
      setNotifyModalOpen,
    }),
    [
      tradePageVersion,
      setTradePageVersion,
      redirectPopupTimestamp,
      setRedirectPopupTimestamp,
      notifyModalOpen,
      setNotifyModalOpen,
    ]
  );

  return <Provider value={value}>{children}</Provider>;
});

export const useGlobalContext = () => {
  const value = useContext(context);
  if (value === null) {
    throw new Error("useGlobalContext must be used within a GlobalContextProvider");
  }

  return value;
};

function useTradePageVersion() {
  return [2, () => null] as const;
}
