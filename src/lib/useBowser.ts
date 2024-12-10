import Bowser from "bowser";
import { usePolling } from "./usePolling";

export function useBowser() {
  return usePolling(
    async () => {
      const bowser = Bowser.parse(window.navigator.userAgent);

      if (!bowser.browser.name || !bowser.browser.version || !bowser.platform.type) {
        return undefined;
      }

      return bowser;
    },
    {
      interval: 500,
      retries: 5,
      deps: [],
    }
  );
}
