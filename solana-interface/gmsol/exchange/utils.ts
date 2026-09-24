export function getPositionSide(kind: number): 'long' | 'short' | undefined {
  if (kind === 1) return 'long';
  if (kind === 2) return 'short';
}
