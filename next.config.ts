import path from 'path';
import type { NextConfig } from "next";

const publicApiOrigin = (process.env.NEXT_PUBLIC_API_URL || '').trim();
const outputMode = (process.env.NEXT_OUTPUT_MODE || '').trim();
const connectSrc = [
  "'self'",
  ...(publicApiOrigin && publicApiOrigin !== '/' ? [publicApiOrigin] : []),
  'https://cdnjs.cloudflare.com',
  'https://unpkg.com',
].join(' ');

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

  // Compresión
  compress: true,
  
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
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "worker-src 'self' blob: https://cdnjs.cloudflare.com https://unpkg.com",
              `connect-src ${connectSrc}`,
              "frame-src 'self' blob:",
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
