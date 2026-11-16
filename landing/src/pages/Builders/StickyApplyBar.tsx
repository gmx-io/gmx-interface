import { Trans } from "@lingui/macro";
import cx from "classnames";
import { useEffect, useState } from "react";

import { BUILDER_PROGRAM_APPLY_URL } from "./constants";

const HEADER_HEIGHT_PX = 68;

type Props = {
  heroButtonsRef: React.RefObject<HTMLDivElement>;
  ctaRef: React.RefObject<HTMLDivElement>;
};

export function StickyApplyBar({ heroButtonsRef, ctaRef }: Props) {
  const [isPastHeroButtons, setIsPastHeroButtons] = useState(false);
  const [isCtaVisible, setIsCtaVisible] = useState(false);

  useEffect(() => {
    const heroButtons = heroButtonsRef.current;
    const cta = ctaRef.current;
    if (!heroButtons || !cta) {
      return;
    }

    const heroButtonsObserver = new IntersectionObserver(
      ([entry]) => {
        const headerBottom = entry.rootBounds?.top ?? HEADER_HEIGHT_PX;
        setIsPastHeroButtons(!entry.isIntersecting && entry.boundingClientRect.bottom <= headerBottom);
      },
      { rootMargin: `-${HEADER_HEIGHT_PX}px 0px 0px 0px` }
    );
    const ctaObserver = new IntersectionObserver(([entry]) => setIsCtaVisible(entry.isIntersecting));

    heroButtonsObserver.observe(heroButtons);
    ctaObserver.observe(cta);

    return () => {
      heroButtonsObserver.disconnect();
      ctaObserver.disconnect();
    };
  }, [heroButtonsRef, ctaRef]);

  const isHidden = !isPastHeroButtons || isCtaVisible;

  return (
    <div
      className={cx(
        "duration-180 fixed bottom-0 left-0 z-20 w-full border-t-1/2 border-slate-600 bg-slate-900/80 px-16 py-12 text-white backdrop-blur-[10px] transition-transform sm:px-40",
        isHidden ? "translate-y-full" : "translate-y-0"
      )}
    >
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-12">
        <span className="leading-body-sm hidden text-14 font-medium -tracking-[0.448px] sm:block">
          <Trans>Build on GMX. Get paid on every trade.</Trans>
        </span>
        <a
          href={BUILDER_PROGRAM_APPLY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-landing w-full rounded-8 px-16 py-10 text-center text-14 leading-[16px] sm:w-auto"
        >
          <Trans>Apply to program</Trans>
        </a>
      </div>
    </div>
  );
}
