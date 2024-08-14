import { hashData } from "@/lib/hash";

export function hashDataMap<
  R extends Record<string, [dataTypes: string[], dataValues: (string | number | bigint | boolean)[]] | undefined>,
>(
  map: R
): {
  [K in keyof R]: string;
} {
  const result = {};
  for (const key of Object.keys(map)) {
    if (!map[key]) {
      continue;
    }

    const [dataTypes, dataValues] = map[key]!;

    result[key] = hashData(dataTypes, dataValues);
  }

  return result as {
    [K in keyof R]: string;
  };
}
