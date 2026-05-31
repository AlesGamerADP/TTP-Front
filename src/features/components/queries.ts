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
