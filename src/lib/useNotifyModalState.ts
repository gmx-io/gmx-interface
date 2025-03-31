import { useCallback } from "react";

import { useGlobalContext } from "context/GlobalContext/GlobalContextProvider";

export function useNotifyModalState() {
  const { setNotifyModalOpen, notifyModalOpen } = useGlobalContext();
  const openNotifyModal = useCallback(() => setNotifyModalOpen(true), [setNotifyModalOpen]);
  const closeNotifyModal = useCallback(() => setNotifyModalOpen(false), [setNotifyModalOpen]);

  return { notifyModalOpen, openNotifyModal, closeNotifyModal, setNotifyModalOpen };
}
