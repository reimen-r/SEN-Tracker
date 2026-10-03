import React, { Component } from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[200px] flex flex-col items-center justify-center p-6 bg-surface border border-sev-blackout rounded-card">
          <div className="text-sev-blackout text-label font-mono font-bold uppercase mb-2">
            Error en el componente
          </div>
          <p className="text-fg-muted text-label text-center max-w-md mb-4">
            {this.state.error?.message || 'Ha ocurrido un error inesperado.'}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-1.5 rounded-control bg-canvas border border-line text-label font-mono text-fg-muted hover:bg-surface-raised transition-colors duration-150"
          >
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
