// date format: d MMM yyyy, H:mm, time should be specifed based on UTC time

export type EventData = {
  id: string;
  title: string;
  isActive?: boolean;
  validTill: string;
  bodyText: string | string[];
  buttons?: {
    text: string;
    link: string;
    newTab: boolean;
  }[];
};

export const homeEventsData: EventData[] = [];

export const appEventsData: EventData[] = [
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
  {
    id: "usdc-to-usdce",
    title: "USDC renamed to USDC.e",
    isActive: true,
    validTill: "17 Jun 2023, 12:00",
    bodyText:
      "Since native USDC is available on Arbitrum, the Ethereum-bridged version of USDC has been renamed to USDC.e.",
    buttons: [
      {
        text: "Read More",
        link: "https://www.circle.com/blog/arbitrum-usdc-now-available",
        newTab: true,
      },
    ],
  },
];
