import { Metadata } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const siteName = 'INGETEC - Portal de Mantenimiento Hidráulico';
const defaultDescription = 'Sistema de gestión y seguimiento de componentes hidráulicos en proceso de mantenimiento para INGETEC.';

export const defaultMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: defaultDescription,
  keywords: [
    'mantenimiento hidráulico',
    'componentes hidráulicos',
    'INGETEC',
    'gestión de mantenimiento',
    'sistema de seguimiento',
    'hidráulica industrial',
  ],
  authors: [{ name: 'INGETEC' }],
  creator: 'INGETEC',
  publisher: 'INGETEC',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: siteUrl,
    siteName: siteName,
    title: siteName,
    description: defaultDescription,
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: siteName,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteName,
    description: defaultDescription,
    images: [`${siteUrl}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Agregar códigos de verificación cuando estén disponibles
    // google: 'tu-codigo-google',
    // yandex: 'tu-codigo-yandex',
    // bing: 'tu-codigo-bing',
  },
};

export function createPageMetadata({
  title,
  description,
  path = '',
  noIndex = false,
  image,
}: {
  title: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
  image?: string;
}): Metadata {
  const url = `${siteUrl}${path}`;
  const fullTitle = `${title} | ${siteName}`;

  return {
    title: fullTitle,
    description: description || defaultDescription,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: fullTitle,
      description: description || defaultDescription,
      url,
      images: image
        ? [
            {
              url: image.startsWith('http') ? image : `${siteUrl}${image}`,
              width: 1200,
              height: 630,
              alt: title,
            },
          ]
        : defaultMetadata.openGraph?.images,
    },
    twitter: {
      title: fullTitle,
      description: description || defaultDescription,
      images: image
        ? [image.startsWith('http') ? image : `${siteUrl}${image}`]
        : defaultMetadata.twitter?.images,
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : defaultMetadata.robots,
  };
}

