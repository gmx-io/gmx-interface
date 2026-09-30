export function getLandingScrollContainer() {
  return document.querySelector<HTMLElement>(".telegram-browser #root") ?? window;
}
