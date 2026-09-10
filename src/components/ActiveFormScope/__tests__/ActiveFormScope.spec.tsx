import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ActiveFormScope, useActiveForm } from "../ActiveFormScope";

type Activity = Map<string, boolean>;

// Mirrors the real forms: the hook lives in the form component, while the scope is rendered only
// while the form's content is on screen (Modal renders its children only when it is visible).
function Form({ name, isOpen = true, activity }: { name: string; isOpen?: boolean; activity: Activity }) {
  const { formId, isActiveForm } = useActiveForm();

  activity.set(name, isActiveForm);

  if (!isOpen) {
    return null;
  }

  return (
    <ActiveFormScope formId={formId}>
      <input aria-label={name} />
      <button type="button" aria-label={`${name} max`} />
    </ActiveFormScope>
  );
}

function renderForms(forms: { name: string; isOpen?: boolean }[]) {
  const activity: Activity = new Map();

  const ui = (nextForms: { name: string; isOpen?: boolean }[]) => (
    <>
      {nextForms.map((form) => (
        <Form key={form.name} name={form.name} isOpen={form.isOpen} activity={activity} />
      ))}
    </>
  );

  const { rerender } = render(ui(forms));

  return { activity, rerender: (nextForms: { name: string; isOpen?: boolean }[]) => rerender(ui(nextForms)) };
}

describe("ActiveFormScope", () => {
  afterEach(cleanup);

  it("makes the only mounted form active", () => {
    const { activity } = renderForms([{ name: "page" }]);

    expect(activity.get("page")).toBe(true);
  });

  it("hands activity to a form that appears later, e.g. a modal opened over the page", () => {
    const { activity, rerender } = renderForms([{ name: "page" }, { name: "modal", isOpen: false }]);

    rerender([{ name: "page" }, { name: "modal", isOpen: true }]);

    expect(activity.get("modal")).toBe(true);
    expect(activity.get("page")).toBe(false);
  });

  it("returns activity to the previously active form when the active one closes", () => {
    const { activity, rerender } = renderForms([{ name: "page" }, { name: "modal", isOpen: true }]);

    rerender([{ name: "page" }, { name: "modal", isOpen: false }]);

    expect(activity.get("page")).toBe(true);
    expect(activity.get("modal")).toBe(false);
  });

  it("returns activity to the previously active form when the active one unmounts", () => {
    const { activity, rerender } = renderForms([{ name: "page" }, { name: "modal" }]);

    rerender([{ name: "page" }]);

    expect(activity.get("page")).toBe(true);
  });

  it("never activates a form whose content is not on screen", () => {
    const { activity } = renderForms([{ name: "hidden", isOpen: false }, { name: "page" }]);

    expect(activity.get("hidden")).toBe(false);
    expect(activity.get("page")).toBe(true);
  });

  it("activates the form the user points at", () => {
    const { activity } = renderForms([{ name: "first" }, { name: "second" }]);

    expect(activity.get("second")).toBe(true);

    fireEvent.pointerDown(screen.getByLabelText("first"));

    expect(activity.get("first")).toBe(true);
    expect(activity.get("second")).toBe(false);
  });

  it("activates the form that receives focus", () => {
    const { activity } = renderForms([{ name: "first" }, { name: "second" }]);

    fireEvent.focusIn(screen.getByLabelText("first"));

    expect(activity.get("first")).toBe(true);
    expect(activity.get("second")).toBe(false);
  });

  it("activates the form the user types into", () => {
    const { activity } = renderForms([{ name: "first" }, { name: "second" }]);

    fireEvent.keyDown(screen.getByLabelText("first"), { key: "1" });

    expect(activity.get("first")).toBe(true);
    expect(activity.get("second")).toBe(false);
  });

  it("activates the form whose field is filled programmatically, without focus or pointer events", () => {
    const { activity } = renderForms([{ name: "first" }, { name: "second" }]);

    fireEvent.input(screen.getByLabelText("first"), { target: { value: "10" } });

    expect(activity.get("first")).toBe(true);
    expect(activity.get("second")).toBe(false);
  });

  it("activates the form whose control is clicked without a preceding pointer event", () => {
    const { activity } = renderForms([{ name: "first" }, { name: "second" }]);

    fireEvent.click(screen.getByLabelText("first max"));

    expect(activity.get("first")).toBe(true);
    expect(activity.get("second")).toBe(false);
  });

  it("keeps the touched form active after other forms close", () => {
    const { activity, rerender } = renderForms([{ name: "first" }, { name: "second" }, { name: "third" }]);

    fireEvent.pointerDown(screen.getByLabelText("second"));
    rerender([{ name: "first" }, { name: "second" }, { name: "third", isOpen: false }]);

    expect(activity.get("second")).toBe(true);
    expect(activity.get("first")).toBe(false);
  });
});
