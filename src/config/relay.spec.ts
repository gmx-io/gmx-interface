import { describe, expect, it } from "vitest";

import { resolveRelayProvider } from "config/relay";

describe("resolveRelayProvider", () => {
  it("keeps a chain on Gelato until it is opted in, whatever the ab flag says", () => {
    expect(resolveRelayProvider(undefined, true)).toBe("gelato");
    expect(resolveRelayProvider(undefined, false)).toBe("gelato");
  });

  it("splits an ab chain by the flag", () => {
    expect(resolveRelayProvider("ab", true)).toBe("gmx");
    expect(resolveRelayProvider("ab", false)).toBe("gelato");
  });

  it("lets a pinned provider override the flag in both directions", () => {
    expect(resolveRelayProvider("gmx", false)).toBe("gmx");
    expect(resolveRelayProvider("gelato", true)).toBe("gelato");
  });
});
