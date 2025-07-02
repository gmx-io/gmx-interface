import { isAddress } from "viem";

const VERSION = "01";
const PREFIX = "0xff";

/**
 * Ui fee receiver structure:
 * 0..3 bytes - PREFIX (0xff)
 * 4..5 bytes - isExpress flag (00 = false, 01 = true)
 * 6..33 bytes - buffer/reserved space (28 bytes)
 * 34..35 bytes - numberOfParts (hex encoded)
 * 36..39 bytes - twapId (hex encoded)
 * 40..41 bytes - VERSION (01)
 *
 */

export function generateTwapId() {
  return Math.floor(Math.random() * 256 * 256)
    .toString(16)
    .padStart(4, "0");
}

export function createTwapUiFeeReceiver({ numberOfParts }: { numberOfParts: number }) {
  const twapId = generateTwapId();

  const numberOfPartsInHex = numberOfParts.toString(16).padStart(2, "0");

  return `${PREFIX}00${"00".repeat(14)}${numberOfPartsInHex}${twapId}${VERSION}`;
}

export function decodeTwapUiFeeReceiver(address: string): { twapId: string; numberOfParts: number } | void {
  const twapId = address.slice(36, 40);

  if (!isValidTwapUiFeeReceiver(address) || twapId === "0000") {
    return;
  }

  const numberOfParts = parseInt(address.slice(34, 36), 16);

  return { twapId, numberOfParts };
}

export function isValidTwapUiFeeReceiver(address: string) {
  return isAddress(address) && address.toLowerCase().startsWith(PREFIX.toLowerCase());
}

export function setUiFeeReceiverIsExpress(uiFeeReceiver: string, isExpress: boolean): string {
  const isExpressInHex = isExpress ? "01" : "00";

  // Replace the byte at position 4-6 (after PREFIX) with the express flag
  // Structure: PREFIX + expressFlag + restOfData (keeping total length at 40 chars)
  return `${PREFIX}${isExpressInHex}${uiFeeReceiver.slice(6)}`;
}
