import '../styles/global.css';
import { ErrorBoundaryWrapper } from '../components/common/ErrorBoundaryWrapper';
import { Toaster } from '../components/ui/sonner';
import { ThemeProvider } from '../components/theme/ThemeProvider';
import { ThemeMeta } from '../components/theme/ThemeMeta';
import { defaultMetadata } from '@/lib/metadata';
import { OrganizationSchema, WebApplicationSchema } from '@/components/seo/StructuredData';
import { ResourceHints } from '@/components/seo/ResourceHints';
import { StorageInitializer } from '@/components/common/StorageInitializer';
import { ComponentRealtimeConnection } from '@/features/components/realtime/ComponentRealtimeConnection';
import { RealtimeConnectionBanner } from '@/features/components/realtime/RealtimeConnectionBanner';
import { usesBrowserApiProxy } from '@/lib/api-config';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { QueryProvider } from '@/providers/QueryProvider';
import type { Metadata } from 'next';

export const metadata: Metadata = defaultMetadata;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  const shouldPreconnectApi =
    !usesBrowserApiProxy() && !!publicApiUrl && publicApiUrl.startsWith('http');

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="color-scheme" content="light dark" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        {/* Preconnect a recursos externos críticos para carga más rápida */}
        {shouldPreconnectApi && (
          <>
            <link rel="preconnect" href={publicApiUrl} />
            <link rel="dns-prefetch" href={publicApiUrl} />
          </>
        )}
        <OrganizationSchema />
        <WebApplicationSchema />
        <ResourceHints />
      </head>
      <body suppressHydrationWarning className="bg-background text-foreground">
        <ThemeProvider>
          <ThemeMeta />
          <ErrorBoundaryWrapper>
            <QueryProvider>
            <StorageInitializer />
            <ComponentRealtimeConnection />
            <RealtimeConnectionBanner />
            {/* Skip to main content link for accessibility */}
            <a 
              href="#main-content" 
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Saltar al contenido principal
            </a>
            {children}
            <Toaster position="top-right" richColors />
            {process.env.NODE_ENV === 'production' && <SpeedInsights />}
            </QueryProvider>
          </ErrorBoundaryWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}