import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function useScrollToTop() {
  const { hash } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [hash]);
}
