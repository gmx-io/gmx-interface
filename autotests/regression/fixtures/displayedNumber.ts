export function displayedNumber(text: string) {
  const match = text
    .replaceAll("$", "")
    .replaceAll(",", "")
    .replaceAll("−", "-")
    .replaceAll(/\s/g, "")
    .match(/([+-]?\d+(?:\.\d+)?)([kmbt])?/i);
  if (!match) return NaN;
  const multiplier = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 }[match[2]?.toLowerCase()] ?? 1;
  return Number(match[1]) * multiplier;
}
