'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { logger } from '../../lib/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log del error
    logger.error('Error Boundary caught an error', {
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
    });

    this.setState({
      error,
      errorInfo,
    });

    // Llamar callback personalizado si existe
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Si hay un fallback personalizado, usarlo
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI por defecto
      return (
        <div className="app-shell min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <CardTitle className="text-2xl">Algo salió mal</CardTitle>
              </div>
              <CardDescription>
                Ha ocurrido un error inesperado. Por favor, intenta recargar la página.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-mono text-red-800 break-all">
                    <strong>Error:</strong> {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <details className="mt-2">
                      <summary className="text-sm text-red-700 cursor-pointer">
                        Ver detalles técnicos
                      </summary>
                      <pre className="mt-2 text-xs text-red-600 overflow-auto max-h-60">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={this.handleReset} variant="default">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Intentar de nuevo
                </Button>
                <Button onClick={this.handleGoHome} variant="outline">
                  <Home className="w-4 h-4 mr-2" />
                  Ir al inicio
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

