import { type Hex, isAddress, padHex, stringToHex } from "viem";

const PREFIX = "0xff0000";
const SOURCE_BYTE_START = 4 * 2;
const SOURCE_BYTE_END = 5 * 2;
const JIT_BYTE_START = 15 * 2;
const JIT_BYTE_END = 16 * 2;
const EXPRESS_BYTE_START = 16 * 2;
const EXPRESS_BYTE_END = 17 * 2;

export const UI_FEE_SOURCE_UI = "00";
export const UI_FEE_SOURCE_API = "01";

export function generateTwapId() {
  return (Math.floor(Math.random() * (256 * 256 - 1)) + 1).toString(16).padStart(4, "0");
}

export function decodeTwapUiFeeReceiver(
  address: string
): { twapId: string; numberOfParts: number; isExpress: boolean; isJit: boolean; source: string } | void {
  const byteString = address.slice(2);
  const twapId = byteString.slice(34, 38);
  const isExpress = getUiFeeReceiverByte(address, EXPRESS_BYTE_START, EXPRESS_BYTE_END) === "01";
  const isJit = getUiFeeReceiverByte(address, JIT_BYTE_START, JIT_BYTE_END) === "01";
  const source = getUiFeeReceiverByte(address, SOURCE_BYTE_START, SOURCE_BYTE_END);

  if (!isValidTwapUiFeeReceiver(address) || twapId === "0000") {
    return;
  }

  const numberOfParts = parseInt(byteString.slice(32, 34), 16);

  return { twapId, numberOfParts, isExpress, isJit, source };
}

export function isValidTwapUiFeeReceiver(address: string) {
  return isAddress(address) && address.toLowerCase().startsWith(PREFIX.toLowerCase());
}

function getUiFeeReceiverByte(uiFeeReceiver: string, start: number, end: number) {
  return uiFeeReceiver.slice(start, end);
}

export const DATA_LIST_METADATA_PREFIX = "gmxo";
export const DATA_LIST_METADATA_VERSION = "1";
const EMPTY_TWAP_ID = "0000";

export type OrderDataListMetadata = {
  twapId: string;
  numberOfParts: number;
  source: string;
  isJit: boolean;
  isExpress: boolean;
};

export function encodeOrderDataListMetadata({
  numberOfParts = 0,
  twapId = EMPTY_TWAP_ID,
  source = UI_FEE_SOURCE_UI,
  isJit = false,
  isExpress = false,
}: {
  numberOfParts?: number;
  twapId?: string;
  source?: string;
  isJit?: boolean;
  isExpress?: boolean;
}): Hex {
  if (!Number.isSafeInteger(numberOfParts) || numberOfParts < 0) {
    throw new Error(`Order metadata numberOfParts must be a non-negative integer, got ${numberOfParts}`);
  }

  if (!/^[0-9a-fA-F]{4}$/.test(twapId)) {
    throw new Error(`Order metadata twapId must be 4 hex characters, got ${twapId}`);
  }

  if (source !== UI_FEE_SOURCE_UI && source !== UI_FEE_SOURCE_API) {
    throw new Error(`Unsupported order metadata source: ${source}`);
  }

  const hasTwapId = twapId !== EMPTY_TWAP_ID;
  const hasNumberOfParts = numberOfParts > 0;
  if (hasNumberOfParts !== hasTwapId) {
    throw new Error("Order metadata must provide both TWAP numberOfParts and a non-zero twapId");
  }

  const ascii = [
    DATA_LIST_METADATA_PREFIX,
    DATA_LIST_METADATA_VERSION,
    numberOfParts.toString(10),
    twapId,
    source,
    isJit ? "1" : "0",
    isExpress ? "1" : "0",
  ].join(":");
  const hex = stringToHex(ascii);

  if ((hex.length - 2) / 2 > 32) {
    throw new Error(`Order metadata exceeds bytes32: ${ascii}`);
  }

  return padHex(hex, { size: 32, dir: "right" });
}

