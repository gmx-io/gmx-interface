export type LandingPageViewEvent = {
  event: "LandingPageAction";
  data: {
    action: "PageView";
  };
};

export type LandingPageLaunchAppEvent = {
  event: "LandingPageAction";
  data: {
    action: "LaunchApp";
    buttonPosition: "MenuButton" | "StickyHeader" | "Title" | "Chains";
  };
};

export type LandingPageProtocolTokenEvent = {
  event: "LandingPageAction";
  data: {
    action: "ProtocolTokenAction";
    chain: "Arbitrum" | "Avalanche";
    type: "GM" | "GLM" | "GLP";
  };
};

export type LandingPageProtocolReadMoreEvent = {
  event: "LandingPageAction";
  data: {
    action: "ProtocolReadMore";
  };
};

export type LandingPageHeaderMenuEvent = {
  event: "LandingPageAction";
  data: {
    action: "HeaderMenu";
    button: "App" | "Protocol" | "Governance" | "Voting" | "Docs";
  };
};

export type LandingPageFooterMenuEvent = {
  event: "LandingPageAction";
  data: {
    action: "FooterMenu";
    button: "X" | "Discord" | "Telegram" | "Github";
  };
};

export type ConnectWalletClickEvent = {
  event: "ConnectWalletAction";
  data: {
    action: "ConnectWalletClick";
    position: "ActionButton" | "Header";
  };
};

export type WalletProviderSelectedEvent = {
  event: "ConnectWalletAction";
  data: {
    action: "WalletProviderSelected";
    provider: string; // ProviderName
  };
};

export type ConnectWalletDialogCloseEvent = {
  event: "ConnectWalletAction";
  data: {
    action: "DialogClose";
  };
};

export type ConnectWalletResultEvent = {
  event: "ConnectWalletAction";
  data: {
    action: "ConnectedSuccessfully" | "ConnectionFail";
    provider: string; // ProviderName
  };
};

export type DisconnectWalletEvent = {
  event: "ConnectWalletAction";
  data: {
    action: "Disconnect";
  };
};

export type TradeBoxMarketSelectedEvent = {
  event: "TradeBoxAction";
  data: {
    action: "MarketSelected";
  };
};

export type TradeBoxInteractionStartedEvent = {
  event: "TradeBoxAction";
  data: {
    action: "InteractionStarted";
  };
};

export type TradeBoxApproveClickEvent = {
  event: "TradeBoxAction";
  data: {
    action: "OpenPositionApproveClick";
  };
};

export type TradeBoxApproveResultEvent = {
  event: "TradeBoxAction";
  data: {
    action: "OpenPositionApproveSuccess" | "OpenPositionApproveFail";
  };
};

export type TradeBoxConfirmClickEvent = {
  event: "TradeBoxAction";
  data: {
    action: "OpenPositionConfirmClick";
    pair: string;
    pool: string;
    type: "Short" | "Long" | "Swap";
    orderType: "Limit" | "Market" | "TPSL";
    tradeType: "InitialTrade" | "IncreaseSize";
    leverage: string;
    is1CT: boolean;
    chain: "Arbitrum" | "Avalanche";
    isFirstOrder: boolean;
  };
};

export type TradeBoxPositionResultEvent = {
  event: "TradeBoxAction";
  data: {
    action: "OpenPositionSuccess" | "OpenPositionFail";
    pair: string;
    pool: string;
    type: "Short" | "Long" | "Swap";
    orderType: "Limit" | "Market" | "TPSL";
    tradeType: "OpenNew" | "IncreaseSize";
    leverage: string;
    is1CT: boolean;
    chain: "Arbitrum" | "Avalanche";
    isFirstOrder: boolean;
  };
};

export type TradeBoxLeverageSliderToggleEvent = {
  event: "TradeBoxAction";
  data: {
    action: "LeverageSliderToggle";
    state: "enabled" | "disabled";
  };
};

export type TradeBoxWarningShownEvent = {
  event: "TradeBoxAction";
  data: {
    action: "WarningShown";
    message: "InsufficientLiquidity";
    pair: string;
    pool: string;
    type: "Short" | "Long" | "Swap";
    orderType: "Limit" | "Market" | "TPSL";
    tradeType: "InitialTrade" | "IncreaseSize";
    leverage: string;
    chain: "Arbitrum" | "Avalanche";
    isFirstOrder: boolean;
  };
};

export type EarnPageBuyEvent = {
  event: "EarnPageAction";
  data: {
    action: "BuySuccess" | "BuyFail";
    poolName: "GM" | "GLV";
    amount: number; // Amount in USD
    isFirstBuy: boolean;
  };
};

export type SharePositionClickEvent = {
  event: "SharePositionAction";
  data: {
    action: "SharePositionClick";
  };
};

export type SharePositionActionEvent = {
  event: "SharePositionAction";
  data: {
    action: "Copy" | "Download" | "Click";
  };
};

export type ReferralTopMenuClickEvent = {
  event: "ReferralCodeAction";
  data: {
    action: "RefferalTopMenuClick";
  };
};

export type ReferralCreateCodeEvent = {
  event: "ReferralCodeAction";
  data: {
    action: "CreateCode";
  };
};

export type ReferralShareEvent = {
  event: "ReferralCodeAction";
  data: {
    action: "ShareTwitter" | "CopyCode";
  };
};
