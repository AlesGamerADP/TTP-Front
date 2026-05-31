/**
 * Componente Server Component que agrega resource hints para optimizar la carga
 * de recursos críticos y mejorar el rendimiento
 */
export function ResourceHints() {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const dnsPrefetchUrls = [
    'https://cdnjs.cloudflare.com',
    'https://unpkg.com',
  ];

  return (
    <>
      {/* Preconnect a la API para reducir latencia */}
      <link rel="preconnect" href={apiBaseUrl} crossOrigin="anonymous" />
      {/* DNS prefetch para recursos externos comunes */}
      {dnsPrefetchUrls.map((url) => (
        <link key={url} rel="dns-prefetch" href={url} />
      ))}
    </>
  );
}

