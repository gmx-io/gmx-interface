import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchNetworkBuildId, getBuildIdFromHtml, getDocumentBuildId, getIsNewerBuildId } from "./buildId";

function buildShell(buildId: string) {
  return `<!doctype html><html><head><meta name="gmx-pwa-build-id" content="${buildId}" /></head><body><div id="root"></div></body></html>`;
}

function mockFetch(response: Partial<Response> & { text?: () => Promise<string> }) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
      text: () => Promise.resolve(""),
      ...response,
    })
  );
}

describe("getBuildIdFromHtml", () => {
  it("reads the build id from the app shell", () => {
    expect(getBuildIdFromHtml(buildShell("1756200000000"))).toBe("1756200000000");
  });

  it("ignores a shell without a build id and a non numeric one", () => {
    expect(getBuildIdFromHtml("<html><head></head></html>")).toBe(undefined);
    expect(getBuildIdFromHtml(buildShell("not-a-build"))).toBe(undefined);
  });
});

describe("getIsNewerBuildId", () => {
  it("only accepts a strictly greater build id", () => {
    expect(getIsNewerBuildId("100", "101")).toBe(true);
    expect(getIsNewerBuildId("100", "100")).toBe(false);
    expect(getIsNewerBuildId("101", "100")).toBe(false);
  });

  it("compares numerically rather than as text", () => {
    expect(getIsNewerBuildId("99", "100")).toBe(true);
    expect(getIsNewerBuildId("100", "99")).toBe(false);
  });

  it("rejects missing and unusable build ids", () => {
    expect(getIsNewerBuildId(undefined, "100")).toBe(false);
    expect(getIsNewerBuildId("100", undefined)).toBe(false);
    expect(getIsNewerBuildId("100", "abc")).toBe(false);
    expect(getIsNewerBuildId("100", "99999999999999999999")).toBe(false);
  });
});

describe("getDocumentBuildId", () => {
  afterEach(() => {
    document.querySelectorAll('meta[name="gmx-pwa-build-id"]').forEach((element) => element.remove());
  });

  it("reads the build id of the running document", () => {
    expect(getDocumentBuildId()).toBe(undefined);

    const meta = document.createElement("meta");
    meta.name = "gmx-pwa-build-id";
    meta.content = "100";
    document.head.appendChild(meta);

    expect(getDocumentBuildId()).toBe("100");
  });
});

describe("fetchNetworkBuildId", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads the build id the network serves", async () => {
    mockFetch({ text: () => Promise.resolve(buildShell("200")) });

    await expect(fetchNetworkBuildId()).resolves.toBe("200");
    expect(fetch).toHaveBeenCalledWith("/", { cache: "no-store" });
  });

  it("gives up on a failed request, a non html response and a network error", async () => {
    mockFetch({ ok: false, text: () => Promise.resolve(buildShell("200")) });
    await expect(fetchNetworkBuildId()).resolves.toBe(undefined);

    mockFetch({ headers: new Headers({ "content-type": "application/json" }) });
    await expect(fetchNetworkBuildId()).resolves.toBe(undefined);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(fetchNetworkBuildId()).resolves.toBe(undefined);
  });
});
