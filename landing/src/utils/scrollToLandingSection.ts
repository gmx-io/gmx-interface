export function scrollToLandingSection(id: string, gapBelowHeader: number) {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }
  const headerHeight = document.querySelector("[data-landing-header]")?.getBoundingClientRect().height ?? 0;
  const top = element.getBoundingClientRect().top + window.scrollY - headerHeight - gapBelowHeader;
  window.scrollTo({ top, behavior: "smooth" });
}
