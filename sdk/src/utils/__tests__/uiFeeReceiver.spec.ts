import { isAddress } from "viem";
import { describe, it, expect } from "vitest";

import {
  createTwapUiFeeReceiver,
  decodeTwapUiFeeReceiver,
  setUiFeeReceiverIsExpress,
  setUiFeeReceiverIsJit,
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
        twapId: "1234",
        numberOfParts: 10,
      });
    });

    it("should correctly decode isJit", () => {
      expect(decodeTwapUiFeeReceiver("0xff0000000000000000000000000001000a123401")).toEqual({
        isExpress: false,
        isJit: true,
        twapId: "1234",
        numberOfParts: 10,
      });
    });

    it("should return the twapId and numberOfParts if the uiFeeReceiver is valid twap", () => {
      expect(decodeTwapUiFeeReceiver("0xff0000000000000000000000000000000a123401")).toEqual({
        isExpress: false,
        isJit: false,
        twapId: "1234",
        numberOfParts: 10,
      });

      expect(decodeTwapUiFeeReceiver("0xff000000000000000000000000000000153a4f01")).toEqual({
        isExpress: false,
        isJit: false,
        twapId: "3a4f",
        numberOfParts: 21,
      });
    });
  });

  describe("createTwapUiFeeReceiver", () => {
    it("should create a valid address", () => {
      expect(isAddress(createTwapUiFeeReceiver({ numberOfParts: 10 }))).toBeTruthy();
    });

    it("should correctly encode numberOfParts", () => {
      expect(decodeTwapUiFeeReceiver(createTwapUiFeeReceiver({ numberOfParts: 10 }))?.numberOfParts).toEqual(10);
      expect(decodeTwapUiFeeReceiver(createTwapUiFeeReceiver({ numberOfParts: 21 }))?.numberOfParts).toEqual(21);
    });

    it("should correctly encode twapId with length 4", () => {
      expect(decodeTwapUiFeeReceiver(createTwapUiFeeReceiver({ numberOfParts: 10 }))?.twapId).toHaveLength(4);
      expect(decodeTwapUiFeeReceiver(createTwapUiFeeReceiver({ numberOfParts: 10 }))?.twapId).toHaveLength(4);
      expect(decodeTwapUiFeeReceiver(createTwapUiFeeReceiver({ numberOfParts: 21 }))?.twapId).toHaveLength(4);
    });

    it("should correctly encode twapId as hex", () => {
      expect(
        parseInt(decodeTwapUiFeeReceiver(createTwapUiFeeReceiver({ numberOfParts: 10 }))?.twapId ?? "", 16)
      ).not.toBeNaN();
      expect(
        parseInt(decodeTwapUiFeeReceiver(createTwapUiFeeReceiver({ numberOfParts: 21 }))?.twapId ?? "", 16)
      ).not.toBeNaN();
    });
  });
});

describe("setUiFeeReceiverIsExpress", () => {
  it("should correctly set isExpress for simple uiFeeReceiver", () => {
    expect(setUiFeeReceiverIsExpress("0xff00000000000000000000000000000000000001", true)).toEqual(
      "0xff00000000000000000000000000000100000001"
    );
    expect(setUiFeeReceiverIsExpress("0xff00000000000000000000000000000000000001", false)).toEqual(
      "0xff00000000000000000000000000000000000001"
    );
  });

  it("should correctly set isExpress for twap uiFeeReceiver", () => {
    expect(setUiFeeReceiverIsExpress("0xff0000000000000000000000000000000a123401", true)).toEqual(
      "0xff0000000000000000000000000000010a123401"
    );
    expect(setUiFeeReceiverIsExpress("0xff0000000000000000000000000000000a123401", false)).toEqual(
      "0xff0000000000000000000000000000000a123401"
    );
  });
});

describe("setUiFeeReceiverIsJit", () => {
  it("should correctly set isJit for simple uiFeeReceiver", () => {
    expect(setUiFeeReceiverIsJit("0xff00000000000000000000000000000000000001", true)).toEqual(
      "0xff00000000000000000000000000010000000001"
    );
    expect(setUiFeeReceiverIsJit("0xff00000000000000000000000000010000000001", false)).toEqual(
      "0xff00000000000000000000000000000000000001"
    );
  });

  it("should preserve isExpress when setting isJit", () => {
    expect(setUiFeeReceiverIsJit("0xff0000000000000000000000000000010a123401", true)).toEqual(
      "0xff0000000000000000000000000001010a123401"
    );
  });

  it("should correctly set isJit for twap uiFeeReceiver", () => {
    expect(setUiFeeReceiverIsJit("0xff0000000000000000000000000000000a123401", true)).toEqual(
      "0xff0000000000000000000000000001000a123401"
    );
    expect(setUiFeeReceiverIsJit("0xff0000000000000000000000000001000a123401", false)).toEqual(
      "0xff0000000000000000000000000000000a123401"
    );
  });
});
