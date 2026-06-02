import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in widget:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] bg-red-50/50 dark:bg-red-950/20 text-red-600 rounded-md p-4">
          <AlertTriangle className="h-8 w-8 mb-2 opacity-80" />
          <h3 className="font-semibold text-sm">Widget Error</h3>
          <p className="text-xs opacity-80 text-center mt-1">
            {this.state.error?.message || 'Something went wrong displaying this widget.'}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
