import { beforeEach, describe, expect, it, vi } from "vitest";

async function importAbConfig() {
  return import("../ab");
}

describe("AB flags", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("keeps a manually enabled zero-probability flag after reload", async () => {
    let abConfig = await importAbConfig();

    abConfig.setAbFlagEnabled("abSdk3", true);

    vi.resetModules();
    abConfig = await importAbConfig();

    expect(abConfig.getIsFlagEnabled("abSdk3")).toBe(true);
  });

  it("removes old flags when config changes", async () => {
    localStorage.setItem(
      "ab-flags",
      JSON.stringify({
        apiSdk2: { enabled: true },
      })
    );

    const abConfig = await importAbConfig();

    expect(abConfig.getAbStorage()).not.toHaveProperty("apiSdk2");
    expect(abConfig.getAbStorage()).toHaveProperty("abSdk3");
  });
});
