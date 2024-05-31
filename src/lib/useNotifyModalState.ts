import { useGlobalContext } from "context/GlobalContext/GlobalContextProvider";
import { useCallback } from "react";

export function useNotifyModalState() {
  const { setNotifyModalOpen, notifyModalOpen } = useGlobalContext();
  const openNotifyModal = useCallback(() => setNotifyModalOpen(true), [setNotifyModalOpen]);
  const closeNotifyModal = useCallback(() => setNotifyModalOpen(false), [setNotifyModalOpen]);

  return { notifyModalOpen, openNotifyModal, closeNotifyModal, setNotifyModalOpen };
}
