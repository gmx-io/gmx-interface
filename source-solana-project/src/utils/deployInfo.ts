import { t } from '@lingui/macro';

export function formatUiDeployTime(
  iso: string
): { datePart: string; timePart: string } | null {
  if (!iso) {
    return null;
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const day = date.getUTCDate();
  const month = date.toLocaleString('en-GB', {
    month: 'long',
    timeZone: 'UTC',
  });
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');

  return {
    datePart: `${day} ${month} ${year}`,
    timePart: `${hours}:${minutes}`,
  };
}

export function getUiDeployTooltipText(buildTimeIso: string): string {
  const parts = formatUiDeployTime(buildTimeIso);

  if (!parts) {
    return t`UI deployment time unavailable`;
  }

  return t`UI deployed on ${parts.datePart} at ${parts.timePart} UTC`;
}
