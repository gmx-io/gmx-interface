import { isAddress } from "viem";

const VERSION = "01";
const PREFIX = "0xff";

export function createTwapUiFeeReceiver({ numberOfParts }: { numberOfParts: number }) {
  const twapId = Math.floor(Math.random() * 256 * 256)
    .toString(16)
    .padStart(4, "0");

  const numberOfPartsInHex = numberOfParts.toString(16).padStart(2, "0");

  return `${PREFIX}00${"00".repeat(14)}${numberOfPartsInHex}${twapId}${VERSION}`;
}

export function decodeTwapUiFeeReceiver(
  address: string
): { twapId: undefined; numberOfParts: undefined } | { twapId: string; numberOfParts: number } {
  const twapId = address.slice(36, 40);
  if (!isValidTwapUiFeeReceiver(address) || twapId === "0000") {
    return { twapId: undefined, numberOfParts: undefined };
  }

  const numberOfParts = parseInt(address.slice(34, 36), 16);

  return { twapId, numberOfParts };
}

export function isValidTwapUiFeeReceiver(address: string) {
  return isAddress(address) && address.toLowerCase().startsWith(PREFIX.toLowerCase());
}
