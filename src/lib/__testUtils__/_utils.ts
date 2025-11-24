import { beforeEach, vi } from "vitest";

export const suppressConsole = () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => null);
    vi.spyOn(console, "error").mockImplementation(() => null);
    vi.spyOn(console, "log").mockImplementation(() => null);
    vi.spyOn(console, "info").mockImplementation(() => null);
  });
};
