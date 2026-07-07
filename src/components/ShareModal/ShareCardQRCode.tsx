import cx from "classnames";
import { QRCodeSVG } from "qrcode.react";

import { getHomeUrl } from "lib/legacy";
import { useBreakpoints } from "lib/useBreakpoints";

export function ShareCardQRCode({ code, className }: { code: string | undefined; className?: string }) {
  const { isMobile } = useBreakpoints();
  const homeURL = getHomeUrl();
  const qrCodeUrl = code ? `${homeURL}/#/?ref=${code}` : `${homeURL}`;

  return <QRCodeSVG size={isMobile ? 40 : 52} value={qrCodeUrl} className={cx("rounded-4 bg-white p-4", className)} />;
}
