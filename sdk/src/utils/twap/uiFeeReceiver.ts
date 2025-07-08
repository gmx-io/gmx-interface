import { isAddress } from "viem";

const VERSION = "01";
const PREFIX = "0xff0000";

/**
 * Ui fee receiver structure:
 * 0-3 (4) bytes (0-7 chars) - PREFIX
 * 4-15 (12) bytes (8-32 chars) - 12 bytes buffer
 * 16 (1) byte (33-34 chars) - isExpress flag
 * 17 (1) byte (35-36 chars) - numberOfParts (hex encoded)
 * 18-19 (2) bytes (37-40 chars) - twapId
 * 20 (1) byte (41-42 chars) - VERSION
 *
 * Total: 0x + 20 bytes (41 hex characters)
 */
export function generateTwapId() {
  return Math.floor(Math.random() * 256 * 256)
    .toString(16)
    .padStart(4, "0");
}

export function createTwapUiFeeReceiver({ numberOfParts }: { numberOfParts: number }) {
  const twapId = generateTwapId();

  const numberOfPartsInHex = numberOfParts.toString(16).padStart(2, "0");

  const buffer = "00".repeat(12);
  const isExpressHex = "00";

  return `${PREFIX}${buffer}${isExpressHex}${numberOfPartsInHex}${twapId}${VERSION}`;
}

export function decodeTwapUiFeeReceiver(
  address: string
): { twapId: string; numberOfParts: number; isExpress: boolean } | void {
  const byteString = address.slice(2);
  const twapId = byteString.slice(34, 38);
  const isExpress = byteString.slice(30, 32) === "01";

  if (!isValidTwapUiFeeReceiver(address) || twapId === "0000") {
    return;
  }

  const numberOfParts = parseInt(byteString.slice(32, 34), 16);

  return { twapId, numberOfParts, isExpress };
}

export function isValidTwapUiFeeReceiver(address: string) {
  return isAddress(address) && address.toLowerCase().startsWith(PREFIX.toLowerCase());
}

export function setUiFeeReceiverIsExpress(uiFeeReceiver: string, isExpress: boolean): string {
  const isExpressInHex = isExpress ? "01" : "00";

  return `${uiFeeReceiver.slice(0, 16 * 2)}${isExpressInHex}${uiFeeReceiver.slice(17 * 2)}`;
}
