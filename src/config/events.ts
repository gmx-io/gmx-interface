// date format: d MMM yyyy, H:mm, time should be specifed based on UTC time

import { AVALANCHE } from "./chains";

export type EventData = {
  id: string;
  title: string;
  isActive?: boolean;
  validTill: string;
  bodyText: string | string[];
  networks?: number[];
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
    validTill: "30 Oct 2023, 12:00",
    bodyText: "Adaptive Funding has been enabled for the AVAX/USD market on Avalanche.",
    networks: [AVALANCHE],
    buttons: [
      {
        text: "Read More.",
        link: "https://docs.gmx.io/docs/trading/v2/#adaptive-funding",
        newTab: true,
      },
    ],
  },
  // {
  //   id: "usdc-to-usdce",
  //   title: "USDC renamed to USDC.e",
  //   isActive: true,
  //   validTill: "9 Jun 2023, 12:00",
  //   bodyText:
  //     "Due to the coming native USDC to Arbitrum, the Ethereum-bridged version of USDC is being renamed to USDC.e.",
  //   buttons: [
  //     {
  //       text: "Read More",
  //       link: "https://medium.com/@gmx.io/gmx-deployment-updates-nov-2022-16572314874d",
  //       newTab: true,
  //     },
  //   ],
  // },
];
