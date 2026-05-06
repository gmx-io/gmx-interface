import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { RecentlyListedBadge } from "../RecentlyListedBadge";

beforeAll(() => {
  i18n.load("en", {});
  i18n.activate("en");
});

describe("RecentlyListedBadge", () => {
  afterEach(cleanup);

  it('renders the "New" label', () => {
    render(
      <I18nProvider i18n={i18n}>
        <RecentlyListedBadge />
      </I18nProvider>
    );
    expect(screen.getByText("New")).toBeTruthy();
  });
});
