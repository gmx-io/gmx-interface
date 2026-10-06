import { i18n } from "@lingui/core";
import { cleanup, render, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { cwd } from "node:process";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import SEO from "./SEO";

const TEMPLATES = ["index.html", "landing/index.html"];

const SEO_KEYS = [
  "description",
  "og:type",
  "og:site_name",
  "og:description",
  "og:title",
  "og:image",
  "og:image:type",
  "og:image:width",
  "og:image:height",
  "og:image:alt",
  "twitter:card",
  "twitter:site",
  "twitter:title",
  "twitter:description",
  "twitter:image",
  "twitter:image:alt",
];

function parseTemplate(path: string) {
  return new DOMParser().parseFromString(readFileSync(`${cwd()}/${path}`, "utf8"), "text/html");
}

function getSeoTags(root: Document) {
  return SEO_KEYS.map((key) => ({
    key,
    tags: Array.from(
      root.head.querySelectorAll<HTMLMetaElement>(`meta[name="${key}"], meta[property="${key}"]`),
      (tag) => ({ content: tag.content, managedByHelmet: tag.getAttribute("data-react-helmet") === "true" })
    ),
  }));
}

function getSeoValues(root: Document) {
  return getSeoTags(root).map(({ key, tags }) => ({ key, values: tags.map((tag) => tag.content) }));
}

beforeAll(() => {
  i18n.load("en", {});
  i18n.activate("en");
});

afterEach(() => {
  cleanup();
  document.head.innerHTML = "";
  document.title = "";
});

describe("SEO default metadata", () => {
  it("keeps the SEO tags identical in the app and landing templates", () => {
    const [app, landing] = TEMPLATES.map(parseTemplate);

    expect(landing.title).toBe(app.title);
    expect(getSeoTags(landing)).toEqual(getSeoTags(app));
  });

  it.each(TEMPLATES)("leaves one tag per key with the static values of %s after React renders", async (path) => {
    const template = parseTemplate(path);
    const staticValues = getSeoValues(template);
    document.head.innerHTML = template.head.innerHTML;

    render(<SEO />);

    await waitFor(() => expect(document.head.querySelectorAll('meta[name="robots"]')).toHaveLength(1));
    expect(staticValues.every(({ values }) => values.length === 1)).toBe(true);
    expect(document.title).toBe(template.title);
    expect(getSeoValues(document)).toEqual(staticValues);
  });
});
