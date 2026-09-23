import { getLandingScrollContainer } from "./getLandingScrollContainer";

export function scrollToLandingSection(id: string, gapBelowHeader: number) {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }
  const scrollContainer = getLandingScrollContainer();
  const scrollTop = scrollContainer instanceof HTMLElement ? scrollContainer.scrollTop : window.scrollY;
  const containerTop = scrollContainer instanceof HTMLElement ? scrollContainer.getBoundingClientRect().top : 0;
  const headerHeight = document.querySelector("[data-landing-header]")?.getBoundingClientRect().height ?? 0;
  const top = element.getBoundingClientRect().top + scrollTop - containerTop - headerHeight - gapBelowHeader;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  scrollContainer.scrollTo({ top, behavior: reducedMotion ? "instant" : "smooth" });
}
