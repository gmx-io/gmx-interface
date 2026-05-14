import type { User } from "@privy-io/react-auth";

export type WalletProvenance = "external" | "embedded";
export type EmbeddedWalletLoginMethod =
  | "email"
  | "sms"
  | "google"
  | "twitter"
  | "discord"
  | "github"
  | "linkedin"
  | "spotify"
  | "instagram"
  | "tiktok"
  | "line"
  | "twitch"
  | "apple"
  | "farcaster"
  | "telegram"
  | "passkey"
  | "custom"
  | "unknown";

export type WalletAnalyticsProvenance = {
  walletProvenance?: WalletProvenance;
  embeddedWalletLoginMethod?: EmbeddedWalletLoginMethod;
};

type LinkedAccount = User["linkedAccounts"][number];

function isSameAddress(left: string | undefined, right: string | undefined) {
  return left !== undefined && right !== undefined && left.toLowerCase() === right.toLowerCase();
}

function isEmbeddedWallet(account: LinkedAccount) {
  return (
    account.type === "wallet" &&
    (account.walletClientType === "privy" ||
      account.walletClientType === "privy-v2" ||
      account.connectorType === "embedded")
  );
}

function getLoginMethodFromLinkedAccount(account: LinkedAccount): EmbeddedWalletLoginMethod | undefined {
  switch (account.type) {
    case "email":
    case "passkey":
    case "farcaster":
    case "telegram":
      return account.type;
    case "phone":
      return "sms";
    case "google_oauth":
      return "google";
    case "twitter_oauth":
      return "twitter";
    case "discord_oauth":
      return "discord";
    case "github_oauth":
      return "github";
    case "linkedin_oauth":
      return "linkedin";
    case "spotify_oauth":
      return "spotify";
    case "instagram_oauth":
      return "instagram";
    case "tiktok_oauth":
      return "tiktok";
    case "line_oauth":
      return "line";
    case "twitch_oauth":
      return "twitch";
    case "apple_oauth":
      return "apple";
    case "custom_auth":
      return "custom";
    default:
      return undefined;
  }
}

function getAccountVerificationTime(account: LinkedAccount) {
  return account.latestVerifiedAt?.getTime() ?? account.firstVerifiedAt?.getTime() ?? 0;
}

export function getEmbeddedWalletLoginMethod(user: User): EmbeddedWalletLoginMethod {
  const latestLoginAccount = user.linkedAccounts
    .map((account) => ({
      method: getLoginMethodFromLinkedAccount(account),
      verifiedAt: getAccountVerificationTime(account),
    }))
    .filter(
      (account): account is { method: EmbeddedWalletLoginMethod; verifiedAt: number } => account.method !== undefined
    )
    .sort((left, right) => right.verifiedAt - left.verifiedAt)[0];

  return latestLoginAccount?.method ?? "unknown";
}

export function getWalletAnalyticsProvenance({
  account,
  user,
}: {
  account: string | undefined;
  user: User | null | undefined;
}): WalletAnalyticsProvenance {
  if (!account) {
    return {};
  }

  const linkedWallet = user?.linkedAccounts.find((linkedAccount) => {
    return linkedAccount.type === "wallet" && isSameAddress(linkedAccount.address, account);
  });

  if (linkedWallet && isEmbeddedWallet(linkedWallet)) {
    return {
      walletProvenance: "embedded",
      embeddedWalletLoginMethod: user ? getEmbeddedWalletLoginMethod(user) : "unknown",
    };
  }

  return {
    walletProvenance: "external",
    embeddedWalletLoginMethod: undefined,
  };
}
