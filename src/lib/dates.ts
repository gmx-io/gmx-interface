import { format as formatDateFn } from "date-fns";

export function formatDateTime(time: number) {
  return formatDateFn(time * 1000, "dd MMM yyyy, h:mm a");
}

export function formatDate(time: number) {
  return formatDateFn(time * 1000, "dd MMM yyyy");
}

export function getTimeRemaining(time: number) {
  const now = parseInt(String(Date.now() / 1000));
  if (time < now) {
    return "0h 0m";
  }
  const diff = time - now;
  const hours = parseInt(String(diff / (60 * 60)));
  const minutes = parseInt(String((diff - hours * 60 * 60) / 60));
  return `${hours}h ${minutes}m`;
}

export function isValidTimestamp(timestamp: any) {
  return new Date(timestamp).getTime() > 0;
}
