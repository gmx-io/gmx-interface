import { strToU8, zipSync } from "fflate";

export function createZipBlob(files: { name: string; contents: string }[]): Blob {
  const entries = Object.fromEntries(files.map((file) => [file.name, strToU8(file.contents)]));
  const bytes = zipSync(entries, { level: 6 });
  return new Blob([bytes], { type: "application/zip" });
}
