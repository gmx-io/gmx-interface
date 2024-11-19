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
    type: "GMX" | "GM" | "GLV" | "GLP";
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
    button: string;
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

export type TokenApproveClickEvent = {
  event: "TokenApproveAction";
  data: {
    action: "ApproveClick";
  };
};

export type TokenApproveResultEvent = {
  event: "TokenApproveAction";
  data: {
    action: "ApproveSuccess" | "ApproveFail";
  };
};

export type TradeBoxConfirmClickEvent = {
  event: "TradeBoxAction";
  data: {
    action: "IncreasePositionConfirmClick" | "DecreasePositionConfirmClick" | "SwapConfirmClick";
    pair: string;
    pool: string;
    type: "Short" | "Long" | "Swap";
    orderType: "Limit" | "Market" | "TPSL";
    tradeType: "InitialTrade" | "IncreaseSize" | "DecreaseSize" | "ClosePosition";
    leverage: string;
    is1CT: boolean;
    chain: string;
    isFirstOrder: boolean;
  };
};

export type TradeBoxResultEvent = {
  event: "TradeBoxAction";
  data: {
    action:
      | "IncreasePositionSuccess"
      | "DecreasePositionSuccess"
      | "SwapSuccess"
      | "IncreasePositionFail"
      | "DecreasePositionFail"
      | "SwapFail";
    pair: string;
    pool: string;
    type: "Short" | "Long" | "Swap";
    orderType: "Limit" | "Market" | "TPSL";
    tradeType: "InitialTrade" | "IncreaseSize" | "DecreaseSize" | "ClosePosition";
    leverage: string;
    is1CT: boolean;
    chain: string;
    isFirstOrder: boolean;
    isUserError: boolean;
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

export type PoolsPageBuyConfirmEvent = {
  event: "PoolsPageAction";
  data: {
    action: "BuyConfirm";
    type: "GM" | "GLV";
    poolName: string;
    glvAddress: string;
    amountUsd: number;
    isFirstBuy: boolean;
  };
};

export type PoolsPageBuyResultEvent = {
  event: "PoolsPageAction";
  data: {
    action: "BuySuccess" | "BuyFail";
    type: "GM" | "GLV";
    poolName: string;
    glvAddress: string;
    amountUsd: number;
    isFirstBuy: boolean;
    isUserError: boolean;
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
    action: "Copy" | "Download" | "ShareTwitter";
  };
};

export type ReferralTopMenuClickEvent = {
  event: "ReferralCodeAction";
  data: {
    action: "ReferralTopMenuClick";
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
