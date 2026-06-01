import { componentsApi } from '@/lib/api';
import { logger } from '@/lib/logger';
import type { Component, ComponentEvent } from './model';
import { enrichCompaniesCatalogFromRecords } from '@/features/companies/catalog';
import { mapBackendComponent, mapBackendComponentEvent } from './mappers';

export async function getCompanyComponentsQuery(companyId: string): Promise<Component[]> {
  try {
    const response = await componentsApi.getAll({ companyId });
    enrichCompaniesCatalogFromRecords(response.data);
    return response.data.map(mapBackendComponent);
  } catch (error) {
    logger.error('Error fetching company components', { error, companyId });
    return [];
  }
}

export async function getComponentQuery(id: string): Promise<Component | undefined> {
  try {
    const response = await componentsApi.getById(id);
    enrichCompaniesCatalogFromRecords([response.data]);
    return mapBackendComponent(response.data);
  } catch (error) {
    logger.error('Error fetching component', { error, id });
    return undefined;
  }
}

export async function getComponentEventsQuery(componentId: string): Promise<ComponentEvent[]> {
  try {
    const response = await componentsApi.getById(componentId);
    const stateHistory = response.data.state_history || [];
    return stateHistory.map(mapBackendComponentEvent);
  } catch (error) {
    logger.error('Error fetching component events', { error, componentId });
    return [];
  }
}

export type ComponentDetailBundle = {
  component: Component;
  events: ComponentEvent[];
  documents: Array<{
    id: string;
    file_name?: string;
    file_url: string;
    document_type?: string | null;
    uploaded_at?: string;
    created_at?: string;
  }>;
};

/** Una sola petición de detalle + documentos en paralelo (evita 2–3 GET duplicados). */
export async function getComponentDetailBundle(
  componentId: string,
): Promise<ComponentDetailBundle | undefined> {
  try {
    const [detailResponse, documentsResponse] = await Promise.all([
      componentsApi.getById(componentId),
      componentsApi.getDocuments(componentId),
    ]);

    enrichCompaniesCatalogFromRecords([detailResponse.data]);
    const component = mapBackendComponent(detailResponse.data);
    const stateHistory = detailResponse.data.state_history || [];
    const events = stateHistory.map(mapBackendComponentEvent);
    const documents = Array.isArray(documentsResponse.data) ? documentsResponse.data : [];

    return { component, events, documents };
  } catch (error) {
    logger.error('Error fetching component detail bundle', { error, componentId });
    return undefined;
  }
}
