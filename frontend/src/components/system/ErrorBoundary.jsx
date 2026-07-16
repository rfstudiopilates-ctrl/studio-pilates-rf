import { Component } from 'react';
import { Button } from '../ui/Button';

/**
 * Evita que un error de render tumbe toda la PWA.
 * Clasico Error Boundary (no hay equivalente en hooks).
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Error inesperado',
    };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info?.componentStack);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.assign('/');
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 text-center">
          <h1 className="text-xl font-semibold text-text">Algo salió mal</h1>
          <p className="mt-2 text-sm text-text-muted">
            La pantalla tuvo un error inesperado. Podés reintentar o volver al inicio.
          </p>
          {import.meta.env.DEV && this.state.message ? (
            <p className="mt-3 break-words rounded-lg bg-surface-muted px-3 py-2 text-left text-xs text-text-muted">
              {this.state.message}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={this.handleGoHome}>
              Ir al inicio
            </Button>
            <Button onClick={this.handleReload}>Recargar</Button>
          </div>
        </div>
      </div>
    );
  }
}
