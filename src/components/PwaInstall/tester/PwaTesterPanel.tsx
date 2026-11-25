// Tester for the PWA install design review: devices and moments, shown only outside gmx.io. Never merged.
import cx from "classnames";
import { ReactNode } from "react";
import { useHistory } from "react-router-dom";

import { dismissInstallCard, recordArbitrumPositionOpened, recordCompletedTrade } from "../pwaActions";
import type { PwaPlatform } from "../pwaPlatform";
import { resetPwaSession, resetPwaState, setPwaState, usePwaState } from "../pwaStore";
import type { PwaEnvironment } from "../usePwaEnvironment";
import { answerPermissionPrompt, setPwaTester, usePwaTester } from "./pwaTester";

const PLATFORMS: { value: PwaPlatform; label: string }[] = [
  { value: "iphone-safari", label: "iPhone Safari" },
  { value: "iphone-chrome", label: "iPhone Chrome" },
  { value: "android-chrome", label: "Android Chrome" },
  { value: "android-other", label: "Android Firefox" },
  { value: "in-app", label: "Wallet / Telegram" },
  { value: "desktop-chromium", label: "Computer Chrome" },
  { value: "desktop-safari", label: "Mac Safari" },
  { value: "desktop-other", label: "Computer Firefox" },
];

function Chip({ isActive, onClick, children }: { isActive?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-6 border-1/2 px-8 py-4 text-12",
        isActive
          ? "border-blue-300 bg-blue-300/20 text-typography-primary"
          : "border-slate-600 text-typography-secondary hover:text-typography-primary"
      )}
    >
      {children}
    </button>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-11 uppercase tracking-wide text-typography-secondary">{label}</div>
      <div className="flex flex-wrap gap-4">{children}</div>
    </div>
  );
}

