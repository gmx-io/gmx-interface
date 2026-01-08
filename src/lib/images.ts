import mapKeys from "lodash/mapKeys";

// Resolves all images in the folder that match the pattern and store them as `fileName -> path` pairs
const imageStaticMap = mapKeys(
  import.meta.glob("img/**/*.*", {
    query: "?url",
    import: "default",
    eager: true,
  }),
  (_, key) => key.split("/").pop()
);

export function importImage(name: string | undefined): string {
  if (!name) {
    throw new Error("Image name is required");
  }
  const sizeSuffixRegex = /_(?:24|40)\.svg$/;
  const candidates = sizeSuffixRegex.test(name) ? [name.replace(sizeSuffixRegex, ".svg"), name] : [name];

  for (const candidate of candidates) {
    if (candidate in imageStaticMap) {
      return imageStaticMap[candidate] as string;
    }
  }

  for (const candidate of candidates) {
    const pngCandidate = candidate.replace(/\.svg$/, ".png");
    if (pngCandidate in imageStaticMap) {
      return imageStaticMap[pngCandidate] as string;
    }
  }

  throw new Error(`Image ${name} not found`);
}
