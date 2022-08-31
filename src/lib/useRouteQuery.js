import React from "react";
import { useLocation } from "react-router-dom";

export default function useRouteQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}
