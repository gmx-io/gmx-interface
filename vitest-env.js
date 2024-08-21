/* global global */

import { TextDecoder, TextEncoder } from "util";
import { ethers } from "ethers";
import { vi } from "vitest";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

vi.spyOn(ethers.Wallet, "createRandom").mockImplementation(() => {
  return {
    address: "0x0000000000000000000000000000000000000000",
    privateKey: "0x0000000000000000000000000000000000000000",
  };
});
