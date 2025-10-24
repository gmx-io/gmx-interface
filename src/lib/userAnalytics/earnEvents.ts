import { userAnalytics } from "./UserAnalytics";

export type EarnAnalyticsTab = "discover" | "portfolio" | "additionalOpportunities" | "distributions";

export type EarnPageViewEvent = {
  event: "EarnPageView";
  data: {};
};

export type EarnPageActionEvent = {
  event: "EarnPageAction";
  data: {
    action: "TabView";
    tab: EarnAnalyticsTab;
  };
};

export type EarnRecommendationContext = "AboutTokens" | "YieldLandscape" | "PortfolioRecommendations";
export type EarnRecommendationToken = "GM" | "GLV" | "GMX";
export type EarnPageRecommendationClickedEvent = {
  event: "EarnPageAction";
  data: {
    action: "RecommendationClicked";
    activeTab: EarnAnalyticsTab;
    context: EarnRecommendationContext;
    token: EarnRecommendationToken;
  };
};

export type EarnPagePortfolioItem = "GMX" | "esGMX" | "GLV" | "GM";
export type EarnPagePortfolioItemType = "stake" | "vest" | "buy" | "sell" | "details";
export type EarnPagePortfolioItemClickEvent = {
  event: "EarnPageAction";
  data: {
    action: "PortfolioItemClick";
    item: EarnPagePortfolioItem;
    type: EarnPagePortfolioItemType;
  };
};

export type EarnPageOpportunitiesAnalyticsFilter =
  | "ForMe"
  | "All"
  | "LendingAndBorrowing"
  | "Looping"
  | "DeltaNeutralVaults"
  | "Autocompound"
  | "YieldTrading";

export type EarnPageOpportunitiesFilterAppliedEvent = {
  event: "EarnPageAction";
  data: {
    action: "OpportunitiesFilterApplied";
    filter: EarnPageOpportunitiesAnalyticsFilter;
  };
};

export type EarnPageOpportunityClickedEvent = {
  event: "EarnPageAction";
  data: {
    action: "OpportunityClicked";
    name: string;
  };
};

export function sendEarnPageViewEvent() {
  userAnalytics.pushEvent<EarnPageViewEvent>({
    event: "EarnPageView",
    data: {},
  });
}

export function sendEarnPageTabViewEvent(tab: EarnAnalyticsTab) {
  userAnalytics.pushEvent<EarnPageActionEvent>({
    event: "EarnPageAction",
    data: {
      action: "TabView",
      tab,
    },
  });
}

export function sendEarnRecommendationClickedEvent({
  activeTab,
  context,
  token,
}: {
  activeTab: EarnAnalyticsTab;
  context: EarnRecommendationContext;
  token: EarnRecommendationToken;
}) {
  userAnalytics.pushEvent<EarnPageRecommendationClickedEvent>({
    event: "EarnPageAction",
    data: {
      action: "RecommendationClicked",
      activeTab,
      context,
      token,
    },
  });
}

export function sendEarnPortfolioItemClickEvent({
  item,
  type,
}: {
  item: EarnPagePortfolioItem;
  type: EarnPagePortfolioItemType;
}) {
  userAnalytics.pushEvent<EarnPagePortfolioItemClickEvent>({
    event: "EarnPageAction",
    data: {
      action: "PortfolioItemClick",
      item,
      type,
    },
  });
}

export function sendEarnOpportunitiesFilterAppliedEvent(filter: EarnPageOpportunitiesAnalyticsFilter) {
  userAnalytics.pushEvent<EarnPageOpportunitiesFilterAppliedEvent>({
    event: "EarnPageAction",
    data: {
      action: "OpportunitiesFilterApplied",
      filter,
    },
  });
}

export function sendEarnOpportunityClickedEvent(name: string) {
  userAnalytics.pushEvent<EarnPageOpportunityClickedEvent>({
    event: "EarnPageAction",
    data: {
      action: "OpportunityClicked",
      name,
    },
  });
}
