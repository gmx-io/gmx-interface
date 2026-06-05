import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";

import { metrics } from "lib/metrics";

import type { ConnectModalControllerProps } from "./ConnectModalController";
import { ConnectModalContext } from "./useConnectModal";

type ConnectModalControllerModule = {
  ConnectModalController: ComponentType<ConnectModalControllerProps>;
};

let connectModalControllerPromise: Promise<ConnectModalControllerModule> | undefined;

function loadConnectModalController() {
  if (!connectModalControllerPromise) {
    connectModalControllerPromise = import("./ConnectModalController").catch((error) => {
      connectModalControllerPromise = undefined;
      throw error;
    });
  }

  return connectModalControllerPromise;
}

function runAfterFirstPaint(callback: () => void) {
  if (typeof window === "undefined") {
    return;
  }

  const scheduleFrame =
    window.requestAnimationFrame?.bind(window) ??
    ((frameCallback: FrameRequestCallback) => window.setTimeout(frameCallback, 0));

  scheduleFrame(() => {
    window.setTimeout(callback, 0);
  });
}

export function ConnectModalProvider({ children }: { children: ReactNode }) {
  const [connectModalController, setConnectModalController] = useState<ComponentType<ConnectModalControllerProps>>();
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connectRequestId, setConnectRequestId] = useState(0);
  const [isConnectModalLoading, setIsConnectModalLoading] = useState(false);

  const ensureConnectModalController = useCallback(async () => {
    const module = await loadConnectModalController();
    setConnectModalController(() => module.ConnectModalController);
    return module.ConnectModalController;
  }, []);

  useEffect(() => {
    let cancelled = false;

    runAfterFirstPaint(() => {
      void loadConnectModalController()
        .then((module) => {
          if (!cancelled) {
            setConnectModalController(() => module.ConnectModalController);
          }
        })
        .catch((error) => {
          metrics.pushError(error, "connectModal.preload");
        });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const openConnectModal = useCallback(() => {
    setIsConnectModalLoading(true);
    setConnectRequestId((currentRequestId) => currentRequestId + 1);

    void ensureConnectModalController().catch((error) => {
      setIsConnectModalLoading(false);
      metrics.pushError(error, "connectModal.load");
    });
  }, [ensureConnectModalController]);

  const value = useMemo(
    () => ({ openConnectModal, connectModalOpen, isConnectModalLoading }),
    [openConnectModal, connectModalOpen, isConnectModalLoading]
  );
  const LoadedConnectModalController = connectModalController;

  return (
    <ConnectModalContext.Provider value={value}>
      {children}
      {LoadedConnectModalController ? (
        <LoadedConnectModalController
          requestId={connectRequestId}
          setConnectModalOpen={setConnectModalOpen}
          setIsConnectModalLoading={setIsConnectModalLoading}
        />
      ) : null}
    </ConnectModalContext.Provider>
  );
}
