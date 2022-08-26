import { format as formatDateFn } from "date-fns";

export function formatDateTime(time) {
  return formatDateFn(time * 1000, "dd MMM yyyy, h:mm a");
}

export function getTimeRemaining(time) {
  const now = parseInt(Date.now() / 1000);
  if (time < now) {
    return "0h 0m";
  }
  const diff = time - now;
  const hours = parseInt(diff / (60 * 60));
  const minutes = parseInt((diff - hours * 60 * 60) / 60);
  return `${hours}h ${minutes}m`;
}

export function formatDate(time) {
  return formatDateFn(time * 1000, "dd MMM yyyy");
}
