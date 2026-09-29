import { afterEach, describe, expect, it, vi } from "vitest";

import { getShareURL, uploadElementAsShareImage } from "./shareImage";

const mocks = vi.hoisted(() => ({ render: vi.fn(), metricError: vi.fn() }));
vi.mock("lib/legacy", () => ({ getRootShareApiUrl: () => "https://share.gmx.io" }));
vi.mock("lib/copyElementAsImage", () => ({ renderElementToBlob: mocks.render }));
vi.mock("lib/metrics", () => ({ metrics: { pushError: mocks.metricError } }));

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("share image links", () => {
  it("adds the Rewards destination while preserving and encoding the image and referral", () => {
    const url = new URL(getShareURL("image123", "My_Code", "rewards"));
    expect(url.origin).toBe("https://share.gmx.io");
    expect(Object.fromEntries(url.searchParams)).toEqual({ id: "image123", ref: "My_Code", page: "rewards" });
    const encoded = new URL(getShareURL("image123", "code&page=other", "rewards"));
    expect(encoded.searchParams.get("ref")).toBe("code&page=other");
    expect(encoded.searchParams.get("page")).toBe("rewards");
  });

  it("keeps existing share links on their default destination", () => {
    expect(getShareURL("image123", "MyCode")).toBe("https://share.gmx.io/api/s?id=image123&ref=MyCode");
    expect(getShareURL("image123")).toBe("https://share.gmx.io/api/s?id=image123");
  });

  it("uploads the rendered image with custom card dimensions", async () => {
    const blob = new Blob(["image"], { type: "image/jpeg" });
    mocks.render.mockResolvedValue(blob);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "image123" })));
    vi.stubGlobal("fetch", fetchMock);
    const element = document.createElement("div");
    const options = { canvasWidth: 600, canvasHeight: 315, style: { transform: "none" } };
    await expect(uploadElementAsShareImage(element, options)).resolves.toEqual({ id: "image123" });
    expect(mocks.render).toHaveBeenCalledWith(element, { quality: 0.95, ...options });
    expect(fetchMock).toHaveBeenCalledWith("https://share.gmx.io/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: blob,
    });
  });
});
