import { isAddress } from "viem";

const VERSION = "01";
const PREFIX = "0xff0000";

/**
 * Ui fee receiver structure:
 * 0..3 bytes (0..7 chars) - PREFIX
 * 4..14 bytes (8..27 chars) - 12 bytes buffer
 * 15 byte (27..29 chars) - isExpress flag
 * 16 byte (30..32 chars) - numberOfParts (hex encoded)
 * 17..18 bytes (32..38 chars) - twapId
 * 19 byte (37..39 chars) - VERSION
 *
 * Total: 20 bytes (40 hex characters)
 */

export function generateTwapId() {
  return Math.floor(Math.random() * 256 * 256)
    .toString(16)
    .padStart(4, "0");
}

export function createTwapUiFeeReceiver({ numberOfParts }: { numberOfParts: number }) {
  const twapId = generateTwapId();

  const numberOfPartsInHex = numberOfParts.toString(16).padStart(2, "0");
  const isExpressHex = "00";

  const buffer = "00".repeat(12);

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

  return `${uiFeeReceiver.slice(0, 27)}${isExpressInHex}${uiFeeReceiver.slice(29)}`;
}
