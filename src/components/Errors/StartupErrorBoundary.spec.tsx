import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { completeAppStartup } from "lib/appStartup";

import StartupErrorBoundary from "./StartupErrorBoundary";

vi.mock("lib/metrics/startupErrors", () => ({ reportStartupError: vi.fn() }));

afterEach(() => {
  cleanup();
  document.getElementById("app-splash")?.remove();
  document.getElementById("app-loading")?.remove();
  vi.restoreAllMocks();
});

function CrashingProvider(): never {
  throw new Error("Provider failed");
}

describe("startup error boundary", () => {
  it.each([false, true])("shows the HTML fallback for provider errors (already started: %s)", (alreadyStarted) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    document.body.insertAdjacentHTML(
      "beforeend",
      '<div id="app-splash"><img alt="GMX" /></div><main id="app-loading" hidden><p id="app-loading-message">Something went wrong</p><button>Reload page</button></main>'
    );
    if (alreadyStarted) {
      completeAppStartup();
    }

    render(
      <StartupErrorBoundary>
        <CrashingProvider />
      </StartupErrorBoundary>
    );

    expect(document.getElementById("app-splash")).toBeNull();
    expect(document.getElementById("app-loading")?.hidden).toBe(false);
    expect(document.getElementById("app-loading-message")?.textContent).toBe("Something went wrong");
    expect(document.querySelector("#app-loading button")?.textContent).toBe("Reload page");
  });
});
