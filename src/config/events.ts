// date format: d MMM yyyy, H:mm, time should be specifed based on UTC time

export type EventData = {
  id: string;
  title: string;
  isActive?: boolean;
  validTill: string;
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
    validTill: "9 Sep 2023, 12:00",
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
    validTill: "9 Sep 2023, 12:00",
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
    validTill: "7 Nov 2023, 12:00",
    bodyText:
      "Adaptive Funding Rates are enabled for the ARB/USD market on Arbitrum and AVAX/USD market on Avalanche. This is a trial to improve the open interest balance and reduce price impact for markets.",
    buttons: [
      {
        text: "More Info.",
        link: "https://docs.gmx.io/docs/trading/v2/#adaptive-funding",
        newTab: true,
      },
    ],
  },
  {
    id: "v2-adaptive-funding-coming-soon",
    title: "Adaptive Funding",
    isActive: true,
    validTill: "7 Nov 2023, 12:00",
    bodyText:
      "Adaptive Funding Rates will be enabled for the ARB/USD market on Arbitrum and AVAX/USD market on Avalanche this week. This is a trial to improve the open interest balance and reduce price impact for markets.",
    buttons: [
      {
        text: "More Info.",
        link: "https://docs.gmx.io/docs/trading/v2/#adaptive-funding",
        newTab: true,
      },
    ],
  },
  {
    id: "incentives-launch",
    title: "Incentives are live",
    isActive: true,
    validTill: "31 Oct 2024, 12:00",
    bodyText: "Arbitrum STIP incentives are live for Arbitrum GM pools and GLP to GM migrations.",
    buttons: [
      {
        text: "More Info.",
        link: "https://gmxio.notion.site/GMX-S-T-I-P-Incentives-Distribution-1a5ab9ca432b4f1798ff8810ce51fec3",
        newTab: true,
      },
    ],
  },
];