export function decodeOrderDataListMetadata(entry: string): OrderDataListMetadata | undefined {
  if (!/^0x[0-9a-fA-F]{64}$/.test(entry)) {
    return undefined;
  }

  const ascii = bytes32MetadataToAscii(entry);
  if (ascii === undefined) {
    return undefined;
  }

  const parts = ascii.split(":");
  const version = parts[1];
  const numberOfPartsRaw = parts[2];
  const twapId = parts[3];
  const source = parts[4] ?? UI_FEE_SOURCE_UI;
  const isJit = parts[5];
  const isExpress = parts[6];

  if (
    parts.length < 4 ||
    parts.length > 7 ||
    parts[0] !== DATA_LIST_METADATA_PREFIX ||
    version !== DATA_LIST_METADATA_VERSION ||
    !/^(0|[1-9]\d*)$/.test(numberOfPartsRaw) ||
    !/^[0-9a-fA-F]{4}$/.test(twapId) ||
    (source !== UI_FEE_SOURCE_UI && source !== UI_FEE_SOURCE_API) ||
    (isJit !== undefined && isJit !== "0" && isJit !== "1") ||
    (isExpress !== undefined && isExpress !== "0" && isExpress !== "1")
  ) {
    return undefined;
  }

  const numberOfParts = Number(numberOfPartsRaw);
  const hasNumberOfParts = numberOfParts > 0;
  const hasTwapId = twapId !== EMPTY_TWAP_ID;
  if (!Number.isSafeInteger(numberOfParts) || hasNumberOfParts !== hasTwapId) {
    return undefined;
  }

  return {
    twapId,
    numberOfParts,
    source,
    isJit: isJit === "1",
    isExpress: isExpress === "1",
  };
}

export function findOrderDataListMetadata(dataList: string[] | undefined): OrderDataListMetadata | undefined {
  if (!dataList) {
    return undefined;
  }

  for (const entry of dataList) {
    const decoded = decodeOrderDataListMetadata(entry);
    if (decoded) {
      return decoded;
    }
  }

  return undefined;
}

export function decodeOrderTwapParams(
  dataList: string[] | undefined,
  uiFeeReceiver: string
): OrderDataListMetadata | undefined {
  if (dataList) {
    for (const entry of dataList) {
      const metadata = decodeOrderDataListMetadata(entry);
      if (metadata && metadata.numberOfParts > 0 && metadata.twapId !== EMPTY_TWAP_ID) {
        return metadata;
      }
    }
  }

  return decodeTwapUiFeeReceiver(uiFeeReceiver) ?? undefined;
}

export function setOrderDataListMetadataIsExpress(dataList: string[], isExpress: boolean): string[] {
  return updateOrderDataListMetadata(dataList, { isExpress });
}

export function setOrderDataListMetadataIsJit(dataList: string[], isJit: boolean): string[] {
  return updateOrderDataListMetadata(dataList, { isJit });
}

export function setOrderDataListMetadataSource(dataList: string[], source: string): string[] {
  return updateOrderDataListMetadata(dataList, { source });
}

function updateOrderDataListMetadata(
  dataList: string[],
  patch: Partial<Pick<OrderDataListMetadata, "source" | "isJit" | "isExpress">>
): string[] {
  let found = false;
  const updatedDataList = dataList.map((entry) => {
    const decoded = decodeOrderDataListMetadata(entry);
    if (!decoded) {
      return entry;
    }

    found = true;
    return encodeOrderDataListMetadata({ ...decoded, ...patch });
  });

  return found ? updatedDataList : [...dataList, encodeOrderDataListMetadata(patch)];
}

function bytes32MetadataToAscii(entry: string): string | undefined {
  const hex = entry.slice(2);

  let result = "";
  for (let i = 0; i + 2 <= hex.length; i += 2) {
    const code = parseInt(hex.slice(i, i + 2), 16);
    if (code === 0) {
      return /^(00)+$/.test(hex.slice(i)) ? result : undefined;
    }
    result += String.fromCharCode(code);
  }

  return result;
}
