export function isHomeSite() {
  return process.env.REACT_APP_IS_HOME_SITE === "true";
}

export function isMobileDevice(navigator) {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
