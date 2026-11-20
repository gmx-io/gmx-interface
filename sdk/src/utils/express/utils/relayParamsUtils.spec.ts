import { encodeAbiParameters, keccak256, serializeErc6492Signature } from "viem";
import { describe, expect, it } from "vitest";

import { getEip6492SignatureWrapperHash } from "./relayParamsUtils";

const FACTORY = "0xba5ed110efdba3d005bfc882d75358acbbb85842";
const FACTORY_CALLDATA = "0x3ffba36f0000000000000000000000000000000000000000000000000000000000000040";
const INNER_SIGNATURE = `0x${"11".repeat(65)}`;

describe("getEip6492SignatureWrapperHash", () => {
  it("hashes the factory and its calldata the way the 2.2.1 contracts do", () => {
    const signature = serializeErc6492Signature({
      address: FACTORY,
      data: FACTORY_CALLDATA,
      signature: INNER_SIGNATURE,
    });

    expect(getEip6492SignatureWrapperHash(signature)).toBe(
      keccak256(encodeAbiParameters([{ type: "address" }, { type: "bytes" }], [FACTORY, FACTORY_CALLDATA]))
    );
  });

  it("throws on a signature without the EIP-6492 wrapper", () => {
    expect(() => getEip6492SignatureWrapperHash(INNER_SIGNATURE)).toThrow("Not an EIP-6492 signature");
  });
});