export function PwaTesterPanel({ env }: { env: PwaEnvironment }) {
  const tester = usePwaTester();
  const state = usePwaState();
  const history = useHistory();

  return (
    <>
      <div className="fixed left-8 top-[calc(var(--safe-area-inset-top)+52px)] z-[1200] flex flex-col items-start gap-4">
        <button
          type="button"
          className="rounded-full border-1/2 border-yellow-300 bg-slate-950 px-10 py-4 text-12 font-medium text-yellow-300"
          onClick={() => setPwaTester({ isPanelOpen: !tester.isPanelOpen })}
        >
          Tester · {tester.isOn ? PLATFORMS.find((p) => p.value === tester.platform)?.label : "Real device"}
          {tester.isOn && tester.isInstalled ? " · app" : ""}
        </button>
        {tester.isPanelOpen ? (
          <div className="flex max-h-[70dvh] w-[300px] max-w-[calc(100vw-16px)] flex-col gap-10 overflow-y-auto rounded-8 border-1/2 border-slate-600 bg-slate-950/95 p-10">
            <Row label="Device">
              {PLATFORMS.map((p) => (
                <Chip
                  key={p.value}
                  isActive={tester.isOn && tester.platform === p.value}
                  onClick={() => setPwaTester({ isOn: true, platform: p.value })}
                >
                  {p.label}
                </Chip>
              ))}
              <Chip isActive={!tester.isOn} onClick={() => setPwaTester({ isOn: false })}>
                Real device
              </Chip>
            </Row>
            {tester.isOn && tester.platform.startsWith("iphone") ? (
              <Row label="iOS version">
                <Chip isActive={tester.iosVersion >= 27} onClick={() => setPwaTester({ iosVersion: 27 })}>
                  iOS 27
                </Chip>
                <Chip isActive={tester.iosVersion < 27} onClick={() => setPwaTester({ iosVersion: 18 })}>
                  Earlier iOS
                </Chip>
              </Row>
            ) : null}
            <Row label="Open in">
              <Chip isActive={!env.isInstalled} onClick={() => setPwaTester({ isOn: true, isInstalled: false })}>
                Browser tab
              </Chip>
              <Chip isActive={env.isInstalled} onClick={() => setPwaTester({ isOn: true, isInstalled: true })}>
                Installed app
              </Chip>
            </Row>
            <Row label="Moments">
              <Chip isActive={state.hasCompletedTrade} onClick={recordCompletedTrade}>
                Finish a trade
              </Chip>
              <Chip isActive={state.hasOpenArbitrumPosition} onClick={recordArbitrumPositionOpened}>
                Open a position on Arbitrum · #{state.arbitrumPositionsOpened + 1}
              </Chip>
              <Chip
                onClick={() => {
                  setPwaState({ arbitrumPositionsOpened: Math.max(state.arbitrumPositionsOpened, 4) });
                  recordArbitrumPositionOpened();
                }}
              >
                Jump to the 5th position
              </Chip>
            </Row>
            <Row label="Notifications">
              <Chip
                isActive={state.notifications === "on"}
                onClick={() => setPwaState({ notifications: state.notifications === "on" ? "off" : "on" })}
              >
                Notifications on
              </Chip>
              <Chip
                isActive={tester.isOtherNetworkNoteForced}
                onClick={() => setPwaTester({ isOn: true, isOtherNetworkNoteForced: !tester.isOtherNetworkNoteForced })}
              >
                Other-network note (switch network in the header)
              </Chip>
            </Row>
            <Row label="Pages">
              <Chip onClick={() => history.push("/download")}>Download page</Chip>
              <Chip onClick={() => history.push("/trade")}>Trade</Chip>
            </Row>
            <Row label="Welcome steps done">
              <Chip isActive={env.isSignedIn} onClick={() => setPwaTester({ isOn: true, isSignedIn: !env.isSignedIn })}>
                Signed in
              </Chip>
              <Chip isActive={env.isFunded} onClick={() => setPwaTester({ isOn: true, isFunded: !env.isFunded })}>
                Funded
              </Chip>
              <Chip
                isActive={env.isOneClickOn}
                onClick={() => setPwaTester({ isOn: true, isOneClickOn: !env.isOneClickOn })}
              >
                One-Click on
              </Chip>
            </Row>
            <div className="text-11 leading-[1.4] text-typography-secondary">
              Positions opened {state.arbitrumPositionsOpened} (offer from 5) · Install card ✕{" "}
              {state.installCard.dismissCount}/2 · Offer ✕ {state.notificationsOffer.dismissCount}/2 · Notifications{" "}
              {state.notifications} · Welcome {state.isWelcomeClosed ? "closed" : "open"}
            </div>
            <Row label="Reset">
              <Chip onClick={resetPwaSession}>New session</Chip>
              <Chip onClick={resetPwaState}>Start over (new visitor)</Chip>
            </Row>
          </div>
        ) : null}
      </div>

      {tester.browserDialogSource ? (
        <StandIn caption="Browser's own install dialog · not designed by GMX">
          <div className="text-body-large font-medium text-typography-primary">Install app?</div>
          <div className="text-body-small text-typography-secondary">GMX · app.gmx.io</div>
          <div className="mt-8 flex justify-end gap-8">
            <Chip
              onClick={() => {
                if (tester.browserDialogSource === "card") dismissInstallCard();
                setPwaTester({ browserDialogSource: null });
              }}
            >
              Cancel
            </Chip>
            <Chip
              isActive
              onClick={() => {
                setPwaTester({ browserDialogSource: null, isInstalled: true });
                setPwaState({ isWelcomeClosed: false });
              }}
            >
              Install
            </Chip>
          </div>
        </StandIn>
      ) : null}

      {tester.isPermissionPromptOpen ? (
        <StandIn caption="System permission prompt · not designed by GMX">
          <div className="text-body-large font-medium text-typography-primary">
            “GMX” would like to send you notifications
          </div>
          <div className="text-body-small text-typography-secondary">
            Notifications may include alerts, sounds and icon badges
          </div>
          <div className="mt-8 flex justify-end gap-8">
            <Chip onClick={() => answerPermissionPrompt("deny")}>Don't Allow</Chip>
            <Chip isActive onClick={() => answerPermissionPrompt("allow")}>
              Allow
            </Chip>
          </div>
        </StandIn>
      ) : null}
    </>
  );
}

function StandIn({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[1150] flex items-center justify-center bg-black/60 p-16">
      <div className="flex w-[300px] flex-col gap-6">
        <div className="text-center text-11 text-yellow-300">{caption}</div>
        <div className="flex flex-col gap-4 rounded-12 border-1/2 border-dashed border-yellow-300/60 bg-slate-900 p-16">
          {children}
        </div>
      </div>
    </div>
  );
}
