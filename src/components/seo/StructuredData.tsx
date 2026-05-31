interface StructuredDataProps {
  data: object;
}

export function StructuredData({ data }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'INGETEC',
    description: 'Portal de Mantenimiento Hidráulico',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  };

  return <StructuredData data={schema} />;
}

export function WebApplicationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'INGETEC - Portal de Mantenimiento Hidráulico',
    description: 'Sistema de gestión y seguimiento de componentes hidráulicos en proceso de mantenimiento',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  };

  return <StructuredData data={schema} />;
}

