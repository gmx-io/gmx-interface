import { t } from "@lingui/macro";

export function getPageTitle(data: string) {
  const title = t`Decentralized Perpetual Exchange | GMX`;
  return `${data} | ${title}`;
}
