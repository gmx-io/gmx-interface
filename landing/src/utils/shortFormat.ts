export function shortFormat(value: number): string {
  if (value < 1000) {
    return value.toString();
  }
  if (value < 1000000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return `${(value / 1000000).toFixed(0)}M`;
}
