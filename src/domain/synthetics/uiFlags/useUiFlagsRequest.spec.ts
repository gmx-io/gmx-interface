import { afterEach, describe, expect, it, vi } from "vitest";

import { ARBITRUM } from "config/chains";

import {
  FORCE_GELATO_FALLBACK_UI_FLAG,
  IS_EXPRESS_AVAILABLE_UI_FLAG,
  UiFlags,
  confirmRelayControlFlags,
  getIsExpressAvailable,
  getIsGelatoFallbackForced,
} from "./useUiFlagsRequest";

function flags(enabled: boolean): UiFlags {
  return { [IS_EXPRESS_AVAILABLE_UI_FLAG]: { enabled, createdAt: "", updatedAt: "" } };
}

describe("getIsExpressAvailable", () => {
  it("only an explicit false takes express away", () => {
    expect(getIsExpressAvailable(flags(false))).toBe(false);
    expect(getIsExpressAvailable(flags(true))).toBe(true);
  });

  it("stays available when the flag is missing entirely", () => {
    expect(getIsExpressAvailable(undefined)).toBe(true);
    expect(getIsExpressAvailable({})).toBe(true);
  });
});

describe("confirmRelayControlFlags", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function flag(enabled: boolean) {
    return { enabled, createdAt: "", updatedAt: "" };
  }

  it("asks nobody while the switches are at rest", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await confirmRelayControlFlags(ARBITRUM, { [IS_EXPRESS_AVAILABLE_UI_FLAG]: flag(true) });

    expect(getIsExpressAvailable(result)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ignores one replica taking express away on its own", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ [IS_EXPRESS_AVAILABLE_UI_FLAG]: flag(true) })))
    );

    const result = await confirmRelayControlFlags(ARBITRUM, { [IS_EXPRESS_AVAILABLE_UI_FLAG]: flag(false) });

    expect(getIsExpressAvailable(result)).toBe(true);
  });

  it("still takes express away when the keeper itself says so", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ [IS_EXPRESS_AVAILABLE_UI_FLAG]: flag(false) })))
    );

    const result = await confirmRelayControlFlags(ARBITRUM, { [IS_EXPRESS_AVAILABLE_UI_FLAG]: flag(false) });

    expect(getIsExpressAvailable(result)).toBe(false);
  });

  it("confirms the force switch the same way", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ [FORCE_GELATO_FALLBACK_UI_FLAG]: flag(false) })))
    );

    const result = await confirmRelayControlFlags(ARBITRUM, { [FORCE_GELATO_FALLBACK_UI_FLAG]: flag(true) });

    expect(getIsGelatoFallbackForced(result)).toBe(false);
  });

  it("acts on what it has when the keeper cannot be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      })
    );

    const result = await confirmRelayControlFlags(ARBITRUM, { [IS_EXPRESS_AVAILABLE_UI_FLAG]: flag(false) });

    expect(getIsExpressAvailable(result)).toBe(false);
  });

  it("leaves unrelated flags as the elected replica served them", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ [IS_EXPRESS_AVAILABLE_UI_FLAG]: flag(true) })))
    );

    const result = await confirmRelayControlFlags(ARBITRUM, {
      [IS_EXPRESS_AVAILABLE_UI_FLAG]: flag(false),
      someOtherFlag: flag(true),
    });

    expect(result.someOtherFlag?.enabled).toBe(true);
  });
});
