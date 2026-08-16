// ============================================================
// Error Boundary — captura crashes y evita pantalla en blanco
// ============================================================

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, '\nComponent stack:', info.componentStack);
    this.setState({ componentStack: info.componentStack ?? null });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center h-dvh bg-background text-foreground p-6 text-center gap-4">
          <span className="text-5xl">🤽</span>
          <h1 className="font-black uppercase tracking-wider" style={{  fontSize: 28 }}>
            Algo falló
          </h1>
          <p className="text-muted-foreground text-sm max-w-xs">
            {this.state.error?.message || 'Error inesperado'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null, componentStack: null });
              window.location.reload();
            }}
            className="px-6 py-3 bg-foreground text-background font-black uppercase tracking-wider"
            style={{  borderRadius: 0 }}
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
