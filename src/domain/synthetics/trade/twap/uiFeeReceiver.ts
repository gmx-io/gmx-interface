import { isAddress } from "viem";

const VERSION = "01";
const PREFIX = "0xff";

export function createTwapUiFeeReceiver() {
  const twapId = Math.floor(Math.random() * 256 * 256)
    .toString(16)
    .padStart(4, "0");

  return PREFIX + "00".repeat(16) + twapId + VERSION;
}

export function decodeTwapUiFeeReceiver(address: string): { twapId: string | undefined } {
  const twapId = address.slice(34, 38);

  if (!isValidTwapUiFeeReceiver(address) || twapId === "0000") {
    return { twapId: undefined };
  }

  return { twapId };
}

export function isValidTwapUiFeeReceiver(address: string) {
  return isAddress(address) && address.toLowerCase().startsWith(PREFIX.toLowerCase());
}
