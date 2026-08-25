const METAMASK_IOS_USER_AGENT_PATTERN = /(?=.*MetaMaskMobile)(?=.*(?:iPhone|iPad|iPod|Macintosh))(?!.*Android)/i;

export function isMetaMaskIosInAppBrowser(userAgent: string): boolean {
  return METAMASK_IOS_USER_AGENT_PATTERN.test(userAgent);
}

export async function waitForMetaMaskIosProvider(browserWindow: Window = window, timeoutMs = 3000): Promise<void> {
  if (!isMetaMaskIosInAppBrowser(browserWindow.navigator.userAgent) || browserWindow.ethereum?.isMetaMask) {
    return;
  }

  await new Promise<void>((resolve) => {
    const finish = () => {
      browserWindow.clearTimeout(timeoutId);
      browserWindow.removeEventListener("ethereum#initialized", finish);
      resolve();
    };
    const timeoutId = browserWindow.setTimeout(finish, timeoutMs);

    browserWindow.addEventListener("ethereum#initialized", finish, { once: true });
  });
}
