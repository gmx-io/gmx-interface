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
  window.addEventListener("pageshow", (event) => log(`EVENT pageshow (persisted=${event.persisted})`));
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

  // Privy API and captcha traffic — the SDK calls auth.privy.io from the host page, so a connect
  // that dies in bot protection or a hanging login request is visible here.
  const TRACED_FETCH_HOSTS = /privy\.io|hcaptcha\.com|challenges\.cloudflare\.com/;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!TRACED_FETCH_HOSTS.test(url)) {
      return originalFetch(input, init);
    }
    const id = ++seq;
    const started = performance.now();
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    let path = url;
    try {
      const parsed = new URL(url, window.location.href);
      path = `${parsed.host}${parsed.pathname}`;
    } catch {
      path = url;
    }
    log(`#${id} fetch ${method} ${path} -> sent`);
    const pending = window.setTimeout(() => log(`#${id} fetch ${path} STILL PENDING after 20s`, "#f66"), 20_000);
    try {
      const response = await originalFetch(input, init);
      window.clearTimeout(pending);
      log(
        `#${id} fetch ${path} -> ${response.status} in ${(performance.now() - started).toFixed(0)}ms`,
        response.ok ? "#6f6" : "#fc0"
      );
      return response;
    } catch (error) {
      window.clearTimeout(pending);
      log(
        `#${id} fetch ${path} -> NETWORK ERROR in ${(performance.now() - started).toFixed(0)}ms: ${String(error).slice(0, 80)}`,
        "#f66"
      );
      throw error;
    }
  };

  // Challenge frames and scripts inserted into the host page (Privy bot protection). A challenge
  // that never completes leaves the connect promise unsettled with no visible error.
  const CHALLENGE_SRC = /hcaptcha\.com|challenges\.cloudflare\.com|turnstile/i;
  const challengeObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLIFrameElement) && !(node instanceof HTMLScriptElement)) {
          continue;
        }
        const src = node.src;
        if (!src || !CHALLENGE_SRC.test(src)) {
          continue;
        }
        const kind = node instanceof HTMLIFrameElement ? "iframe" : "script";
        const host = src.replace(/^https?:\/\//, "").split("/")[0];
        log(`CHALLENGE ${kind} inserted: ${host}`, "#fc0");
        node.addEventListener("load", () => log(`CHALLENGE ${kind} loaded: ${host}`), { once: true });
        node.addEventListener("error", () => log(`CHALLENGE ${kind} FAILED to load: ${host}`, "#f66"), { once: true });
      }
    }
  });
  challengeObserver.observe(document.documentElement, { childList: true, subtree: true });

  // history rewrite bursts — WebKit throws SecurityError past ~100 calls in 10s, and the quota is
  // page global, so our rewrites and Privy's login rewrites exhaust it together.
  const historyCalls: number[] = [];
  let historyLogsSuppressed = false;
  const wrapHistory = (methodName: "replaceState" | "pushState") => {
    const original = window.history[methodName].bind(window.history);
    window.history[methodName] = (data: unknown, unused: string, url?: string | URL | null) => {
      const now = performance.now();
      historyCalls.push(now);
      while (historyCalls.length > 0 && now - historyCalls[0] > 10_000) {
        historyCalls.shift();
      }
      if (historyCalls.length <= 15) {
        historyLogsSuppressed = false;
        log(`history.${methodName} #${historyCalls.length}/10s -> ${String(url ?? "").slice(0, 80)}`);
      } else if (!historyLogsSuppressed) {
        historyLogsSuppressed = true;
        log("history rewrites continuing, suppressing individual logs", "#fc0");
      }
      if (historyCalls.length === 80) {
        log("history quota WARNING: 80 rewrites in 10s, WebKit throws at ~100", "#f66");
      }
      try {
        return original(data, unused, url);
      } catch (error) {
        log(`history.${methodName} THREW: ${String(error).slice(0, 100)}`, "#f66");
        throw error;
      }
    };
  };
  wrapHistory("replaceState");
  wrapHistory("pushState");
}

if (typeof window !== "undefined" && isEnabled()) {
  start();
}
