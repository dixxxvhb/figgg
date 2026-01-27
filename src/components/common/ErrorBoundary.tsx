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

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-blush-100 dark:bg-blush-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-blush-800 rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-red-600 dark:text-red-400" size={32} />
            </div>

            <h1 className="text-xl font-bold text-forest-700 dark:text-white mb-2">
              Something went wrong
            </h1>

            <p className="text-forest-500 dark:text-blush-300 mb-6">
              Don't worry - your data is safe. Try refreshing the app.
            </p>

            {this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-sm text-forest-400 dark:text-blush-400 cursor-pointer hover:text-forest-600 dark:hover:text-blush-200">
                  Technical details
                </summary>
                <pre className="mt-2 p-3 bg-blush-100 dark:bg-blush-700 rounded-lg text-xs text-blush-600 dark:text-blush-300 overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-6 py-3 bg-forest-600 text-white rounded-lg font-medium hover:bg-forest-700 transition-colors"
            >
              <RefreshCw size={18} />
              Refresh App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for use in specific components
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}
