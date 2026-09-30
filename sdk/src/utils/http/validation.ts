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
