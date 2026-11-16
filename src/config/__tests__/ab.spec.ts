import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({ isDevelopment: true }));

vi.mock("../env", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../env")>()),
  isDevelopment: () => env.isDevelopment,
}));

async function importAbConfig() {
  return import("../ab");
}

describe("AB flags", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    env.isDevelopment = true;
  });

  it("keeps a manually enabled zero-probability flag after reload", async () => {
    let abConfig = await importAbConfig();

    abConfig.setAbFlagEnabled("abSdk3", true);

    vi.resetModules();
    abConfig = await importAbConfig();

    expect(abConfig.getIsFlagEnabled("abSdk3")).toBe(true);
  });

  it("clears a hand-set zero-probability flag on a deployed build", async () => {
    env.isDevelopment = false;
    localStorage.setItem(
      "ab-flags",
      JSON.stringify({
        useTestApi: { enabled: true },
      })
    );

    const abConfig = await importAbConfig();

    expect(abConfig.getIsFlagEnabled("useTestApi")).toBe(false);
    expect(JSON.parse(localStorage.getItem("ab-flags")!).useTestApi).toEqual({ enabled: false });
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
