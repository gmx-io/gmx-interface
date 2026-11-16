import { expect } from "@playwright/test";
import { test } from "../fixtures/browser";
import {
  inputNumber,
  openSettings,
  openTrade,
  selectMarket,
  selectTradeDirection,
  setSettingsToggle,
} from "../fixtures/trade";

test("5.12 5.13 leverage input and slider respect the market's minimum and maximum", async ({ page }) => {
  await openTrade(page);
  await selectMarket(page, "ETH");
  await page.getByTestId("margin-input").fill("1000");
  await page.getByTestId("leverage-slider").first().click();
  const popover = page.getByText("Adjust leverage", { exact: true }).locator("../..");
  const input = popover.getByRole("textbox");
  await input.fill("5");
  await input.press("Tab");
  await expect.poll(() => inputNumber(input)).toBe(5);
  await expect.poll(() => inputNumber(page.getByTestId("position-size-input"))).toBeGreaterThan(4800);
  const slider = popover.getByRole("slider");
  const marks = popover.locator(".rc-slider-mark-text");
  const min = parseFloat((await marks.first().textContent())!);
  const max = parseFloat((await marks.last().textContent())!);
  expect(max).toBeGreaterThan(min);
  await input.fill(String(max + 100));
  await input.press("Tab");
  await expect.poll(() => inputNumber(input)).toBe(max);
  await slider.focus();
  await slider.press("Home");
  await expect(slider).toHaveAttribute("aria-valuenow", (await slider.getAttribute("aria-valuemin"))!);
  await expect.poll(() => inputNumber(input)).toBe(min);
  await slider.press("End");
  await expect(slider).toHaveAttribute("aria-valuenow", (await slider.getAttribute("aria-valuemax"))!);
  await expect.poll(() => inputNumber(input)).toBe(max);
});

for (const direction of ["Long", "Short"] as const) {
  test(`5.14 independent ${direction} inputs: margin and size are independent and the derived leverage changes`, async ({
    page,
  }) => {
    await openTrade(page);
    const settings = await openSettings(page, "Display");
    await setSettingsToggle(settings, "Manual leverage", false);
    await page.keyboard.press("Escape");
    await selectMarket(page, "ETH");
    await selectTradeDirection(page, direction);
    const margin = page.getByTestId("margin-input");
    const size = page.getByTestId("position-size-input");
    const leverage = page.getByTestId("leverage-slider").first();
    await margin.fill("1000");
    await size.fill("3000");
    await expect(leverage).toContainText(/(?:2\.9\d*|3(?:\.0\d*)?)\s*x/);
    await margin.fill("2000");
    // The USD display follows live prices while the entered token size stays fixed.
    await expect.poll(async () => Math.abs((await inputNumber(size)) / 3000 - 1)).toBeLessThan(0.005);
    await expect(leverage).toContainText(/1\.[45]\d*\s*x/);
    await size.fill("6000");
    await expect.poll(() => inputNumber(margin)).toBe(2000);
    await expect(leverage).toContainText(/(?:2\.9\d*|3(?:\.0\d*)?)\s*x/);
    await expect(page.getByTestId("confirm-trade-button")).toHaveText("Connect wallet");
  });
}
