import { getRecord, getString } from "utils/objects";

export type ApiFieldType = "bigint" | "boolean" | "number" | "numberOrNull" | "string";

export type ApiFieldSpec = {
  name: string;
  type: ApiFieldType;
};

export function assertApiRecords(value: unknown, endpoint: string): asserts value is Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid ${endpoint} response: expected an array`);
  }

  for (let index = 0; index < value.length; index++) {
    const record = value[index];

    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new Error(`Invalid ${endpoint} response at index ${index}: expected an object`);
    }
  }
}

export function assertApiFields(
  record: Record<string, unknown>,
  fields: readonly ApiFieldSpec[],
  endpoint: string,
  index: number
) {
  const identifier =
    typeof record.marketTokenAddress === "string"
      ? ` for market ${record.marketTokenAddress}`
      : typeof record.key === "string"
        ? ` for ${record.key}`
        : ` at index ${index}`;

  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(record, field.name)) {
      throw new Error(`Invalid ${endpoint} response${identifier}: missing ${field.name}`);
    }

    const value = record[field.name];
    const hasExpectedType =
      field.type === "numberOrNull" ? value === null || typeof value === "number" : typeof value === field.type;

    if (!hasExpectedType) {
      throw new Error(`Invalid ${endpoint} response${identifier}: ${field.name} must be ${field.type}`);
    }
  }
}

export function getApiFieldReaders(endpoint: string) {
  const fail = (name: string, expected: string): never => {
    throw new Error(`${endpoint}: expected ${expected} field "${name}"`);
  };
  const readString = (value: unknown, name: string): string => getString(value) ?? fail(name, "string");

  return {
    fail,
    readString,
    readNullableString: (value: unknown, name: string): string | undefined =>
      value === null ? undefined : readString(value, name),
    readBoolean: (value: unknown, name: string): boolean =>
      typeof value === "boolean" ? value : fail(name, "boolean"),
    readUint: (value: unknown, name: string): number =>
      typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : fail(name, "number"),
    readBigInt: (value: unknown, name: string): bigint =>
      (typeof value === "string" && /^\d+$/.test(value)) ||
      (typeof value === "number" && Number.isSafeInteger(value) && value >= 0)
        ? BigInt(value)
        : fail(name, "bigint"),
    readRecord: (value: unknown, name: string): Record<string, unknown> => getRecord(value) ?? fail(name, "object"),
  };
}
