import path from 'path';
import type { NextConfig } from "next";
import { getApiProxyTarget, shouldUseSameOriginApi } from './src/lib/api-config';

const apiProxyTarget = getApiProxyTarget();
const outputMode = (process.env.NEXT_OUTPUT_MODE || '').trim();
const isDev = process.env.NODE_ENV !== 'production';

/** Proxy de scripts de Vercel para no abrir va.vercel-scripts.com en la CSP. */
const vercelSpeedInsightsRewrites = [
  {
    source: '/vercel/speed-insights.debug.js',
    destination:
      'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js',
  },
  {
    source: '/vercel/speed-insights.js',
    destination: 'https://va.vercel-scripts.com/v1/speed-insights/script.js',
  },
];

function collectApiOriginsForCsp(): string[] {
  const origins = new Set<string>();
  const add = (raw: string) => {
    const value = raw.trim();
    if (!value || value === '/') return;
    try {
      const href = value.startsWith('http') ? value : `http://${value}`;
      origins.add(new URL(href).origin);
    } catch {
      /* ignore invalid URL */
    }
  };

  add(process.env.NEXT_PUBLIC_API_URL || '');
  add(process.env.INTERNAL_API_URL || '');
  add(apiProxyTarget || '');

  if (isDev) {
    origins.add('http://localhost:4000');
    origins.add('http://127.0.0.1:4000');
  }

  return [...origins];
}

const apiOriginsCsp = collectApiOriginsForCsp();

const connectSrc = [
  "'self'",
  ...apiOriginsCsp,
  'https://cdnjs.cloudflare.com',
  'https://unpkg.com',
  ...(isDev ? ['https://vitals.vercel-insights.com'] : []),
].join(' ');

const imgSrc = ["'self'", 'data:', 'blob:', 'https:', ...apiOriginsCsp].join(' ');

const frameSrc = ["'self'", 'blob:', ...apiOriginsCsp].join(' ');

const nextConfig: NextConfig = {
  reactCompiler: true,
  ...(outputMode === 'standalone' ? { output: 'standalone' as const } : {}),
  
  // Optimizaciones de imágenes
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // En dev, comprimir respuestas del proxy /api puede romper gzip del backend (ERR_CONTENT_DECODING_FAILED).
  compress: !isDev,
  
  // Optimizaciones de bundle
  // Nota: SWC minification está habilitado por defecto en Next.js 16
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      'recharts',
      'react-pdf',
      'react-viewer',
    ],
  },
  
  // Optimizaciones de bundle size
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Optimizar chunks para mejor code splitting
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Separar vendor chunks grandes
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Separar UI components
            ui: {
              name: 'ui',
              chunks: 'all',
              test: /[\\/]components[\\/]ui[\\/]/,
              priority: 30,
            },
            // Separar componentes pesados
            heavy: {
              name: 'heavy',
              chunks: 'all',
              test: /[\\/](react-pdf|recharts|react-viewer)[\\/]/,
              priority: 40,
            },
          },
        },
      };
    }
    return config;
  },
  
  // Configuración de Turbopack
  // Turbopack maneja automáticamente code splitting, tree shaking y optimizaciones
  // No necesita configuración adicional, pero lo definimos explícitamente
  turbopack: {
    root: path.join(__dirname),
  },
  
  async rewrites() {
    const rewrites = [...vercelSpeedInsightsRewrites];

    if (shouldUseSameOriginApi() && apiProxyTarget) {
      rewrites.push({
        source: '/api/:path*',
        destination: `${apiProxyTarget}/api/:path*`,
      });
    }

    return rewrites;
  },

  // Headers de seguridad y optimización
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdnjs.cloudflare.com https://unpkg.com",
              "style-src 'self' 'unsafe-inline'",
              `img-src ${imgSrc}`,
              "font-src 'self' data:",
              "worker-src 'self' blob: https://cdnjs.cloudflare.com https://unpkg.com",
              `connect-src ${connectSrc}`,
              `frame-src ${frameSrc}`,
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Headers de optimización
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
      // Cache para assets estáticos
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif|woff|woff2|ttf|eot)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
