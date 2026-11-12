import { getString } from "utils/objects";

export type ApiFieldType = "bigint" | "boolean" | "number" | "numberOrNull" | "string";

export type ApiFieldSpec = {
  name: string;
  type: ApiFieldType;
};

type ApiFieldParams = {
  record: Record<string, unknown>;
  name: string;
  endpoint: string;
};

export function readApiString({ record, name, endpoint }: ApiFieldParams): string {
  const value = getString(record[name]);
  if (value === undefined) {
    throw new Error(`${endpoint}: expected string field "${name}"`);
  }
  return value;
}

export function readApiUnsignedBigInt({ record, name, endpoint }: ApiFieldParams): bigint {
  const value = record[name];
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return BigInt(value);
  }
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) {
    return BigInt(value);
  }
  throw new Error(`${endpoint}: expected bigint field "${name}"`);
}

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
