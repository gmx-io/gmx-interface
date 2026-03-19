import { isAddress } from "viem";

const VERSION = "01";
const PREFIX = "0xff0000";
const JIT_BYTE_START = 15 * 2;
const JIT_BYTE_END = 16 * 2;
const EXPRESS_BYTE_START = 16 * 2;
const EXPRESS_BYTE_END = 17 * 2;

/**
 * Ui fee receiver structure:
 * 0-2 (3) bytes (0-5 chars) - PREFIX
 * 3-13 (11) bytes (6-27 chars) - free buffer
 * 14 (1) byte (28-29 chars) - isJit flag
 * 15 (1) byte (30-31 chars) - isExpress flag
 * 16 (1) byte (32-33 chars) - numberOfParts (hex encoded)
 * 17-18 (2) bytes (34-37 chars) - twapId
 * 19 (1) byte (38-39 chars) - VERSION
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
  const flagsHex = "00";

  return `${PREFIX}${buffer}${flagsHex}${numberOfPartsInHex}${twapId}${VERSION}`;
}

export function decodeTwapUiFeeReceiver(
  address: string
): { twapId: string; numberOfParts: number; isExpress: boolean; isJit: boolean } | void {
  const byteString = address.slice(2);
  const twapId = byteString.slice(34, 38);
  const isExpress = getUiFeeReceiverByte(address, EXPRESS_BYTE_START, EXPRESS_BYTE_END) === "01";
  const isJit = getUiFeeReceiverByte(address, JIT_BYTE_START, JIT_BYTE_END) === "01";

  if (!isValidTwapUiFeeReceiver(address) || twapId === "0000") {
    return;
  }

  const numberOfParts = parseInt(byteString.slice(32, 34), 16);

  return { twapId, numberOfParts, isExpress, isJit };
}

export function isValidTwapUiFeeReceiver(address: string) {
  return isAddress(address) && address.toLowerCase().startsWith(PREFIX.toLowerCase());
}

export function setUiFeeReceiverIsExpress(uiFeeReceiver: string, isExpress: boolean): string {
  return setUiFeeReceiverByte(uiFeeReceiver, EXPRESS_BYTE_START, EXPRESS_BYTE_END, isExpress);
}

export function setUiFeeReceiverIsJit(uiFeeReceiver: string, isJit: boolean): string {
  return setUiFeeReceiverByte(uiFeeReceiver, JIT_BYTE_START, JIT_BYTE_END, isJit);
}

function getUiFeeReceiverByte(uiFeeReceiver: string, start: number, end: number) {
  return uiFeeReceiver.slice(start, end);
}

function setUiFeeReceiverByte(uiFeeReceiver: string, start: number, end: number, enabled: boolean): string {
  const value = enabled ? "01" : "00";

  return `${uiFeeReceiver.slice(0, start)}${value}${uiFeeReceiver.slice(end)}`;
}
