// date format: d MMM yyyy, H:mm, time should be specifed based on UTC time

export type EventData = {
  id: string;
  title: string;
  isActive?: boolean;
  startDate?: string;
  endDate: string;
  bodyText: string | string[];
  chains?: number[];
  buttons?: {
    text: string;
    link: string;
    newTab?: boolean;
  }[];
};

export const homeEventsData: EventData[] = [
  {
    id: "v2-live",
    title: "GMX V2 beta is live",
    isActive: true,
    endDate: "9 Sep 2023, 12:00",
    bodyText: "GMX V2 beta is now available for public use.",
    buttons: [
      {
        text: "Read More",
        link: "https://gmxio.substack.com/p/gmx-v2-beta-is-now-live",
        newTab: true,
      },
      {
        text: "Use V2",
        link: "https://app.gmx.io/#/v2?no_redirect",
      },
    ],
  },
];

export const appEventsData: EventData[] = [
  {
    id: "v2-live",
    title: "GMX V2 beta is live",
    isActive: true,
    endDate: "9 Sep 2023, 12:00",
    bodyText: "GMX V2 beta is now available for public use.",
    buttons: [
      {
        text: "Read More",
        link: "https://gmxio.substack.com/p/gmx-v2-beta-is-now-live",
        newTab: true,
      },
      {
        text: "Use V2",
        link: "https://app.gmx.io/#/v2?no_redirect",
      },
    ],
  },
  {
    id: "v2-adaptive-funding",
    title: "Adaptive Funding is live",
    isActive: true,
    endDate: "7 Nov 2023, 12:00",
    bodyText:
      "Adaptive Funding Rates are enabled for the ARB/USD market on Arbitrum and AVAX/USD market on Avalanche. This is a trial to improve the open interest balance and reduce price impact for markets.",
    buttons: [
      {
        text: "Read more.",
        link: "https://docs.gmx.io/docs/trading/v2/#adaptive-funding",
        newTab: true,
      },
    ],
  },
  {
    id: "v2-adaptive-funding-coming-soon",
    title: "Adaptive Funding",
    isActive: true,
    endDate: "7 Nov 2023, 12:00",
    bodyText:
      "Adaptive Funding Rates will be enabled for the ARB/USD market on Arbitrum and AVAX/USD market on Avalanche this week. This is a trial to improve the open interest balance and reduce price impact for markets.",
    buttons: [
      {
        text: "Read more.",
        link: "https://docs.gmx.io/docs/trading/v2/#adaptive-funding",
        newTab: true,
      },
    ],
  },
  {
    id: "incentives-launch",
    title: "Incentives are live",
    isActive: true,
    endDate: "31 Oct 2024, 12:00",
    bodyText: "Arbitrum STIP incentives are live for Arbitrum GM pools and GLP to GM migrations.",
    buttons: [
      {
        text: "Read more.",
        link: "https://gmxio.notion.site/GMX-S-T-I-P-Incentives-Distribution-1a5ab9ca432b4f1798ff8810ce51fec3",
        newTab: true,
      },
    ],
  },
  {
    id: "all-incentives-launch",
    title: "Incentives are live",
    isActive: true,
    endDate: "27 Mar 2024, 00:00",
    bodyText: [
      `Arbitrum STIP incentives are live for:`,
      "",
      "• Arbitrum GM Pools Liquidity.",
      "• Arbitrum GMX V2 Trading.",
    ],
    buttons: [
      {
        text: "Read more.",
        link: "https://gmxio.notion.site/GMX-S-T-I-P-Incentives-Distribution-1a5ab9ca432b4f1798ff8810ce51fec3",
        newTab: true,
      },
    ],
  },
  {
    id: "v2-adaptive-funding-all-markets",
    title: "Adaptive Funding",
    isActive: true,
    endDate: "21 Dec 2023, 12:00",
    bodyText:
      "Adaptive Funding Rates are enabled for all markets. This is to improve the open interest balance and reduce price impact for markets.",
    buttons: [
      {
        text: "Read more.",
        link: "https://docs.gmx.io/docs/trading/v2/#adaptive-funding",
        newTab: true,
      },
    ],
  },
  {
    id: "ledger-issue",
    title: "GMX is unaffected",
    isActive: true,
    endDate: "15 Dec 2023, 16:00",
    bodyText: ["The recent issue with Ledger Connect kit did not affect GMX."],
  },
  {
    id: "arbitrum-issue",
    title: "The Arbitrum Network is currently down",
    isActive: true,
    endDate: "16 Dec 2023, 12:00",
    bodyText: ["They are currently working to resolve the issue."],
  },
  {
    id: "bnb-market",
    title: "BNB market added on Arbitrum!",
    isActive: true,
    endDate: "15 Feb 2024, 12:00",
    bodyText: ["Trade BNB or provide liquidity using BNB or USDC in the GM Pool."],
    buttons: [
      {
        text: "Read more.",
        link: "https://twitter.com/GMX_IO/status/1750157046748446982",
        newTab: true,
      },
    ],
  },
  {
    id: "op-market", // id is taken from the newest notification, see commit diff
    title: "New markets added on Arbitrum!",
    isActive: true,
    endDate: "14 Mar 2024, 12:00",
    bodyText: ["Trade NEAR, ATOM, AAVE, AVAX, OP or provide liquidity in their GM Pools."],
    buttons: [
      {
        text: "Read more.",
        link: "https://x.com/GMX_IO/status/1762860552609468551",
        newTab: true,
      },
    ],
  },
  {
    id: "binance-wallet-campaign",
    title: "Binance Web3 Wallet Trading Campaign is Live",
    isActive: true,
    endDate: "09 Apr 2024, 23:59",
    bodyText: ["Complete any or all of the six GMX campaign tasks and qualify for rewards!"],
    buttons: [
      {
        text: "Check your tasks and their completion status.",
        link: "https://www.binance.com/en/activity/mission/gmx-airdrop",
        newTab: true,
      },
    ],
  },
];
