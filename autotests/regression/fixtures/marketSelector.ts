import { type Page } from "@playwright/test";

function selectorTable(page: Page) {
  return page.getByRole("table").filter({ has: page.getByRole("columnheader", { name: "LAST PRICE", exact: true }) });
}

export function selectorRows(page: Page) {
  return selectorTable(page)
    .locator("tbody tr")
    .evaluateAll((rows) =>
      rows.map((row) => {
        const cells = (row as HTMLTableRowElement).cells;
        const icon = row.querySelector<HTMLImageElement>("img[data-qa='token-icon']");
        return {
          label: cells[1].innerText.trim().split(/\s+/)[0],
          price: cells[2].innerText.trim(),
          isNew: cells[0].innerText.includes("New"),
          icon: icon && {
            alt: icon.alt,
            src: decodeURIComponent(icon.src),
            loaded: icon.complete && icon.naturalWidth > 0,
          },
        };
      })
    );
}
