const HIDDEN_LONG_MS = 10_000;

type PageHiddenHandlers = {
  onHide?: () => void;
  onHiddenLong: () => void;
  onShow: () => void;
};

export function watchPageHidden({ onHide, onHiddenLong, onShow }: PageHiddenHandlers): () => void {
  let hiddenLongTimer: ReturnType<typeof setTimeout> | undefined;

  const cancelHiddenLong = () => {
    clearTimeout(hiddenLongTimer);
    hiddenLongTimer = undefined;
  };

  const onVisibilityChange = () => {
    if (!document.hidden) {
      cancelHiddenLong();
      onShow();
      return;
    }
    onHide?.();
    if (!hiddenLongTimer) {
      hiddenLongTimer = setTimeout(() => {
        hiddenLongTimer = undefined;
        onHiddenLong();
      }, HIDDEN_LONG_MS);
    }
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  return () => {
    cancelHiddenLong();
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
