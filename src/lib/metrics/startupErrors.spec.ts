import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("startup error reporting", () => {
  beforeEach(() => {
    vi.resetModules();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("preserves errors across a failed startup and reports them on the next successful load", async () => {
    const { reportStartupError } = await import("./startupErrors");
    reportStartupError(new TypeError("Import failed"), "app.startup");
    vi.resetModules();

    const { setStartupErrorReporter } = await import("./startupErrors");
    const report = vi.fn();
    setStartupErrorReporter(report);
    expect(report).toHaveBeenCalledWith(
      expect.objectContaining({ message: "TypeError: Import failed" }),
      "app.startup"
    );

    vi.resetModules();
    const nextLoad = await import("./startupErrors");
    nextLoad.setStartupErrorReporter(report);
    expect(report).toHaveBeenCalledTimes(1);
  });

  it("reports subsequent errors immediately once metrics are ready", async () => {
    const { reportStartupError, setStartupErrorReporter } = await import("./startupErrors");
    const report = vi.fn();
    const error = new Error("Chunk failed");
    setStartupErrorReporter(report);
    reportStartupError(error, "pwa.preloadError");
    expect(report).toHaveBeenCalledWith(error, "pwa.preloadError");
  });

  it("keeps errors in memory when session storage is unavailable", async () => {
    vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new DOMException("Storage denied", "SecurityError");
    });
    const { reportStartupError, setStartupErrorReporter } = await import("./startupErrors");
    const report = vi.fn();
    reportStartupError(new Error("Import failed"), "app.startup");
    setStartupErrorReporter(report);
    expect(report).toHaveBeenCalledOnce();
  });

  it("preserves queued and new errors when the reporter throws", async () => {
    const { reportStartupError, setStartupErrorReporter } = await import("./startupErrors");
    reportStartupError(new Error("Startup failed"), "app.startup");
    const unavailableReporter = () => {
      throw new Error("Metrics unavailable");
    };
    expect(() => setStartupErrorReporter(unavailableReporter)).not.toThrow();
    expect(() => reportStartupError(new Error("Another failure"), "app.startup")).not.toThrow();

    const report = vi.fn();
    setStartupErrorReporter(report);
    expect(report).toHaveBeenCalledTimes(2);
  });
});
