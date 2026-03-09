import { useEffect, useState } from "react";

export function useIsTruncated(): [React.RefCallback<HTMLElement>, boolean] {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    if (!el) return;

    const check = () => setIsTruncated(el.scrollWidth > el.clientWidth);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);

  return [setEl, isTruncated];
}
