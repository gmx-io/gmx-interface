import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { createZipBlob } from "./zip";

describe("createZipBlob", () => {
  it("creates one ZIP with each requested CSV", async () => {
    const blob = createZipBlob([
      { name: "universal.csv", contents: "a,b\r\n1,2\r\n" },
      { name: "margin.csv", contents: "c,d\r\n3,4\r\n" },
    ]);
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));

    expect(Object.keys(files)).toEqual(["universal.csv", "margin.csv"]);
    expect(strFromU8(files["universal.csv"])).toBe("a,b\r\n1,2\r\n");
    expect(strFromU8(files["margin.csv"])).toBe("c,d\r\n3,4\r\n");
  });
});
