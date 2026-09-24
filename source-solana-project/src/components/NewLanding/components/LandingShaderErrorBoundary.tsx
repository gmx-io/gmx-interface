import { Component, ErrorInfo, ReactNode } from 'react';
import LandingHeroStaticBackground from './LandingHeroStaticBackground';

type LandingShaderErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type LandingShaderErrorBoundaryState = {
  hasError: boolean;
};

export default class LandingShaderErrorBoundary extends Component<
  LandingShaderErrorBoundaryProps,
  LandingShaderErrorBoundaryState
> {
  state: LandingShaderErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): Partial<LandingShaderErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn(
      '[LandingPageShader] WebGL shader failed, using static background',
      error,
      errorInfo,
      navigator.userAgent
    );
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <LandingHeroStaticBackground />;
    }

    return this.props.children;
  }
}
