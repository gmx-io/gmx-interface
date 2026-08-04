import { describe, it, expect, vi } from "vitest";

import {
  decodeOrderDataListMetadata,
  decodeOrderTwapParams,
  decodeTwapUiFeeReceiver,
  encodeOrderDataListMetadata,
  findOrderDataListMetadata,
  generateTwapId,
  setOrderDataListMetadataIsExpress,
  setOrderDataListMetadataIsJit,
  setOrderDataListMetadataSource,
  UI_FEE_SOURCE_API,
  UI_FEE_SOURCE_UI,
} from "utils/twap/uiFeeReceiver";

describe("uiFeeReceiver", () => {
  describe("decodeTwapUiFeeReceiver", () => {
    it("should return undefined if the address is not a valid address", () => {
      expect(decodeTwapUiFeeReceiver("0x1234567890123456789012345678901234567890")).toBeUndefined();
      expect(decodeTwapUiFeeReceiver("0xffffff")).toBeUndefined();
      expect(decodeTwapUiFeeReceiver("")).toBeUndefined();
    });

    it("should return undefined if twapId inside is 0000", () => {
      expect(decodeTwapUiFeeReceiver("0xff00000000000000000000000000000000000001")).toBeUndefined();
    });

    it("should correctly decode isExpress", () => {
      expect(decodeTwapUiFeeReceiver("0xff0000000000000000000000000000010a123401")).toEqual({
        isExpress: true,
        isJit: false,
        source: "00",
        twapId: "1234",
        numberOfParts: 10,
      });
    });

    it("should correctly decode isJit", () => {
      expect(decodeTwapUiFeeReceiver("0xff0000000000000000000000000001000a123401")).toEqual({
        isExpress: false,
        isJit: true,
        source: "00",
        twapId: "1234",
        numberOfParts: 10,
      });
    });

    it("should correctly decode source byte", () => {
      expect(decodeTwapUiFeeReceiver("0xff0000010000000000000000000000000a123401")).toEqual({
        isExpress: false,
        isJit: false,
        source: "01",
        twapId: "1234",
        numberOfParts: 10,
      });
    });

    it("should return the twapId and numberOfParts if the uiFeeReceiver is valid twap", () => {
      expect(decodeTwapUiFeeReceiver("0xff0000000000000000000000000000000a123401")).toEqual({
        isExpress: false,
        isJit: false,
        source: "00",
        twapId: "1234",
        numberOfParts: 10,
      });

      expect(decodeTwapUiFeeReceiver("0xff000000000000000000000000000000153a4f01")).toEqual({
        isExpress: false,
        isJit: false,
        source: "00",
        twapId: "3a4f",
        numberOfParts: 21,
      });
    });
  });
});

