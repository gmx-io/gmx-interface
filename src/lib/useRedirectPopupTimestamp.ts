import { useGlobalContext } from "context/GlobalContext/GlobalContextProvider";

export function useRedirectPopupTimestamp() {
  const { setRedirectPopupTimestamp, redirectPopupTimestamp } = useGlobalContext();
  return [redirectPopupTimestamp, setRedirectPopupTimestamp] as const;
}
