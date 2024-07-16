/* global global */

import { TextDecoder, TextEncoder } from "util";
import { ethers } from "ethers";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

jest.spyOn(ethers.Wallet, "createRandom").mockImplementation(() => {
  return {
    address: "0x0000000000000000000000000000000000000000",
    privateKey: "0x0000000000000000000000000000000000000000",
  };
});
