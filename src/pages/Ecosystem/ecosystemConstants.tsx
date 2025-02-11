import { ARBITRUM, AVALANCHE, ChainId } from "config/chains";
import { msg } from "@lingui/macro";
import { MessageDescriptor } from "@lingui/core";

type EcosystemGmxPage = {
  title: MessageDescriptor;
  link: string;
  linkLabel: string;
  about: MessageDescriptor;
  chainIds: ChainId[];
};

export const gmxPages: EcosystemGmxPage[] = [
  {
    title: msg`GMX Governance`,
    link: "https://gov.gmx.io/",
    linkLabel: "gov.gmx.io",
    about: msg`GMX Governance Page`,
    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`GMX Proposals`,
    link: "https://snapshot.org/#/gmx.eth",
    linkLabel: "snapshot.org",
    about: msg`GMX Proposals Voting page`,
    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`GMX Announcements`,
    link: "https://t.me/GMX_Announcements",
    linkLabel: "t.me",
    about: msg`GMX Announcements and Updates`,
    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`Dune Analytics for GMX`,
    link: "https://dune.com/gmx-io/gmx-analytics",
    linkLabel: "dune.com",
    about: msg`Dune Analytics`,
    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`GMX Technical Announcements`,
    link: "https://t.me/GMX_Technical_Announcements",
    linkLabel: "t.me",
    about: msg`GMX Technical Announcements`,
    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`GMX Substack`,
    link: "https://gmxio.substack.com/",
    linkLabel: "substack.com",
    about: msg`GMX Substack`,
    chainIds: [ARBITRUM, AVALANCHE],
  },
];

type EcosystemCommunityProject = {
  title: MessageDescriptor;
  link: string;
  linkLabel: string;
  about: MessageDescriptor;
  creatorLabel: string | string[];
  creatorLink: string | string[];
  chainIds: ChainId[];
};

export const communityProjects: EcosystemCommunityProject[] = [
  {
    title: msg`GMX Blueberry Club`,
    link: "https://hub.findgbc.io/",
    linkLabel: "findgbc.io",
    about: msg`GMX Community with NFTs, Trading and Education initiatives`,
    creatorLabel: "@xm_gbc",
    creatorLink: "https://t.me/xm_gbc",
    chainIds: [ARBITRUM],
  },
  {
    title: msg`GMX Positions Bot`,
    link: "https://t.me/GMXv2Positions",
    linkLabel: "t.me",
    about: msg`Telegram bot for GMX position updates`,
    creatorLabel: "@SniperMonke01",
    creatorLink: "https://t.me/SniperMonke01",
    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`Blueberry Pulse`,
    link: "https://blueberrypulse.substack.com/",
    linkLabel: "substack.com",
    about: msg`GMX Weekly Updates`,
    creatorLabel: "@1tbk1",
    creatorLink: "https://x.com/1tbk1",
    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`GMX Trading Stats`,
    link: "https://t.me/GMXTradingStats",
    linkLabel: "t.me",
    about: msg`Telegram bot for Open Interest on GMX`,
    creatorLabel: "@SniperMonke01",
    creatorLink: "https://x.com/SniperMonke01",
    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`GMX Swaps`,
    link: "https://t.me/GMXSwaps",
    linkLabel: "t.me",
    about: msg`Telegram bot for GMX Swaps monitoring`,
    creatorLabel: "@snipermonke01",
    creatorLink: "https://x.com/snipermonke01",
    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`SNTL esGMX Market`,
    link: "https://sntl.market/",
    linkLabel: "sntl.market",
    about: msg`esGMX OTC Market`,
    creatorLabel: "@sntlai",
    creatorLink: "https://x.com/sntlai",
    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`Copin`,
    link: "https://app.copin.io",
    linkLabel: "copin.io",
    about: msg`Explore, analyze, and copy on-chain traders`,
    creatorLabel: ["@0xanol", "@tungle_eth"],
    creatorLink: ["https://x.com/0xanol", "https://x.com/tungle_eth"],
    chainIds: [ARBITRUM],
  },
  {
    title: msg`GMX v2 Telegram & Discord Analytics`,
    link: "https://t.me/gmx_v2_bot",
    linkLabel: "t.me",
    about: msg`GMX V2 Data Analytics within Telegram`,
    creatorLabel: "@gmx_v2_bot",
    creatorLink: "https://t.me/gmx_v2_bot",
    chainIds: [ARBITRUM],
  },
  {
    title: msg`Kudai AI Agent`,
    link: "https://x.com/Kudai_IO",
    linkLabel: "x.com",
    about: msg`GBC Kudai AI Agent`,
    creatorLabel: "@Kudai_IO",
    creatorLink: "https://x.com/Kudai_IO",
    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`Generative Market eXplore - AIGMX Agent`,
    link: "https://x.com/aigmx_agent",
    linkLabel: "x.com",
    about: msg`Real-time rants about GMX Trades`,
    creatorLabel: "@aigmx_agent",
    creatorLink: "https://x.com/aigmx_agent",
    chainIds: [ARBITRUM, AVALANCHE],
  },
];

