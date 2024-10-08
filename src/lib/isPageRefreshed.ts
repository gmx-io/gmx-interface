export const isPageRefreshsed =
  typeof window !== "undefined" &&
  window.performance &&
  ((window.performance.navigation && window.performance.navigation.type === 1) ||
    window.performance
      ?.getEntriesByType("navigation")
      .map((nav) => nav.entryType)
      .includes("reload"));
