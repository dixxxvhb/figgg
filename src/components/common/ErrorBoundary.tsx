import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleTryAgain = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleRefresh = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[var(--surface-primary)] flex items-center justify-center p-4">
          <div className="bg-[var(--surface-card)] rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'color-mix(in srgb, var(--status-danger) 15%, transparent)' }}>
              <AlertTriangle className="text-[var(--status-danger)]" size={32} />
            </div>

            <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              Something went wrong
            </h1>

            <p className="text-[var(--text-secondary)] mb-6">
              Don't worry - your data is safe. Try refreshing the app.
            </p>

            {this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-sm text-[var(--text-tertiary)] cursor-pointer hover:text-[var(--text-secondary)]">
                  Technical details
                </summary>
                <pre className="mt-2 p-3 bg-[var(--surface-inset)] rounded-lg text-xs text-[var(--text-secondary)] overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleTryAgain}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--accent-primary)] text-[var(--text-on-accent)] rounded-lg font-medium hover:bg-[var(--accent-primary-hover)] active:scale-[0.98] transition-colors"
              >
                <RefreshCw size={18} />
                Try Again
              </button>
              <button
                onClick={this.handleRefresh}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--surface-inset)] text-[var(--text-primary)] rounded-lg font-medium hover:bg-[var(--surface-card-hover)] active:scale-[0.98] transition-colors"
              >
                Refresh App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