type EcosystemDashboardProject = {
  title: MessageDescriptor;
  link: string;
  linkLabel: string;
  about: MessageDescriptor;
  creatorLabel: string;
  creatorLink: string;
  chainIds: ChainId[];
};

export const dashboardProjects: EcosystemDashboardProject[] = [
  {
    title: msg`GMX Referrals Dashboard`,
    link: "https://www.gmxreferrals.com/",
    linkLabel: "gmxreferrals.com",
    about: msg`Dashboard for GMX referral stats`,
    creatorLabel: "@kyzoeth",
    creatorLink: "https://x.com/kyzoeth",
    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`GMX Analytics`,
    link: "https://gmxstats.info/",
    linkLabel: "gmxstats.info",
    about: msg`Financial reports and protocol analytics`,
    creatorLabel: "@sliux",
    creatorLink: "https://x.com/sliux",
    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`TokenTerminal`,
    link: "https://tokenterminal.com/terminal/projects/gmx",
    linkLabel: "tokenterminal.com",
    about: msg`GMX fundamentals`,
    creatorLabel: "@tokenterminal",
    creatorLink: "https://x.com/tokenterminal",
    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`GMX Risk Monitoring`,
    link: "https://community.chaoslabs.xyz/gmx-arbitrum/ccar-perps/overview",
    linkLabel: "chaoslabs.xyz",
    about: msg`Protocol risk explorer and stats`,
    creatorLabel: "@chaos_labs",
    creatorLink: "https://x.com/chaos_labs",
    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`Saulius GMX Analytics`,
    link: "https://dune.com/saulius/gmx-analytics",
    linkLabel: "dune.com",
    about: msg`Protocol analytics`,
    creatorLabel: "@sliux",
    creatorLink: "https://x.com/sliux",
    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`Compass Labs Trading Simulations`,
    link: "https://www.compasslabs.ai/dashboard?example=gmxV2_swap_orders",
    linkLabel: "compasslabs.ai",
    about: msg`Trading Simulations on GMX using DOJO`,
    creatorLabel: "@labs_compass",
    creatorLink: "https://x.com/labs_compass",
    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`Compass Labs GM Token Dashboard`,
    link: "https://www.compasslabs.ai/dashboard?example=gmxV2_market_orders",
    linkLabel: "compasslabs.ai",
    about: msg`GMX Market Token Price Chart`,
    creatorLabel: "@labs_compass",
    creatorLink: "https://x.com/labs_compass",
    chainIds: [ARBITRUM, AVALANCHE],
  },
];

