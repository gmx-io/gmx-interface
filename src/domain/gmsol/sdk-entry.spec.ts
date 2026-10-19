import { beforeEach, expect, it, vi } from "vitest";

const { initWasm, bind, start } = vi.hoisted(() => ({ initWasm: vi.fn(), bind: vi.fn(), start: vi.fn() }));

vi.mock("@gmsol-labs/gmsol-sdk/index_bg.js", () => ({ __wbg_set_wasm: bind }));
vi.mock("@gmsol-labs/gmsol-sdk/index_bg.wasm?init", () => ({ default: initWasm }));

beforeEach(() => {
  vi.resetModules();
  bind.mockReset();
  start.mockReset();
  initWasm.mockReset().mockResolvedValue({ exports: { __wbindgen_start: start } });
});

it.each([false, true])("shares initialization, including after a recoverable loading failure: %s", async (retry) => {
  const { initialize } = await import("./sdk-entry.js");
  if (retry) {
    const error = new TypeError("Failed to fetch WASM");
    initWasm.mockRejectedValueOnce(error);
    const failed = initialize();
    expect(initialize()).toBe(failed);
    await expect(failed).rejects.toBe(error);
    expect(bind).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
  }
  const pending = initialize();
  expect(initialize()).toBe(pending);
  await expect(pending).resolves.toMatchObject({ __wbg_set_wasm: bind });
  expect(initialize()).toBe(pending);
  expect(initWasm).toHaveBeenCalledTimes(retry ? 2 : 1);
  expect(bind).toHaveBeenCalledTimes(1);
  expect(start).toHaveBeenCalledTimes(1);
});

it.each(["binding", "start"])("does not retry after a %s failure", async (stage) => {
  const error = new Error("Partial initialization");
  (stage === "binding" ? bind : start).mockImplementationOnce(() => {
    throw error;
  });
  const { initialize } = await import("./sdk-entry.js");
  const first = initialize();
  await expect(first).rejects.toBe(error);
  expect(initialize()).toBe(first);
  await expect(initialize()).rejects.toBe(error);
  expect(initWasm).toHaveBeenCalledTimes(1);
  expect(bind).toHaveBeenCalledTimes(1);
  expect(start).toHaveBeenCalledTimes(stage === "binding" ? 0 : 1);
});
