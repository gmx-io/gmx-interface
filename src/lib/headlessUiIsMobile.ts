// Copy from https://github.com/tailwindlabs/headlessui/blob/1.x/packages/%40headlessui-react/src/utils/platform.ts

// This file contains functions to detect the platform the app is running on. They aren't perfect,
// and we are making assumptions here. But it's the best we can do for now.

export function isIOS() {
  const isIOSDevice =
    /iPhone|iPad|iPod/i.test(window.navigator.userAgent) || /iPhone|iPad|iPod/i.test(window.navigator.platform);
  const isIPadDesktopMode = /Mac/i.test(window.navigator.platform) && window.navigator.maxTouchPoints > 1;

  return isIOSDevice || isIPadDesktopMode;
}

function isAndroid() {
  return /Android/gi.test(window.navigator.userAgent);
}

export function isMobile() {
  return isIOS() || isAndroid();
}
