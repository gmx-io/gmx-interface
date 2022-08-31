// date format: d MMM yyyy, H:mm, time should be specifed based on UTC time

export const homeEventsData = [
  {
    id: "app-gmx-io-launch",
    title: "Frontend Updates",
    isActive: true,
    validTill: "10 Jul 2022, 12:00",
    bodyText:
      "Updates have been applied to the GMX frontend to inform users of the separation between gmx.io and app.gmx.io",
    buttons: [
      {
        text: "Read More",
        link: "https://medium.com/@gmx.io/gmx-frontend-updates-8d13f2346e1e",
        newTab: true,
      },
    ],
  },
  {
    id: "arbitrum-nitro-upgrade",
    title: "Arbitrum Nitro Upgrade",
    isActive: true,
    validTill: "31 Aug 2022, 20:00",
    bodyText: "The Arbitrum Nitro upgrade has been completed.",
    buttons: [
      {
        text: "Read More",
        link: "https://medium.com/@gmx.io/arbitrum-nitro-5f88c03a46fe",
        newTab: true,
      },
    ],
  },
];

export const appEventsData = [
  // {
  //   id: "removal-of-min-profit-rule",
  //   title: "Trading improvements",
  //   isActive: true,
  //   validTill: "1 Apr 2022, 12:00",
  //   bodyText: "The 1.5% minimum profit rule has been removed",
  //   buttons: [
  //     {
  //       text: "Read more",
  //       link: "https://gmxio.gitbook.io/gmx/roadmap#30-march-2022",
  //       newTab: true,
  //     },
  //     {
  //       text: "Trade Now",
  //       link: "https://gmx.io/trade",
  //     },
  //   ],
  // },
  // {
  //   id: "shorting-of-link-uni-re-enabled",
  //   title: "Shorting of LINK and UNI",
  //   isActive: true,
  //   validTill: "20 Apr 2022, 12:00",
  //   bodyText: "Shorting has been re-enabled for LINK and UNI.",
  //   buttons: [
  //     {
  //       text: "Trade Now",
  //       link: "https://gmx.io/trade",
  //     },
  //   ],
  // },
  // {
  //   id: "speed-up-page-loading",
  //   title: "Speed Up Page Loading",
  //   isActive: true,
  //   validTill: "4 May 2022, 12:00",
  //   bodyText: "If you experience data loading issues, please use a free RPC URL from Alchemy.",
  //   buttons: [
  //     {
  //       text: "Learn More",
  //       link: "https://gmxio.gitbook.io/gmx/trading#backup-rpc-urls",
  //       newTab: true,
  //     },
  //   ],
  // },
  // {
  //   id: "referral-program-launch",
  //   title: "Referral Program Launch",
  //   isActive: true,
  //   validTill: "4 May 2022, 12:00",
  //   bodyText: "The GMX referral program is now live! Get fee discounts and refer traders to earn rewards.",
  //   buttons: [
  //     {
  //       text: "Read More",
  //       link: "https://gmx.io/referrals",
  //     },
  //     {
  //       text: "Join Now",
  //       link: "https://gmx.io/referrals",
  //     },
  //   ],
  // },
  // {
  //   id: "gmx-arbitrum-odyssey",
  //   title: "GMX Arbitrum Odyssey",
  //   isActive: true,
  //   validTill: "3 Jul 2022, 12:00",
  //   bodyText:
  //     "The GMX Arbitrum Odyssey is taking place this week, all participants will receive prizes. Read on to find out more.",
  //   buttons: [
  //     {
  //       text: "Read More",
  //       link: "https://medium.com/@gmx.io/gmx-arbitrum-odyssey-fc12cba2d10d",
  //     },
  //   ],
  // },
  // {
  //   id: "fix-arbitrum-transaction-issues",
  //   title: "Fix Arbitrum Transactions",
  //   isActive: true,
  //   validTill: "30 Jun 2022, 12:00",
  //   bodyText:
  //     "If you experience transaction errors on Arbitrum or data loading issues, please use a free RPC URL from Alchemy.",
  //   buttons: [
  //     {
  //       text: "Learn More",
  //       link: "https://gmxio.gitbook.io/gmx/trading#backup-rpc-urls",
  //       newTab: true,
  //     },
  //   ],
  // },
  // {
  //   id: "gmx-arbitrum-odyssey-paused",
  //   title: "GMX Arbitrum Odyssey Paused",
  //   isActive: true,
  //   validTill: "3 Jul 2022, 12:00",
  //   bodyText: "The GMX Arbitrum Odyssey has been paused. Please read the linked post for more information.",
  //   buttons: [
  //     {
  //       text: "Read More",
  //       link: "https://twitter.com/GMX_IO/status/1542163585111150592",
  //       newTab: true,
  //     },
  //   ],
  // },
  // {
  //   id: "app-gmx-io",
  //   title: "Frontend Updates",
  //   isActive: true,
  //   validTill: "6 Jul 2022, 12:00",
  //   bodyText:
  //     "On 6 Jul 2022, updates will be applied to the GMX frontend to inform users of the separation between gmx.io and app.gmx.io",
  //   buttons: [
  //     {
  //       text: "Read More",
  //       link: "https://medium.com/@gmx.io/gmx-frontend-updates-8d13f2346e1e",
  //       newTab: true,
  //     },
  //   ],
  // },
  // {
  //   id: "degraded-alchemy-performance",
  //   title: "Alchemy RPC",
  //   isActive: true,
  //   validTill: "3 Jul 2022, 12:00",
  //   bodyText:
  //     "There are ongoing syncing issues on Alchemy for Arbitrum at the moment, please check their status page and use the public Arbitrum RPC in the meantime",
  //   buttons: [
  //     {
  //       text: "Check Status",
  //       link: "https://status.alchemy.com/",
  //       newTab: true,
  //     },
  //     {
  //       text: "Public RPC URL",
  //       link: "https://metamask.zendesk.com/hc/en-us/articles/4415758358299-Network-profile-Arbitrum",
  //       newTab: true,
  //     },
  //   ],
  // },
  {
    id: "app-gmx-io-settings",
    title: "Frontend Updates",
    isActive: true,
    validTill: "10 Jul 2022, 12:00",
    bodyText:
      "You are currently using app.gmx.io. Customized settings have been reset, you may need to adjust your settings by clicking on the menu in the top right after connecting your wallet.",
    buttons: [
      {
        text: "Read More",
        link: "https://medium.com/@gmx.io/gmx-frontend-updates-8d13f2346e1e",
        newTab: true,
      },
    ],
  },
  {
    id: "use-alchemy-rpc-url",
    title: "Use Alchemy RPC URL",
    isActive: true,
    validTill: "10 Jul 2022, 12:00",
    bodyText:
      "If you experience data loading or transaction issues on Arbitrum, please use a free RPC URL from Alchemy.",
    buttons: [
      {
        text: "Learn More",
        link: "https://gmxio.gitbook.io/gmx/trading#backup-rpc-urls",
        newTab: true,
      },
    ],
  },
  {
    id: "arbitrum-nitro-upgrade",
    title: "Arbitrum Nitro Upgrade",
    isActive: true,
    validTill: "31 Aug 2022, 20:00",
    bodyText: "The Arbitrum Nitro upgrade has been completed.",
    buttons: [
      {
        text: "Read More",
        link: "https://medium.com/@gmx.io/arbitrum-nitro-5f88c03a46fe",
        newTab: true,
      },
    ],
  },
];
