import { afterEach, describe, expect, it, vi } from "vitest";

import { metrics } from "../Metrics";
import { reportHandledRejection } from "../reportHandledRejection";

describe("reportHandledRejection", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends the rejection to error telemetry under the given source", () => {
    const pushError = vi.spyOn(metrics, "pushError").mockImplementation(() => undefined);
    const error = new Error("user rejected");

    reportHandledRejection("tradeboxSubmit")(error);

    expect(pushError).toHaveBeenCalledWith(error, "tradeboxSubmit");
  });

  it("ignores a rejection without a reason, as the global unhandled rejection handler does", () => {
    const pushError = vi.spyOn(metrics, "pushError").mockImplementation(() => undefined);

    reportHandledRejection("tradeboxSubmit")(undefined);

    expect(pushError).not.toHaveBeenCalled();
  });

  it("settles the submit promise so it never becomes an unhandled rejection", async () => {
    vi.spyOn(metrics, "pushError").mockImplementation(() => undefined);

    await expect(
      Promise.reject(new Error("failed")).catch(reportHandledRejection("orderEdit"))
    ).resolves.toBeUndefined();
  });
});
