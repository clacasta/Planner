import React from 'react';
import { STORAGE_KEY } from '../storage/schema';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Evita la pantalla en blanco: si algo falla al renderizar, muestra un aviso y
 * ofrece descargar los datos guardados para no perder el trabajo.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Error de render en el planificador:', error, info);
  }

  private handleDownload = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) ?? '{}';
      const blob = new Blob([raw], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'family-day-planner-datos-de-emergencia.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      // Si ni siquiera se puede descargar, el usuario aún puede recargar.
    }
  };

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="error-boundary">
        <h1>Algo ha ido mal al dibujar el planificador</h1>
        <p>
          Tus datos siguen guardados en este navegador. Puedes recargar la página o descargar una
          copia antes de seguir.
        </p>
        <pre className="error-boundary-detail">{error.message}</pre>
        <div className="error-boundary-actions">
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Recargar
          </button>
          <button className="btn" onClick={this.handleDownload}>
            Descargar mis datos
          </button>
        </div>
      </div>
    );
  }
}
