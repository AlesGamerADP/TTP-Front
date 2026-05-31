'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="app-shell min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <CardTitle className="text-2xl">Error en la aplicación</CardTitle>
          </div>
          <CardDescription>
            {error.message || 'Ha ocurrido un error inesperado. Por favor, intenta recargar la página.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && error.stack && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <details>
                <summary className="text-sm text-red-700 cursor-pointer font-semibold">
                  Ver detalles técnicos
                </summary>
                <pre className="mt-2 text-xs text-red-600 overflow-auto max-h-60">
                  {error.stack}
                </pre>
              </details>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={resetErrorBoundary} variant="default">
              <RefreshCw className="w-4 h-4 mr-2" />
              Intentar de nuevo
            </Button>
            <Button onClick={() => window.location.href = '/'} variant="outline">
              <Home className="w-4 h-4 mr-2" />
              Ir al inicio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

