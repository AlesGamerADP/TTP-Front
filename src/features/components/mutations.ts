import { invalidateComponentDataCaches } from '@/lib/data-service';
import { componentsApi } from '@/lib/api';
import { logger } from '@/lib/logger';
import type { Component, ComponentStatus } from './model';
import { mapBackendComponent } from './mappers';

export interface CreateComponentInput {
  company_id: string;
  serial: string;
  modelo: string;
  fecha_ingreso: string;
  ite: string;
  numero_cotizacion?: string;
  observaciones?: string;
  created_by: string;
  files?: File[];
}

export interface AddComponentEventInput {
  component_id: string;
  estado: ComponentStatus;
  nota?: string;
  fotos?: File[];
  archivos?: File[];
  created_by: string;
}

export async function createComponentMutation(componentData: CreateComponentInput): Promise<Component> {
  try {
    const formData = new FormData();
    formData.append('company_id', componentData.company_id);
    formData.append('serial_number', componentData.serial);
    formData.append('model', componentData.modelo);
    formData.append('ingress_date', componentData.fecha_ingreso);
    formData.append('ite', componentData.ite);

    if (componentData.numero_cotizacion) {
      formData.append('quotation_number', componentData.numero_cotizacion);
    }

    if (componentData.observaciones) {
      formData.append('description', componentData.observaciones);
    }

    componentData.files?.forEach((file) => {
      formData.append('files', file);
    });

    const response = await componentsApi.create(formData);
    const newComponent = mapBackendComponent(response.data);
    invalidateComponentDataCaches();

    logger.info('New component added', {
      componentId: newComponent.id,
      serial: newComponent.serial,
      companyId: newComponent.company_id,
      createdBy: componentData.created_by,
    });

    return newComponent;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Error adding new component', { error: message });
    throw new Error(message);
  }
}

export async function addComponentEventMutation(event: AddComponentEventInput): Promise<void> {
  try {
    const formData = new FormData();
    formData.append('status', event.estado);

    if (event.nota) {
      formData.append('notes', event.nota);
    }

    event.fotos?.forEach((photo) => {
      formData.append('photos', photo);
    });

    event.archivos?.forEach((file) => {
      formData.append('files', file);
    });

    await componentsApi.addEvent(event.component_id, formData);
    invalidateComponentDataCaches();
    logger.info('Component event added', {
      componentId: event.component_id,
      status: event.estado,
      createdBy: event.created_by,
      photosCount: event.fotos?.length || 0,
      filesCount: event.archivos?.length || 0,
    });
  } catch (error) {
    logger.error('Error adding component event', { error });
    throw error;
  }
}

export async function updateComponentStatusMutation(componentId: string, newStatus: ComponentStatus): Promise<void> {
  try {
    await componentsApi.update(componentId, { current_status: newStatus });
    invalidateComponentDataCaches();
    logger.info('Component status updated', { componentId, newStatus });
  } catch (error) {
    logger.error('Error updating component status', { error, componentId, newStatus });
    throw error;
  }
}

export async function deleteComponentMutation(componentId: string): Promise<void> {
  try {
    await componentsApi.delete(componentId);
    invalidateComponentDataCaches();
    logger.info('Component deleted', { componentId });
  } catch (error) {
    logger.error('Error deleting component', { error, componentId });
    throw error;
  }
}
