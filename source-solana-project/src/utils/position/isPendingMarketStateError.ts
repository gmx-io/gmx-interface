const PENDING_MARKET_STATE_ERRORS = [
  'calculating funding fee amount',
  'invalid latest borrowing factor',
];

export function isPendingMarketStateError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return PENDING_MARKET_STATE_ERRORS.some((pendingError) =>
    message.includes(pendingError)
  );
}
