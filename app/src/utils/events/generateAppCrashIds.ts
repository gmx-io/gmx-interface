export function generateAppCrashIds() {
  const traceId = crypto.randomUUID();
  const hex = traceId.replace(/-/g, '').slice(0, 6).toUpperCase();
  const errorCode = `APP_ERROR-${hex}`.toUpperCase();
  return { traceId, errorCode };
}
