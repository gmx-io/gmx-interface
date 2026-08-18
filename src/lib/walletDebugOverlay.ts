/**
 * On-screen tracer for the wallet connect flow, for debugging in-app browsers (MetaMask mobile)
 * where devtools are unavailable. Inert unless enabled with `?walletDebug=1` (persisted to
 * localStorage so the overlay survives redirects and reloads; `?walletDebug=0` turns it off).
 *
 * Logs: provider injection timing, EIP-6963 announcements, every request made through the
 * injected providers with duration and outcome, and page lifecycle events that would kill an
 * in-flight request (unload, hashchange, visibility changes).
 */

interface Eip1193Provider {
  request(args: { method: string; params?: unknown }): Promise<unknown>;
  isMetaMask?: boolean;
}

const STORAGE_KEY = "WALLET_DEBUG_OVERLAY";

function isEnabled(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("walletDebug");

    if (flag === "1") {
      localStorage.setItem(STORAGE_KEY, "1");
      return true;
    }
    if (flag === "0") {
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }

    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function start() {
  const t0 = performance.now();
  const lines: string[] = [];

  const box = document.createElement("div");
  box.style.cssText =
    "position:fixed;left:0;right:0;bottom:0;z-index:2147483647;max-height:45vh;overflow:auto;" +
    "background:rgba(0,0,0,0.92);color:#cfc;font:11px/1.4 monospace;padding:6px 8px;" +
    "white-space:pre-wrap;word-break:break-all;pointer-events:auto";

  const copyBtn = document.createElement("button");
  copyBtn.textContent = "copy";
  copyBtn.style.cssText = "position:sticky;top:0;float:right;font:11px monospace;margin-left:8px";
  copyBtn.onclick = () => void navigator.clipboard?.writeText(lines.join("\n"));
  box.appendChild(copyBtn);

  const logEl = document.createElement("div");
  box.appendChild(logEl);

  const log = (msg: string, color?: string) => {
    const line = `[${(performance.now() - t0).toFixed(0).padStart(5)}ms] ${msg}`;
    lines.push(line);
    const div = document.createElement("div");
    if (color) {
      div.style.color = color;
    }
    div.textContent = line;
    logEl.appendChild(div);
    box.scrollTop = box.scrollHeight;
  };

  const mount = () => document.body && document.body.appendChild(box);
  if (document.body) {
    mount();
  } else {
    document.addEventListener("DOMContentLoaded", mount);
  }

  log(`url: ${window.location.href}`);
  log(`ua: ${navigator.userAgent}`);

  // Page lifecycle — a reload or navigation here explains a request that never resolves.
  window.addEventListener("pagehide", () => log("EVENT pagehide (document is going away)", "#f66"));
  window.addEventListener("beforeunload", () => log("EVENT beforeunload", "#f66"));
  window.addEventListener("hashchange", () => log(`EVENT hashchange -> ${window.location.href}`, "#fc0"));
  window.addEventListener("popstate", () => log(`EVENT popstate -> ${window.location.href}`, "#fc0"));
  document.addEventListener("visibilitychange", () => log(`EVENT visibility -> ${document.visibilityState}`));

  // Provider injection timing.
  const eth = (window as { ethereum?: Eip1193Provider }).ethereum;
  log(
    `window.ethereum at boot: ${eth ? `present (isMetaMask=${eth.isMetaMask ? "yes" : "no"})` : "MISSING"}`,
    eth ? "#6f6" : "#fc0"
  );
  if (!eth) {
    let polls = 0;
    const poll = window.setInterval(() => {
      const found = (window as { ethereum?: Eip1193Provider }).ethereum;
      polls += 1;
      if (found) {
        window.clearInterval(poll);
        log(`window.ethereum APPEARED (isMetaMask=${found.isMetaMask ? "yes" : "no"})`, "#6f6");
        wrap(found, "window.ethereum");
      } else if (polls > 80) {
        window.clearInterval(poll);
        log("window.ethereum never appeared within 20s — provider not injected", "#f66");
      }
    }, 250);
  }
  window.addEventListener("ethereum#initialized", () => log("EVENT ethereum#initialized", "#6f6"));

  // Request tracing.
  let seq = 0;
  const wrapped = new WeakSet<object>();
  const wrap = (provider: Eip1193Provider, label: string) => {
    if (!provider || typeof provider.request !== "function" || wrapped.has(provider)) {
      return;
    }
    wrapped.add(provider);
    const original = provider.request.bind(provider);
    provider.request = async (args: { method: string; params?: unknown }) => {
      const id = ++seq;
      const started = performance.now();
      log(`#${id} ${label} ${args?.method} -> sent`);
      const pending = window.setTimeout(() => log(`#${id} ${args?.method} STILL PENDING after 20s`, "#f66"), 20_000);
      try {
        const result = await original(args);
        window.clearTimeout(pending);
        log(`#${id} ${args?.method} resolved in ${(performance.now() - started).toFixed(0)}ms`, "#6f6");
        return result;
      } catch (error) {
        window.clearTimeout(pending);
        const { code, message } = (error ?? {}) as { code?: number; message?: string };
        log(
          `#${id} ${args?.method} rejected in ${(performance.now() - started).toFixed(0)}ms: code=${code} ${String(message).slice(0, 100)}`,
          "#fc0"
        );
        throw error;
      }
    };
  };

  if (eth) {
    wrap(eth, "window.ethereum");
  }
  window.addEventListener("eip6963:announceProvider", (event) => {
    const detail = (event as CustomEvent<{ info?: { rdns?: string; name?: string }; provider?: Eip1193Provider }>)
      .detail;
    log(`eip6963 announce: ${detail?.info?.rdns} / ${detail?.info?.name}`, "#6f6");
    if (detail?.provider) {
      wrap(detail.provider, detail?.info?.rdns ?? "eip6963");
    }
  });
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

if (typeof window !== "undefined" && isEnabled()) {
  start();
}
