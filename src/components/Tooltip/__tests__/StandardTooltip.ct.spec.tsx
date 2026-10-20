import { expect, test } from "@playwright/experimental-ct-react";
import type { Page } from "playwright/test";

import {
  ButtonTriggerStory,
  DisabledButtonStory,
  DropdownTriggerStory,
  GroupStory,
  LinkActionStory,
  ModalStory,
  NestedStory,
  PlacementStory,
  PlainStory,
  ScrollStory,
  SizeStory,
  TriggerInsideButtonStory,
} from "./StandardTooltip.stories";

const PANEL = ".Tooltip-popup--standard";
const OPEN_PANEL = ".Tooltip-popup--standard[data-status='open']";

// From the cursor or keyboard focus reaching a trigger to its panel on screen, per tooltip
function trackOpenDelays() {
  const state = window as unknown as { openDelays: number[]; lastEnter: number };
  state.openDelays = [];
  const onEnter = (event: Event) => {
    if ((event.target as Element).closest(".Tooltip-handle")) {
      state.lastEnter = performance.now();
    }
  };
  document.addEventListener("mouseover", onEnter);
  document.addEventListener("focusin", onEnter);
  new MutationObserver(() => {
    const panels = document.querySelectorAll(".Tooltip-popup--standard[data-status='open']:not([data-seen])");
    panels.forEach((panel) => {
      panel.setAttribute("data-seen", "");
      state.openDelays.push(performance.now() - state.lastEnter);
    });
  }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-status"] });
}

// The panel's width and opacity on every frame while it opens
function trackPanelFrames() {
  const state = window as unknown as { panelFrames: { width: number; opacity: number }[] };
  state.panelFrames = [];
  const sample = () => {
    const panel = document.querySelector(".Tooltip-popup--standard");
    if (panel) {
      state.panelFrames.push({
        width: panel.getBoundingClientRect().width,
        opacity: Number(getComputedStyle(panel).opacity),
      });
    }
    requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
}

// Component tests share one page, so Tab would go on from where the previous test left focus
async function startTabbingFromTop(page: Page) {
  await page.mouse.click(1, 1);
}

test.describe("StandardTooltip", () => {
  test("opens about 200 ms after the cursor reaches the trigger", async ({ mount, page }) => {
    await mount(<PlainStory />);

    await page.getByText("Trigger").hover();
    await page.waitForTimeout(120);
    await expect(page.locator(PANEL)).toHaveCount(0);
    await expect(page.locator(OPEN_PANEL)).toHaveText("Tooltip text");
  });

  test("does not open when the cursor leaves within 200 ms", async ({ mount, page }) => {
    await mount(<PlainStory />);

    await page.getByText("Trigger").hover();
    await page.waitForTimeout(80);
    await page.mouse.move(0, 0);
    await page.waitForTimeout(400);
    await expect(page.locator(PANEL)).toHaveCount(0);
  });

  test("after one tooltip opens, the next one opens at once", async ({ mount, page }) => {
    await mount(<GroupStory />);
    await page.evaluate(trackOpenDelays);

    await page.getByText("First", { exact: true }).hover();
    await expect(page.locator(OPEN_PANEL)).toHaveText("First tooltip");
    await page.getByText("Second", { exact: true }).hover();
    await expect(page.locator(OPEN_PANEL)).toHaveText("Second tooltip");

    const delays = await page.evaluate(() => (window as unknown as { openDelays: number[] }).openDelays);
    expect(delays[0]).toBeGreaterThanOrEqual(190);
    expect(delays[1]).toBeLessThan(60);
  });

  test("stays open while the cursor moves into it, its text can be copied and its action works", async ({
    mount,
    page,
  }) => {
    await mount(<LinkActionStory />);

    await page.getByText("Trigger").hover();
    const text = page.getByText("Selectable tooltip text");
    await expect(text).toBeVisible();

    await text.hover();
    await page.waitForTimeout(500);
    await expect(text).toBeVisible();

    await text.click({ clickCount: 3 });
    expect(await page.evaluate(() => window.getSelection()?.toString())).toContain("Selectable tooltip text");

    await page.getByRole("button", { name: "Set max leverage" }).click();
    await expect(page.getByTestId("clicks")).toHaveText("1");
  });

  test("a page scroll closes it, a scroll inside it does not", async ({ mount, page }) => {
    await mount(<ScrollStory />);

    await page.getByText("Trigger").hover();
    const inner = page.getByTestId("inner-scroll");
    await expect(inner).toBeVisible();

    await inner.hover();
    await page.mouse.wheel(0, 40);
    await expect.poll(() => inner.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await expect(page.locator(OPEN_PANEL)).toBeVisible();

    await page.evaluate(() => window.scrollBy(0, 200));
    await expect(page.locator(PANEL)).toHaveCount(0);
  });

  for (const reducedMotion of ["reduce", "no-preference"] as const) {
    test(`with reduced motion "${reducedMotion}" it ${reducedMotion === "reduce" ? "only fades" : "also moves"}`, async ({
      mount,
      page,
    }) => {
      await page.emulateMedia({ reducedMotion });
      await mount(<PlainStory />);
      await page.evaluate(trackPanelFrames);

      await page.getByText("Trigger").hover();
      await expect(page.locator(OPEN_PANEL)).toBeVisible();
      await page.waitForTimeout(300);

      const frames = await page.evaluate(
        () => (window as unknown as { panelFrames: { width: number; opacity: number }[] }).panelFrames
      );
      const widths = new Set(frames.map((frame) => Math.round(frame.width * 10)));
      expect(frames.some((frame) => frame.opacity < 1)).toBe(true);
      expect(widths.size === 1).toBe(reducedMotion === "reduce");
    });
  }

  test("keyboard: focus opens it at once, Tab moves into it, Escape closes it and returns focus", async ({
    mount,
    page,
  }) => {
    await mount(<LinkActionStory />);
    await page.evaluate(trackOpenDelays);
    await startTabbingFromTop(page);

    await page.keyboard.press("Tab");
    const trigger = page.locator(".Tooltip-handle", { hasText: "Trigger" });
    await expect(trigger).toBeFocused();
    await expect(page.locator(OPEN_PANEL)).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { openDelays: number[] }).openDelays[0])).toBeLessThan(60);

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Set max leverage" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Read more" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(page.locator(PANEL)).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("in a modal, the first Escape closes only the tooltip", async ({ mount, page }) => {
    await mount(<ModalStory />);

    await page.getByRole("button", { name: "Open modal" }).click();
    await expect(page.getByTestId("modal-state")).toHaveText("open");

    await page.getByText("Modal trigger").hover();
    await expect(page.locator(OPEN_PANEL)).toHaveText("Modal tooltip text");

    await page.keyboard.press("Escape");
    await expect(page.locator(PANEL)).toHaveCount(0);
    await expect(page.getByTestId("modal-state")).toHaveText("open");

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("modal-state")).toHaveText("closed");
  });

  test("a disabled button: Tab reaches it, focus shows why, Enter, Space and clicks do nothing", async ({
    mount,
    page,
  }) => {
    await mount(<DisabledButtonStory />);
    await startTabbingFromTop(page);

    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toHaveAttribute("role", "button");
    await expect(focused).toHaveAttribute("aria-disabled", "true");
    await expect(page.locator(OPEN_PANEL)).toHaveText("Max leverage exceeded");

    const panelId = await page.locator("[role='tooltip']").getAttribute("id");
    expect(await focused.getAttribute("aria-describedby")).toContain(panelId);

    await page.keyboard.press("Enter");
    await page.keyboard.press("Space");
    await page.getByText("Disabled action").click({ force: true });
    await expect(page.getByTestId("clicks")).toHaveText("0");
  });

  test("a trigger that opens a modal or a dropdown gives way to it", async ({ mount, page }) => {
    const modalStory = await mount(<ButtonTriggerStory />);

    await page.getByRole("button", { name: "Open modal" }).hover();
    await expect(page.locator(OPEN_PANEL)).toHaveText("Opens a modal");
    await page.getByRole("button", { name: "Open modal" }).click();
    await expect(page.getByTestId("modal-state")).toHaveText("open");
    await expect(page.locator(PANEL)).toHaveCount(0);
    await modalStory.unmount();

    await mount(<DropdownTriggerStory />);
    await page.getByRole("button", { name: "Dropdown" }).hover();
    await expect(page.locator(OPEN_PANEL)).toHaveText("Dropdown tooltip");
    await page.getByRole("button", { name: "Dropdown" }).click();
    await expect(page.getByText("Dropdown panel")).toBeVisible();
    await expect(page.locator(PANEL)).toHaveCount(0);
  });

  test("opens below, above only without room below, never to a side", async ({ mount, page }) => {
    await mount(<PlacementStory />);

    const box = async (selector: string) => (await page.locator(selector).first().boundingBox())!;

    await page.getByText("Top trigger").hover();
    await expect(page.locator(OPEN_PANEL)).toBeVisible();
    expect((await box(PANEL)).y).toBeGreaterThan((await box("text=Top trigger")).y);

    await page.getByText("Bottom trigger").hover();
    await expect(page.locator(OPEN_PANEL).filter({ hasText: "plain words" })).toBeVisible();
    const bottomPanel = await box(PANEL);
    expect(bottomPanel.y + bottomPanel.height).toBeLessThan((await box("text=Bottom trigger")).y);

    await page.getByText("Edge").hover();
    await page.waitForTimeout(400);
    const edgePanel = await box(PANEL);
    const edgeTrigger = await box("text=Edge");
    const viewport = page.viewportSize()!;
    expect(edgePanel.x).toBeGreaterThanOrEqual(0);
    expect(edgePanel.x + edgePanel.width).toBeLessThanOrEqual(viewport.width);
    expect(edgePanel.y >= edgeTrigger.y + edgeTrigger.height || edgePanel.y + edgePanel.height <= edgeTrigger.y).toBe(
      true
    );
  });

  test("the default size is at most 350px wide, the wide size at most 480px", async ({ mount, page }) => {
    await mount(<SizeStory />);

    await page.getByText("Default", { exact: true }).hover();
    await expect(page.locator(OPEN_PANEL)).toBeVisible();
    expect((await page.locator(".Tooltip-floating").boundingBox())!.width).toBeLessThanOrEqual(350);

    await page.mouse.move(0, 0);
    await expect(page.locator(PANEL)).toHaveCount(0);

    await page.getByText("Wide", { exact: true }).hover();
    await expect(page.locator(OPEN_PANEL)).toBeVisible();
    const wideWidth = (await page.locator(".Tooltip-floating").boundingBox())!.width;
    expect(wideWidth).toBeGreaterThan(350);
    expect(wideWidth).toBeLessThanOrEqual(480);
  });

  test("a tooltip inside an open tooltip keeps its parent open", async ({ mount, page }) => {
    await mount(<NestedStory />);

    await page.getByText("Parent").hover();
    const child = page.locator(".Tooltip-handle", { hasText: "Child" });
    await expect(child).toBeVisible();
    await child.hover();

    await expect(page.getByText("Child tooltip")).toBeVisible();
    await expect(page.locator(OPEN_PANEL)).toHaveCount(2);
  });

  test("a trigger inside a button: the button takes focus and opens it, no extra Tab stop, hand cursor", async ({
    mount,
    page,
  }) => {
    await mount(<TriggerInsideButtonStory />);
    await startTabbingFromTop(page);

    await page.keyboard.press("Tab");
    const control = page.getByRole("button", { name: /Sort by size/ });
    await expect(control).toBeFocused();
    await expect(page.locator(OPEN_PANEL)).toHaveText("Size of the position");
    expect(await control.getAttribute("aria-describedby")).toBeTruthy();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "After" })).toBeFocused();
    await expect(page.locator(PANEL)).toHaveCount(0);

    expect(await page.locator(".Tooltip-handle").evaluate((el) => getComputedStyle(el).cursor)).toBe("pointer");
    await control.click();
    await expect(page.getByTestId("sorts")).toHaveText("1");
  });

  test("a text trigger shows the arrow cursor, a button trigger the hand cursor", async ({ mount, page }) => {
    const plain = await mount(<PlainStory />);
    const cursor = (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((el) => getComputedStyle(el).cursor);

    expect(await cursor(".Tooltip-handle")).toBe("default");
    await plain.unmount();

    await mount(<ButtonTriggerStory />);
    expect(await cursor("button:has-text('Count')")).toBe("pointer");
  });
});