export const integrations: EcosystemGmxPage[] = [
  {
    title: msg`DeBank`,
    link: "debank.com",
    linkLabel: "debank.com",
    about: msg`DeFi Portfolio Tracker`,

    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`Defi Llama`,
    link: "https://defillama.com",
    linkLabel: "defillama.com",
    about: msg`Decentralized Finance Dashboard`,

    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`Stryke`,
    link: "https://www.stryke.xyz",
    linkLabel: "stryke.xyz",
    about: msg`Decentralized Options Protocol`,

    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`Jones DAO`,
    link: "https://jonesdao.io",
    linkLabel: "jonesdao.io",
    about: msg`Decentralized Options Strategies`,

    chainIds: [ARBITRUM],
  },
  {
    title: msg`Yield Yak Optimizer`,
    link: "https://yieldyak.com/",
    linkLabel: "yieldyak.com",
    about: msg`Yield Optimizer on Avalanche`,

    chainIds: [AVALANCHE],
  },
  {
    title: msg`Stabilize Protocol`,
    link: "https://www.stabilize.finance/",
    linkLabel: "stabilize.finance",
    about: msg`Yield Vaults`,

    chainIds: [ARBITRUM],
  },
  {
    title: msg`DODO`,
    link: "https://dodoex.io/",
    linkLabel: "dodoex.io",
    about: msg`Decentralized Trading Protocol`,

    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`Open Ocean`,
    link: "https://openocean.finance/",
    linkLabel: "openocean.finance",
    about: msg`DEX Aggregator`,

    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`Paraswap`,
    link: "https://www.paraswap.io/",
    linkLabel: "paraswap.io",
    about: msg`DEX Aggregator`,

    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`1inch`,
    link: "https://1inch.io/",
    linkLabel: "1inch.io",
    about: msg`DEX Aggregator`,

    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`Firebird Finance`,
    link: "https://app.firebird.finance/swap",
    linkLabel: "firebird.finance",
    about: msg`DEX Aggregator`,

    chainIds: [AVALANCHE],
  },
  {
    title: msg`Yield Yak Swap`,
    link: "https://yieldyak.com/swap",
    linkLabel: "yieldyak.com",
    about: msg`DEX Aggregator`,

    chainIds: [AVALANCHE],
  },
  {
    title: msg`Plutus`,
    link: "https://plutusdao.io/vaults",
    linkLabel: "plutusdao.io",
    about: msg`GLP autocompounding vaults`,

    chainIds: [ARBITRUM],
  },
  {
    title: msg`Beefy`,
    link: "https://app.beefy.com/",
    linkLabel: "beefy.com",
    about: msg`GLP and GMX autocompounding vaults`,

    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`ODOS`,
    link: "https://app.odos.xyz/",
    linkLabel: "odos.xyz",
    about: msg`DEX Aggregator`,

    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`Dolomite`,
    link: "https://app.dolomite.io/balances",
    linkLabel: "dolomite.io",
    about: msg`Decentralized Money Market`,

    chainIds: [ARBITRUM],
  },
  {
    title: msg`UniDex Leverage`,
    link: "https://leverage.unidex.exchange/",
    linkLabel: "unidex.exchange",
    about: msg`Leverage Trading Terminal`,
    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`Symbiosis`,
    link: "https://app.symbiosis.finance/",
    linkLabel: "symbiosis.finance",
    about: msg`DEX Aggregator`,
    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`0x`,
    link: "https://explorer.0xprotocol.org/liquiditySources",
    linkLabel: "0xprotocol.org",
    about: msg`DEX Aggregator`,
    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`Harmonix`,
    link: "https://harmonix.fi/",
    linkLabel: "harmonix.fi",
    about: msg`Yield Optimizations`,
    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`Perpie`,
    link: "https://www.perpie.io/",
    linkLabel: "perpie.io",
    about: msg`Telegram Bot`,
    chainIds: [ARBITRUM],
  },
  {
    title: msg`RabbitHole`,
    link: "https://rabbithole.gg/",
    linkLabel: "rabbithole.gg",
    about: msg`User Quests`,
    chainIds: [ARBITRUM],
  },
  {
    title: msg`Vaultka`,
    link: "https://www.vaultka.com/",
    linkLabel: "vaultka.com",
    about: msg`Yield Vaults`,
    chainIds: [ARBITRUM],
  },
  {
    title: msg`Tradao`,
    link: "https://www.tradao.xyz/#/",
    linkLabel: "tradao.xyz",
    about: msg`Derivatives Portfolio Tracker`,
    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`DeltaPrime`,
    link: "https://deltaprime.io/",
    linkLabel: "deltaprime.io",
    about: msg`DeFi Margin Protocol`,
    chainIds: [ARBITRUM, AVALANCHE],
  },
  {
    title: msg`D2.Finance`,
    link: "https://d2.finance/",
    linkLabel: "d2.finance",
    about: msg`Option-based Vaults`,
    chainIds: [ARBITRUM],
  },
  {
    title: msg`Umami DAO`,
    link: "https://umami.finance/",
    linkLabel: "umami.finance",
    about: msg`Yield Vaults`,
    chainIds: [ARBITRUM],
  },
  {
    title: msg`BonsaiDAO`,
    link: "https://www.bonsaidao.xyz/",
    linkLabel: "bonsaidao.xyz",
    about: msg`Decentralized Yield Products`,
    chainIds: [ARBITRUM],
  },
  {
    title: msg`Rage Trade`,
    link: "https://www.rage.trade/",
    linkLabel: "rage.trade",
    about: msg`Perpetuals Aggregator`,
    chainIds: [ARBITRUM],
  },
  {
    title: msg`Pear Protocol`,
    link: "https://www.pear.garden/",
    linkLabel: "pear.garden",
    about: msg`Pairs Trading`,
    chainIds: [ARBITRUM],
  },
  {
    title: msg`Mozaic Finance`,
    link: "https://app.mozaic.finance/",
    linkLabel: "mozaic.finance",
    about: msg`Yield Farming`,
    chainIds: [ARBITRUM],
  },
  {
    title: msg`Solv Finance`,
    link: "https://solv.finance/",
    linkLabel: "solv.finance",
    about: msg`Asset Management`,
    chainIds: [ARBITRUM],
  },
  {
    title: msg`Perfectswap`,
    link: "https://vaults.perfectswap.io/#/",
    linkLabel: "perfectswap.io",
    about: msg`Yield Vaults`,
    chainIds: [ARBITRUM],
  },
  {
    title: msg`Symbiosis`,
    link: "https://app.symbiosis.finance/zap",
    linkLabel: "symbiosis.finance",
    about: msg`Cross-chain one-click deposits into GM`,
    chainIds: [ARBITRUM],
  },
  {
    title: msg`HoudiniSwap`,
    link: "https://houdiniswap.com/",
    linkLabel: "houdiniswap.com",
    about: msg`Bridge and swap`,
    chainIds: [ARBITRUM],
  },
  {
    title: msg`Venus`,
    link: "https://app.venus.io/#/?chainId=42161",
    linkLabel: "venus.io",
    about: msg`Lending and Borrowing`,
    chainIds: [ARBITRUM],
  },
];

type EcosystemTelegramGroup = {
  title: MessageDescriptor;
  link: string;
  linkLabel: string;
  about: MessageDescriptor;
};

export const telegramGroups: EcosystemTelegramGroup[] = [
  {
    title: msg`GMX`,
    link: "https://t.me/GMX_IO",
    linkLabel: "t.me",
    about: msg`Telegram Group`,
  },
  {
    title: msg`GMX (Chinese)`,
    link: "https://t.me/gmxch",
    linkLabel: "t.me",
    about: msg`Telegram Group (Chinese)`,
  },
  {
    title: msg`GMX (Portuguese)`,
    link: "https://t.me/GMX_Portuguese",
    linkLabel: "t.me",
    about: msg`Telegram Group (Portuguese)`,
  },
  {
    title: msg`GMX Trading Chat`,
    link: "https://t.me/gambittradingchat",
    linkLabel: "t.me",
    about: msg`GMX community discussion`,
  },
];
