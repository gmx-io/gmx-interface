import AppCrashFallback from '@/components/ErrorBoundary/AppCrashFallback';
import { reportAppCrash } from '@/components/ErrorBoundary/reportAppCrash';
import Footer from '@/components/Footer/Footer';
import { Header } from '@/components/Header/Header';
import { Component, ErrorInfo, ReactNode } from 'react';

type AppErrorBoundaryCoreProps = {
  children: ReactNode;
  showMobileHeader?: boolean;
  resetKey?: string;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  errorCode?: string;
};

class AppErrorBoundaryCore extends Component<
  AppErrorBoundaryCoreProps,
  AppErrorBoundaryState
> {
  private hasReported = false;

  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): Partial<AppErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AppErrorBoundary]', error, errorInfo);

    if (this.hasReported) {
      return;
    }
    this.hasReported = true;

    this.setState({ errorCode: reportAppCrash(error, errorInfo) });
  }

  componentDidUpdate(prevProps: AppErrorBoundaryCoreProps) {
    if (
      !this.state.hasError ||
      prevProps.resetKey === undefined ||
      prevProps.resetKey === this.props.resetKey
    ) {
      return;
    }

    this.resetBoundary();
  }

  private resetBoundary = () => {
    this.hasReported = false;
    this.setState({ hasError: false, errorCode: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <AppCrashFallback
          errorCode={this.state.errorCode}
          showMobileHeader={this.props.showMobileHeader}
          onReset={this.resetBoundary}
        />
      );
    }

    return this.props.children;
  }
}

type AppErrorBoundaryProps = AppErrorBoundaryCoreProps & {
  withAppChrome?: boolean;
  hideAppChrome?: boolean;
  showFooter?: boolean;
};

export default function AppErrorBoundary({
  children,
  resetKey,
  showMobileHeader,
  withAppChrome,
  hideAppChrome,
  showFooter,
}: AppErrorBoundaryProps) {
  const core = (
    <AppErrorBoundaryCore resetKey={resetKey} showMobileHeader={showMobileHeader}>
      {children}
    </AppErrorBoundaryCore>
  );

  if (!withAppChrome) {
    return core;
  }

  return (
    <div className="flex h-full w-full pb-0">
      {!hideAppChrome && <Header />}
      <div className="flex h-full min-w-0 grow flex-col pb-0 pt-8">
        <div className="flex-1 overflow-y-auto">
          <div style={{ minHeight: 'calc(100vh - 4.8rem)' }}>{core}</div>
          {!hideAppChrome && showFooter && <Footer />}
        </div>
      </div>
    </div>
  );
}