test.describe("StandardTooltip on a phone", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test("a tap opens it, a tap outside closes it", async ({ mount, page }) => {
    await mount(<PlainStory />);

    await page.getByText("Trigger").tap();
    await expect(page.locator(OPEN_PANEL)).toHaveText("Tooltip text");

    await page.getByText("Outside").tap();
    await expect(page.locator(PANEL)).toHaveCount(0);
  });

  test("a tap on a button runs it and opens its tooltip, a tap that opens a modal closes it", async ({
    mount,
    page,
  }) => {
    await mount(<ButtonTriggerStory />);

    await page.getByRole("button", { name: "Count" }).tap();
    await expect(page.getByTestId("clicks")).toHaveText("1");
    await expect(page.locator(OPEN_PANEL)).toHaveText("Counts clicks");

    await page.getByRole("button", { name: "Open modal" }).tap();
    await expect(page.getByTestId("modal-state")).toHaveText("open");
    await expect(page.locator(PANEL)).toHaveCount(0);
  });

  test("a tap that opens a dropdown closes the tooltip", async ({ mount, page }) => {
    await mount(<DropdownTriggerStory />);

    await page.getByRole("button", { name: "Dropdown" }).tap();
    await expect(page.getByText("Dropdown panel")).toBeVisible();
    await page.waitForTimeout(300);
    await expect(page.locator(PANEL)).toHaveCount(0);
  });

  test("a tap on a disabled button opens its tooltip", async ({ mount, page }) => {
    await mount(<DisabledButtonStory />);

    await page.getByText("Disabled action").tap({ force: true });
    await expect(page.locator(OPEN_PANEL)).toHaveText("Max leverage exceeded");
    await expect(page.getByTestId("clicks")).toHaveText("0");

    await page.getByTestId("clicks").tap();
    await expect(page.locator(PANEL)).toHaveCount(0);
    await page.getByText("Disabled action").tap({ force: true });
    await expect(page.locator(OPEN_PANEL)).toHaveText("Max leverage exceeded");
  });
});
