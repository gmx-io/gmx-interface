// date format: d MMM yyyy, H:mm, time should be specifed based on UTC time

export type EventData = {
  id: string;
  title: string;
  isActive?: boolean;
  validTill: string;
  bodyText: string | string[];
  buttons: {
    text: string;
    link: string;
    newTab: boolean;
  }[];
};

export const homeEventsData: EventData[] = [];

export const appEventsData: EventData[] = [
  // {
  //   id: "glp-manager-updates",
  //   title: "GLP Manager Updates",
  //   isActive: true,
  //   validTill: "18 Dec 2022, 12:00",
  //   bodyText:
  //     "The GLP Manager address has been updated based on the linked post, existing users will need to approve the new GLP Manager to buy GLP tokens.",
  //   buttons: [
  //     {
  //       text: "Read More",
  //       link: "https://medium.com/@gmx.io/gmx-deployment-updates-nov-2022-16572314874d",
  //       newTab: true,
  //     },
  //   ],
  // },
  // {
  {
    id: "contracts-updade",
    title: "New V2 contracts deployment",
    isActive: true,
    validTill: "31 May 2023, 23:00",
    bodyText:
      "New testnet V2 contracts will be deployed this week on the Avalanche Fuji Testnet, testnet data will be cleared. For testnet users, positions can be closed beforehand if it is desired to retain the testnet funds in the position collateral.",
    buttons: [],
  },
];