describe("dataList order metadata (gmxo)", () => {
  // Mirrors how gmx-squid / gmx-api encode a dataList entry: ASCII bytes first, zero padding after.
  function asciiToBytes32(text: string): string {
    let hex = "";
    for (const ch of text) {
      hex += ch.charCodeAt(0).toString(16).padStart(2, "0");
    }
    return "0x" + hex.padEnd(64, "0");
  }

  // gmx-api injects a requestId ("apisdk" + payload) into every order's dataList.
  const REQUEST_ID_ENTRY = "0x61706973646b" + "1122334455667788112233445566778800000000000000000000";
  // Index-0 GMX_DATA_ACTION_HASH convention (keccak-like binary entry).
  const GMX_DATA_ACTION_ENTRY = "0x" + "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2";

  it("does not generate the reserved zero TWAP id", () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);

    expect(generateTwapId()).toBe("0001");
    randomSpy.mockRestore();
  });

  describe("encodeOrderDataListMetadata", () => {
    it("produces the exact shared wire format", () => {
      expect(encodeOrderDataListMetadata({ numberOfParts: 5, twapId: "a1b2" })).toEqual(
        "0x676d786f3a313a353a613162323a30303a303a30000000000000000000000000"
      );
    });

    it("matches the ASCII gmxo:<version>:<numberOfParts>:<twapId>:<source>:<isJit>:<isExpress> layout", () => {
      expect(
        encodeOrderDataListMetadata({
          numberOfParts: 12,
          twapId: "00ff",
          source: UI_FEE_SOURCE_API,
          isJit: true,
          isExpress: true,
        })
      ).toEqual(asciiToBytes32("gmxo:1:12:00ff:01:1:1"));
    });

    it("round-trips through decodeOrderDataListMetadata", () => {
      const entry = encodeOrderDataListMetadata({
        numberOfParts: 21,
        twapId: "3a4f",
        source: UI_FEE_SOURCE_API,
        isJit: true,
        isExpress: false,
      });

      expect(decodeOrderDataListMetadata(entry)).toEqual({
        numberOfParts: 21,
        twapId: "3a4f",
        source: UI_FEE_SOURCE_API,
        isJit: true,
        isExpress: false,
      });
    });

    it("encodes non-TWAP JIT and express metadata with empty TWAP fields", () => {
      expect(encodeOrderDataListMetadata({ isJit: true, isExpress: true })).toEqual(
        asciiToBytes32("gmxo:1:0:0000:00:1:1")
      );
    });

    it("rejects unsupported sources", () => {
      expect(() => encodeOrderDataListMetadata({ source: "ff" })).toThrow("Unsupported order metadata source");
    });
  });

  describe("decodeOrderDataListMetadata", () => {
    it("decodes the documented example", () => {
      expect(decodeOrderDataListMetadata(asciiToBytes32("gmxo:1:5:a1b2:00:0:0"))).toEqual({
        numberOfParts: 5,
        twapId: "a1b2",
        source: UI_FEE_SOURCE_UI,
        isJit: false,
        isExpress: false,
      });
    });

    it("decodes an entry carrying only the TWAP fields (trailing fields optional)", () => {
      expect(decodeOrderDataListMetadata(asciiToBytes32("gmxo:1:8:c0de"))).toEqual({
        numberOfParts: 8,
        twapId: "c0de",
        source: UI_FEE_SOURCE_UI,
        isJit: false,
        isExpress: false,
      });
    });

    it("decodes the isJit and isExpress flags", () => {
      expect(decodeOrderDataListMetadata(asciiToBytes32("gmxo:1:0:0000:00:1:0"))?.isJit).toBe(true);
      expect(decodeOrderDataListMetadata(asciiToBytes32("gmxo:1:0:0000:00:0:1"))?.isExpress).toBe(true);
    });

    it("rejects unsupported versions and inconsistent TWAP fields", () => {
      expect(decodeOrderDataListMetadata(asciiToBytes32("gmxo:2:5:a1b2:00:0:0"))).toBeUndefined();
      expect(decodeOrderDataListMetadata(asciiToBytes32("gmxo:1:5:0000:00:0:0"))).toBeUndefined();
      expect(decodeOrderDataListMetadata(asciiToBytes32("gmxo:1:0:a1b2:00:0:0"))).toBeUndefined();
      expect(decodeOrderDataListMetadata(asciiToBytes32("gmxo:1:0:0000:ff:0:0"))).toBeUndefined();
    });

    it("rejects non-zero bytes after zero padding starts", () => {
      const entry = asciiToBytes32("gmxo:1:5:a1b2:00:0:0");

      expect(decodeOrderDataListMetadata(`${entry.slice(0, -2)}ff`)).toBeUndefined();
    });

    it("ignores foreign entries (requestId, GMX_DATA_ACTION)", () => {
      expect(decodeOrderDataListMetadata(REQUEST_ID_ENTRY)).toBeUndefined();
      expect(decodeOrderDataListMetadata(GMX_DATA_ACTION_ENTRY)).toBeUndefined();
    });
  });

  describe("findOrderDataListMetadata", () => {
    it("finds the entry position-independently, coexisting with requestId and GMX_DATA_ACTION", () => {
      const dataList = [
        GMX_DATA_ACTION_ENTRY,
        REQUEST_ID_ENTRY,
        encodeOrderDataListMetadata({ numberOfParts: 12, twapId: "00ff" }),
      ];

      expect(findOrderDataListMetadata(dataList)).toMatchObject({ twapId: "00ff", numberOfParts: 12 });
    });

    it("returns undefined for empty, missing or foreign-only dataList", () => {
      expect(findOrderDataListMetadata([])).toBeUndefined();
      expect(findOrderDataListMetadata(undefined)).toBeUndefined();
      expect(findOrderDataListMetadata([REQUEST_ID_ENTRY, GMX_DATA_ACTION_ENTRY])).toBeUndefined();
    });
  });

  describe("decodeOrderTwapParams (dual-read)", () => {
    // Legacy uiFeeReceiver carrying twapId 1234 / 10 parts.
    const legacyUiFeeReceiver = "0xff0000000000000000000000000000000a123401";

    it("prefers the dataList entry over the legacy uiFeeReceiver", () => {
      const dataList = [encodeOrderDataListMetadata({ numberOfParts: 3, twapId: "aaaa" })];

      expect(decodeOrderTwapParams(dataList, legacyUiFeeReceiver)).toMatchObject({ twapId: "aaaa", numberOfParts: 3 });
    });

    it("falls back to the legacy uiFeeReceiver when dataList has no gmxo entry", () => {
      expect(decodeOrderTwapParams([REQUEST_ID_ENTRY], legacyUiFeeReceiver)).toMatchObject({
        twapId: "1234",
        numberOfParts: 10,
      });
      expect(decodeOrderTwapParams(undefined, legacyUiFeeReceiver)).toMatchObject({
        twapId: "1234",
        numberOfParts: 10,
      });
    });

    it("returns undefined for a non-TWAP order (no gmxo entry, plain uiFeeReceiver)", () => {
      const plain = "0x1234567890123456789012345678901234567890";

      expect(decodeOrderTwapParams([], plain)).toBeUndefined();
      expect(decodeOrderTwapParams(undefined, plain)).toBeUndefined();
    });

    it("does not treat JIT or express metadata as TWAP", () => {
      const plain = "0x1234567890123456789012345678901234567890";
      const dataList = [encodeOrderDataListMetadata({ isJit: true, isExpress: true })];

      expect(decodeOrderTwapParams(dataList, plain)).toBeUndefined();
    });

    it("finds TWAP metadata after a non-TWAP gmxo entry", () => {
      const plain = "0x1234567890123456789012345678901234567890";
      const dataList = [
        encodeOrderDataListMetadata({ isExpress: true }),
        encodeOrderDataListMetadata({ numberOfParts: 3, twapId: "abcd" }),
      ];

      expect(decodeOrderTwapParams(dataList, plain)).toMatchObject({ numberOfParts: 3, twapId: "abcd" });
    });
  });

  describe("dataList metadata updates", () => {
    it("sets the flag on an existing gmxo entry, leaving other entries untouched", () => {
      const dataList = [REQUEST_ID_ENTRY, encodeOrderDataListMetadata({ numberOfParts: 5, twapId: "a1b2" })];

      const withExpress = setOrderDataListMetadataIsExpress(dataList, true);
      expect(withExpress[0]).toEqual(REQUEST_ID_ENTRY);
      expect(findOrderDataListMetadata(withExpress)).toMatchObject({ isExpress: true, isJit: false });

      const withJit = setOrderDataListMetadataIsJit(withExpress, true);
      expect(findOrderDataListMetadata(withJit)).toMatchObject({ isExpress: true, isJit: true });
    });

    it("appends metadata when absent and preserves requestId", () => {
      const dataList = [REQUEST_ID_ENTRY];
      const withExpress = setOrderDataListMetadataIsExpress(dataList, true);
      const withJit = setOrderDataListMetadataIsJit(withExpress, true);
      const withSource = setOrderDataListMetadataSource(withJit, UI_FEE_SOURCE_API);

      expect(withSource[0]).toEqual(REQUEST_ID_ENTRY);
      expect(withSource).toHaveLength(2);
      expect(findOrderDataListMetadata(withSource)).toEqual({
        twapId: "0000",
        numberOfParts: 0,
        source: UI_FEE_SOURCE_API,
        isJit: true,
        isExpress: true,
      });
    });
  });
});
