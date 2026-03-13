import { test, expect } from "@playwright/experimental-ct-react";

import Tabs from "./Tabs";
import { ControlledTabs } from "./Tabs.ct.stories";
import { Option } from "./types";

const SIMPLE_OPTIONS: Option<string>[] = [
  { value: "tab1", label: "First" },
  { value: "tab2", label: "Second" },
  { value: "tab3", label: "Third" },
];

const NO_LABEL_OPTIONS: Option<string>[] = [{ value: "raw-value" }, { value: "another" }];

const ICON_OPTIONS: Option<string>[] = [
  { value: "a", label: "Alpha", icon: <span data-testid="icon-a">A-icon</span> },
  { value: "b", label: "Beta", icon: <span data-testid="icon-b">B-icon</span> },
];

const NESTED_OPTIONS: Option<string>[] = [
  { value: "tab1", label: "Regular" },
  {
    label: "More",
    options: [
      { value: "nested1", label: "Nested One" },
      { value: "nested2", label: "Nested Two" },
    ],
  },
];

const NUMERIC_OPTIONS: Option<number>[] = [
  { value: 1, label: "One" },
  { value: 2, label: "Two" },
  { value: 3, label: "Three" },
];

test.describe("Tabs", () => {
  test("renders all tab options", async ({ mount }) => {
    const component = await mount(<Tabs options={SIMPLE_OPTIONS} selectedValue="tab1" type="block" />);

    await expect(component.getByText("First")).toBeVisible();
    await expect(component.getByText("Second")).toBeVisible();
    await expect(component.getByText("Third")).toBeVisible();
  });

  test("uses value as label when label is not provided", async ({ mount }) => {
    const component = await mount(<Tabs options={NO_LABEL_OPTIONS} selectedValue="raw-value" type="block" />);

    await expect(component.getByText("raw-value")).toBeVisible();
    await expect(component.getByText("another")).toBeVisible();
  });

  test("calls onChange when a tab is clicked", async ({ mount }) => {
    const clicked: string[] = [];
    const component = await mount(
      <Tabs options={SIMPLE_OPTIONS} selectedValue="tab1" onChange={(value) => clicked.push(value)} type="block" />
    );

    await component.getByText("Second").click();
    expect(clicked).toEqual(["tab2"]);
  });

  test("switches active tab on click (controlled)", async ({ mount }) => {
    const component = await mount(<ControlledTabs initialValue="tab1" />);

    const secondTab = component.getByText("Second");
    await secondTab.click();

    // After clicking "Second", verify it has the active class
    await expect(secondTab).toHaveClass(/border-b-blue-300/);

    // Click third tab and verify
    const thirdTab = component.getByText("Third");
    await thirdTab.click();
    await expect(thirdTab).toHaveClass(/border-b-blue-300/);
    // Second tab should no longer be active
    await expect(secondTab).not.toHaveClass(/border-b-blue-300/);
  });

  test("renders with data-qa attribute", async ({ mount }) => {
    const component = await mount(<Tabs options={SIMPLE_OPTIONS} selectedValue="tab1" type="block" qa="test-tabs" />);

    await expect(component).toHaveAttribute("data-qa", "test-tabs");
  });

  test("renders rightContent", async ({ mount }) => {
    const component = await mount(
      <Tabs
        options={SIMPLE_OPTIONS}
        selectedValue="tab1"
        type="block"
        rightContent={<span data-testid="right">Extra</span>}
      />
    );

    await expect(component.getByText("Extra")).toBeVisible();
  });

  test.describe("type=inline", () => {
    test("renders inline tabs", async ({ mount }) => {
      const component = await mount(<ControlledTabs type="inline" />);

      await expect(component.getByText("First")).toBeVisible();
      await expect(component.getByText("Second")).toBeVisible();
    });

    test("switches active tab on click", async ({ mount }) => {
      const component = await mount(<ControlledTabs type="inline" initialValue="tab1" />);

      const secondTab = component.getByText("Second");
      await secondTab.click();
      // Inline active tab gets secondary variant with !text-typography-primary
      await expect(secondTab).toHaveClass(/!text-typography-primary/);
    });
  });

  test.describe("type=pills", () => {
    test("renders pill-shaped tabs", async ({ mount }) => {
      const component = await mount(<ControlledTabs type="pills" />);

      await expect(component.getByText("First")).toBeVisible();
      await expect(component.getByText("Second")).toBeVisible();
    });

    test("switches active tab on click", async ({ mount }) => {
      const component = await mount(<ControlledTabs type="pills" initialValue="tab1" />);

      const secondTab = component.getByText("Second");
      await secondTab.click();
      // Pills active tab gets bg-slate-800
      await expect(secondTab).toHaveClass(/bg-slate-800/);
    });
  });

  test.describe("type=inline-primary", () => {
    test("renders inline-primary tabs", async ({ mount }) => {
      const component = await mount(<ControlledTabs type="inline-primary" />);

      await expect(component.getByText("First")).toBeVisible();
      await expect(component.getByText("Second")).toBeVisible();
    });
  });

  test("renders tabs with icons", async ({ mount }) => {
    const component = await mount(<Tabs options={ICON_OPTIONS} selectedValue="a" type="block" />);

    await expect(component.getByText("A-icon")).toBeVisible();
    await expect(component.getByText("B-icon")).toBeVisible();
    await expect(component.getByText("Alpha")).toBeVisible();
    await expect(component.getByText("Beta")).toBeVisible();
  });

  test("renders with nested options and opens dropdown", async ({ mount, page }) => {
    const component = await mount(<Tabs options={NESTED_OPTIONS} selectedValue="tab1" type="inline" />);

    await expect(component.getByText("Regular")).toBeVisible();

    // The nested tab renders a dropdown trigger button
    const dropdownTrigger = component.locator("button").last();
    await expect(dropdownTrigger).toBeVisible();

    // Click to open the dropdown
    await dropdownTrigger.click();

    // Dropdown items render in a FloatingPortal, so look at the page level
    await expect(page.getByText("Nested One")).toBeVisible();
    await expect(page.getByText("Nested Two")).toBeVisible();
  });

  test("works without onChange (read-only tabs)", async ({ mount }) => {
    const component = await mount(<Tabs options={SIMPLE_OPTIONS} selectedValue="tab1" type="block" />);

    await expect(component.getByText("First")).toBeVisible();
    // Clicking should not throw
    await component.getByText("Second").click();
  });

  test("handles numeric option values", async ({ mount }) => {
    const clicked: number[] = [];
    const component = await mount(
      <Tabs options={NUMERIC_OPTIONS} selectedValue={1} onChange={(v) => clicked.push(v)} type="block" />
    );

    await component.getByText("Two").click();
    expect(clicked).toEqual([2]);
  });
});
