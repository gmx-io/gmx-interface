import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

function isEmptyValue(value: any): boolean {
  if (
    !value ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" && Object.keys(value).length === 0)
  ) {
    return true;
  }

  return false;
}

describe("ABI files validation", () => {
  const abiDir = path.join(__dirname, "..");
  const abiFiles = fs.readdirSync(abiDir).filter((file) => file.endsWith(".json"));

  it.each(abiFiles)("validates %s doesn't contain metadata or bytecode", (fileName) => {
    const filePath = path.join(abiDir, fileName);
    const fileContent = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    const abiContent = Array.isArray(fileContent) ? fileContent : fileContent.abi;

    expect(abiContent).toBeDefined();
    expect(Array.isArray(abiContent)).toBe(true);

    const unnecessaryFields = [
      "metadata",
      "bytecode",
      "deployedBytecode",
      "sourceMap",
      "deployedSourceMap",
      "source",
      "ast",
      "schemaVersion",
      "updatedAt",
    ];

    const foundFields = unnecessaryFields.filter((field) => !isEmptyValue(fileContent[field]));

    expect(foundFields).toHaveLength(0);
  });
});
