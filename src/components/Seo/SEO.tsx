import { t } from "@lingui/macro";
import type { ReactNode } from "react";
import { Helmet } from "react-helmet";

type SEOProps = {
  children?: ReactNode;
  title?: string;
  description?: string;
  image?: string;
  type?: string;
};

function SEO(props: SEOProps) {
  const { children, ...customMeta } = props;
  const meta = {
    title: t`GMX | Perpetual DEX for Crypto, Metals, Stocks & Energy`,
    description: t`GMX is a decentralized perpetual exchange with 100+ markets across crypto, gold, silver, oil, natural gas and stock indices, and up to 100x leverage.`,
    image: "https://gmx.io/og.png",
    type: "exchange",
    ...customMeta,
  };
  const socialDescription =
    customMeta.description ??
    t`GMX is a decentralized perpetual exchange for onchain trading of 100+ markets across crypto, gold (XAU), silver (XAG), energy (WTI, Brent, natural gas) and US equities (SPCX, SPY, QQQ). It offers up to 100x leverage, 24/7 TradFi markets and low-price-impact execution from a self-custody wallet, on Arbitrum, Avalanche, MegaETH and Solana, with deposits from Ethereum, Base and BNB Chain.`;
  return (
    <>
      <Helmet>
        <title>{meta.title}</title>
        <meta name="robots" content="follow, index" />
        <meta content={meta.description} name="description" />
        <meta property="og:type" content={meta.type} />
        <meta property="og:site_name" content="GMX" />
        <meta property="og:description" content={socialDescription} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:image" content={meta.image} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@gmx_io" />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={socialDescription} />
        <meta name="twitter:image" content={meta.image} />
      </Helmet>
      {children}
    </>
  );
}

export default SEO;
