// date format: d MMM yyyy, H:mm, time should be specifed based on UTC time

export type EventData = {
  id: string;
  title: string;
  isActive?: boolean;
  startDate?: string;
  endDate: string;
  bodyText: string | string[];
  chains?: number[];
  link?: {
    text: string;
    href: string;
    newTab?: boolean;
  };
};

export const homeEventsData: EventData[] = [];

export const appEventsData: EventData[] = [
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
    link: {
      text: "Read more.",
      href: "https://gmxio.notion.site/GMX-S-T-I-P-Incentives-Distribution-1a5ab9ca432b4f1798ff8810ce51fec3",
      newTab: true,
    },
  },
  {
    id: "incentives-launch",
    title: "Incentives are live",
    isActive: true,
    endDate: "31 Oct 2024, 12:00",
    bodyText: "Arbitrum STIP incentives are live for Arbitrum GM pools and GLP to GM migrations.",
    link: {
      text: "Read more",
      href: "https://gmxio.notion.site/GMX-S-T-I-P-Incentives-Distribution-1a5ab9ca432b4f1798ff8810ce51fec3",
      newTab: true,
    },
  },
  {
    id: "binance-wallet-campaign",
    title: "Binance Web3 Wallet Trading Campaign is Live",
    isActive: true,
    endDate: "09 Apr 2024, 23:59",
    bodyText: ["Complete any or all of the six GMX campaign tasks and qualify for rewards!"],
    link: {
      text: "Check your tasks and their completion status",
      href: "https://www.binance.com/en/activity/mission/gmx-airdrop",
      newTab: true,
    },
  },
];
