import { beforeEach, expect, it, vi } from "vitest";

const { initWasm, bind, start } = vi.hoisted(() => ({
  initWasm: vi.fn(),
  bind: vi.fn(),
  start: vi.fn(),
}));

vi.mock("@gmsol-labs/gmsol-sdk/index_bg.js", () => ({ __wbg_set_wasm: bind }));
vi.mock("@gmsol-labs/gmsol-sdk/index_bg.wasm?init", () => ({ default: initWasm }));

beforeEach(() => {
  vi.resetModules();
  bind.mockReset();
  start.mockReset();
  initWasm.mockReset().mockResolvedValue({ exports: { __wbindgen_start: start } });
});

it("shares successful initialization across concurrent and later calls", async () => {
  const { initialize } = await import("./sdk-entry.js");
  const first = initialize();
  expect(initialize()).toBe(first);
  await first;
  expect(initialize()).toBe(first);
  expect(initWasm).toHaveBeenCalledTimes(1);
  expect(bind).toHaveBeenCalledTimes(1);
  expect(start).toHaveBeenCalledTimes(1);
});

it("retries failed WASM loading on the next call without binding a failed instance", async () => {
  const error = new TypeError("Failed to fetch WASM");
  initWasm.mockRejectedValueOnce(error);
  const { initialize } = await import("./sdk-entry.js");
  const first = initialize();
  expect(initialize()).toBe(first);
  await expect(first).rejects.toBe(error);
  expect(bind).not.toHaveBeenCalled();
  expect(start).not.toHaveBeenCalled();

  const retry = initialize();
  expect(initialize()).toBe(retry);
  await expect(retry).resolves.toBeDefined();
  expect(initialize()).toBe(retry);
  expect(initWasm).toHaveBeenCalledTimes(2);
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
