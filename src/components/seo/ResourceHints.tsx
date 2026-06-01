/**
 * Componente Server Component que agrega resource hints para optimizar la carga
 * de recursos críticos y mejorar el rendimiento
 */
export function ResourceHints() {
  const usesProxy =
    process.env.NEXT_PUBLIC_API_PROXY === 'true' ||
    !(process.env.NEXT_PUBLIC_API_URL || '').trim();
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || '').trim();

  const dnsPrefetchUrls = [
    'https://cdnjs.cloudflare.com',
    'https://unpkg.com',
  ];

  return (
    <>
      {/* Con proxy same-origin, la API es el mismo host; no preconnect a :4000 */}
      {!usesProxy && apiBaseUrl.startsWith('http') && (
        <link rel="preconnect" href={apiBaseUrl} crossOrigin="anonymous" />
      )}
      {dnsPrefetchUrls.map((url) => (
        <link key={url} rel="dns-prefetch" href={url} />
      ))}
    </>
  );
}

