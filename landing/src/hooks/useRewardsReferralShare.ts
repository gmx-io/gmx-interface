import { type RefObject, useRef } from "react";

import { getShareURL, uploadElementAsShareImage } from "lib/shareImage";

export function useRewardsReferralShare({
  imageRef,
  code,
  cardKey,
}: {
  imageRef: RefObject<HTMLDivElement>;
  code: string | undefined;
  cardKey: string;
}) {
  const cached = useRef<{ key: string; link: Promise<string> }>();

  return function getShareLink(): Promise<string> {
    if (cached.current?.key === cardKey) return cached.current.link;

    const element = imageRef.current;
    if (!element || !code) return Promise.reject(new Error("Referral card is not ready"));

    const link = uploadElementAsShareImage(element, {
      canvasWidth: 600,
      canvasHeight: Math.round((600 * element.offsetHeight) / element.offsetWidth),
      style: { transform: "none" },
    }).then(({ id }) => getShareURL(id, code, "rewards"));
    cached.current = { key: cardKey, link };
    void link.catch(() => {
      if (cached.current?.link === link) cached.current = undefined;
    });
    return link;
  };
}
