export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) {
    return;
  }

  const register = () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // The app fully works without offline support, so registration errors are ignored
    });
  };

  // Wait for the page to load so registration does not compete with app startup requests
  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register, { once: true });
  }
}
