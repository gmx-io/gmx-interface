import { t } from "@lingui/macro";
import cx from "classnames";
import { ReactNode, useState } from "react";

import { useBreakpoints } from "lib/useBreakpoints";

import Badge from "components/Badge/Badge";
import Button from "components/Button/Button";
import ExternalLink from "components/ExternalLink/ExternalLink";
import TokenIcon from "components/TokenIcon/TokenIcon";

import ChevronDownIcon from "img/ic_chevron_down.svg?react";

type EarnProductType = "gmx" | "glv" | "gm";

type EarnProductCardProps = {
  type: EarnProductType;
  className?: string;
};

type ProductCopy = {
  tokenSymbol: string;
  badge: ReactNode;
  title: ReactNode;
  description: ReactNode;
  readMoreUrl: string;
  bullets: ReactNode[];
  cta: {
    label: ReactNode;
    to: string;
  };
};

const getCardContent = (type: EarnProductType) => {
  const cardContentByType: Record<EarnProductType, ProductCopy> = {
    gmx: {
      tokenSymbol: "GMX",
      badge: t`Active`,
      title: t`What is GMX?`,
      description: t`GMX is the governance and utility token of the GMX protocol. Staking GMX grants rewards funded by trading fees and protocol buybacks.`,
      readMoreUrl: "https://docs.gmx.io/docs/tokenomics/gmx-token",
      bullets: [
        t`Stake GMX to earn GMX rewards`,
        t`Get rewards from trading fees`,
        t`Participate in protocol governance`,
      ],
      cta: {
        label: t`Buy GMX`,
        to: "/buy_gmx",
      },
    },
    glv: {
      tokenSymbol: "GLV",
      badge: t`Passive`,
      title: t`What is GLV?`,
      description: t`GLV (GMX Liquidity Vault) gives diversified exposure to a basket of GM markets. Vault positions rebalance automatically based on utilization, unlocking higher potential yield versus single pools.`,
      readMoreUrl: "https://docs.gmx.io/docs/providing-liquidity/v2#glv-pools",
      bullets: [
        t`Optimized exposure to the highest utilized pools`,
        t`No active management required`,
        t`Earn trading fees and funding spreads`,
        t`Auto-rebalancing of liquidity`,
        t`Great for passive users`,
      ],
      cta: {
        label: t`Buy GLV`,
        to: "/pools",
      },
    },
    gm: {
      tokenSymbol: "GM",
      badge: t`Autocompound`,
      title: t`What is GM?`,
      description: t`GM is a yield bearing token that tracks liquidity for specific GMX markets. Liquidity providers earn trading, swap, and borrowing fees that automatically compound into their GM balance.`,
      readMoreUrl: "https://docs.gmx.io/docs/providing-liquidity/v2#gm-pools",
      bullets: [
        t`Auto-compounding yield`,
        t`No active management required`,
        t`Become a market maker`,
        t`Support isolated liquidity per market`,
      ],
      cta: {
        label: t`Buy GM`,
        to: "/pools",
      },
    },
  };
  return cardContentByType[type];
};

const BULLET_GRADIENT_STYLE = {
  background: "linear-gradient(180deg, #03D1CFFC 10%, #4E09F8 140%)",
};

export default function EarnProductCard({ type, className }: EarnProductCardProps) {
  const content = getCardContent(type);
  const { isMobile } = useBreakpoints();
  const [isExpanded, setIsExpanded] = useState(false);

  const shouldCollapse = isMobile && !isExpanded;

  return (
    <div
      className={cx(
        "relative flex h-full flex-col gap-16 rounded-8 bg-slate-900 p-20 transition-[max-height] duration-300 ease-in-out",
        className
      )}
    >
      <div className={cx("relative flex flex-col gap-16", { "max-h-[136px] overflow-hidden": shouldCollapse })}>
        <div className="flex items-start justify-between gap-12">
          <TokenIcon symbol={content.tokenSymbol} displaySize={40} importSize={40} className="!rounded-0" />
          <Badge className="bg-fill-accent">{content.badge}</Badge>
        </div>

        <div className="flex flex-col gap-12">
          <h3 className="text-16 font-medium text-typography-primary">{content.title}</h3>
          <p className="text-13 text-typography-secondary">{content.description}</p>
          <ExternalLink href={content.readMoreUrl} variant="icon" className="text-12 font-medium">
            {t`Read more`}
          </ExternalLink>
        </div>

        <div className="border-t-1/2 border-t-slate-600" />

        <div className="text-body-medium flex flex-col gap-8 text-typography-secondary">
          {content.bullets.map((bullet, index) => (
            <div key={index} className="flex items-center gap-8">
              <span className="size-8 shrink-0 rotate-[45deg]" style={BULLET_GRADIENT_STYLE} />
              <span className="text-12 font-medium text-typography-primary">{bullet}</span>
            </div>
          ))}
        </div>

        {shouldCollapse && (
          <div className="to-transparent pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-900" />
        )}
      </div>

      <div className="mt-auto flex gap-8">
        {isMobile && (
          <Button
            variant="secondary"
            className="flex-1 justify-center"
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
          >
            <span className="flex items-center justify-center gap-8">
              {isExpanded ? t`Less info` : t`More info`}
              <ChevronDownIcon className={cx("size-16 transition-transform", { "rotate-180": isExpanded })} />
            </span>
          </Button>
        )}
        <Button variant="primary" className="flex-1 justify-center" to={content.cta.to}>
          {content.cta.label}
        </Button>
      </div>
    </div>
  );
}
