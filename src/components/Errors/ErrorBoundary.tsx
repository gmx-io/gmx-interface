import { Trans } from "@lingui/macro";
import cx from "classnames";
import { Component, ErrorInfo, ReactNode, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useSettings } from "context/SettingsContext/SettingsContextProvider";

import Button from "components/Button/Button";

import FeedbackIcon from "img/ic_feedback.svg?react";
import RepeatIcon from "img/ic_repeat.svg?react";

const DEFAULT_REPORT_ISSUE_URL = "https://github.com/gmx-io/gmx-interface/issues/new";
const CONTENTS_STYLE = { display: "contents" };

type ErrorBoundaryProps = {
  children: ReactNode;
  variant?: "app" | "page" | "block";
  reportIssueHref?: string;
  onReportIssue?: () => void;
  wrapperClassName?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

type ErrorFallbackProps = {
  variant?: "app" | "page" | "block";
  reportIssueHref?: string;
  onReportIssue?: () => void;
  onReload: () => void;
  wrapperClassName?: string;
};

function ErrorBoundaryDebugWrapper({ children }: { children: ReactNode }) {
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [shouldThrow, setShouldThrow] = useState(false);

  const getTargetEl = useCallback(() => {
    const anchorEl = anchorRef.current;
    if (!anchorEl) return null;
    return (anchorEl.firstElementChild as HTMLElement | null) ?? anchorEl.parentElement;
  }, []);

  const updateRect = useCallback(() => {
    const targetEl = getTargetEl();
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    if (rect.width || rect.height) {
      setAnchorRect(rect);
    }
  }, [getTargetEl]);

  useLayoutEffect(() => {
    const targetEl = getTargetEl();
    if (!targetEl) return undefined;

    updateRect();

    let resizeObserver: ResizeObserver | undefined;
    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(updateRect);
      resizeObserver.observe(targetEl);
    }

    const handlePositionUpdate = () => {
      requestAnimationFrame(updateRect);
    };

    window.addEventListener("resize", handlePositionUpdate);
    window.addEventListener("scroll", handlePositionUpdate, true);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", handlePositionUpdate);
      window.removeEventListener("scroll", handlePositionUpdate, true);
    };
  }, [getTargetEl, updateRect]);

  const debugButtonStyle = useMemo(() => {
    if (!anchorRect || typeof window === "undefined") return null;
    return {
      top: Math.max(8, anchorRect.top + 8 + window.scrollY),
      left: Math.max(8, anchorRect.right - 8 + window.scrollX),
      transform: "translate(-100%, 0)",
    };
  }, [anchorRect]);

  const debugButton = useMemo(() => {
    if (!debugButtonStyle || typeof document === "undefined") return null;

    return createPortal(
      <button
        type="button"
        aria-label="Trigger error boundary"
        className="absolute z-[11000] size-8 rounded-full bg-red-700 hover:bg-red-500"
        style={debugButtonStyle}
        onClick={() => setShouldThrow(true)}
      />,
      document.body
    );
  }, [debugButtonStyle]);

  if (shouldThrow) {
    throw new Error("ErrorBoundary debug trigger");
  }

  return (
    <>
      <span ref={anchorRef} style={CONTENTS_STYLE}>
        {children}
      </span>
      {debugButton}
    </>
  );
}

function ErrorBoundaryDebugGate({ children }: { children: ReactNode }) {
  const { isErrorBoundaryDebugEnabled } = useSettings();

  if (!isErrorBoundaryDebugEnabled) {
    return <>{children}</>;
  }

  return <ErrorBoundaryDebugWrapper>{children}</ErrorBoundaryDebugWrapper>;
}

function ErrorFallback({
  variant = "page",
  reportIssueHref,
  onReportIssue,
  onReload,
  wrapperClassName: wrapperClassNameProp,
}: ErrorFallbackProps) {
  const wrapperClassName = cx("flex w-full flex-col items-center justify-center text-center", wrapperClassNameProp, {
    "min-h-screen bg-slate-950 px-24 py-24 max-md:px-16": variant === "app",
    "min-h-[360px] grow px-24 py-24 max-md:px-16": variant === "page",
    "h-full rounded-b-8 bg-slate-900 px-24 py-24 max-md:px-16": variant === "block",
  });

  const reportIssueButton = onReportIssue ? (
    <Button
      variant="ghost"
      onClick={onReportIssue}
      className="!text-typography-secondary hover:!text-typography-primary"
    >
      <FeedbackIcon className="size-16" />
      <Trans>Report issue</Trans>
    </Button>
  ) : (
    <Button
      variant="ghost"
      to={reportIssueHref || DEFAULT_REPORT_ISSUE_URL}
      newTab
      className="!text-typography-secondary hover:!text-typography-primary"
    >
      <FeedbackIcon className="size-16" />
      <Trans>Report issue</Trans>
    </Button>
  );

  return (
    <div className={wrapperClassName}>
      <div className="flex max-w-[420px] flex-col items-center gap-12">
        <div className="text-20 font-medium text-typography-primary">
          <Trans>Something went wrong</Trans>
        </div>
        <div className="text-body-medium text-typography-secondary">
          <Trans>
            Please try reloading or report the issue if the <br /> problem persists.
          </Trans>
        </div>
        <div className="mt-8 flex flex-col items-center gap-8">
          <Button variant="primary" size="medium" className="px-24" onClick={onReload}>
            <RepeatIcon className="size-16" />
            <Trans>Reload page</Trans>
          </Button>
          {reportIssueButton}
        </div>
      </div>
    </div>
  );
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught error", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { children, variant, reportIssueHref, onReportIssue, wrapperClassName } = this.props;

    if (this.state.hasError) {
      return (
        <ErrorFallback
          variant={variant}
          reportIssueHref={reportIssueHref}
          onReportIssue={onReportIssue}
          onReload={this.handleReload}
          wrapperClassName={wrapperClassName}
        />
      );
    }

    return <ErrorBoundaryDebugGate>{children}</ErrorBoundaryDebugGate>;
  }
}
