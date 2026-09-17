import { Component, ReactNode } from "react";

import { showAppLoadError } from "lib/appStartup";

export default class StartupErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    showAppLoadError(error);
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}
