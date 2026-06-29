import { invalidateComponentDataCaches } from '@/lib/data-service';

import { componentsApi } from '@/lib/api';

import { logger } from '@/lib/logger';

import { postFormDataWithProgress, type UploadProgress } from '@/lib/upload-with-progress';

import type { Component, ComponentStatus } from './model';

import { mapBackendComponent } from './mappers';



export interface CreateComponentInput {

  company_id: string;

  serial: string;

  servicio_principal: string;

  fecha: string;

  hoja_evaluacion_he: string;

  id_cotizacion?: string;

  solicitud_general?: string;

  atencion_persona?: string;

  item_nro?: number;

  cantidad?: number;

  nro_actividad?: string;

  descripcion_actividad?: string;

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

  onUploadProgress?: (progress: UploadProgress) => void;

}



export async function createComponentMutation(componentData: CreateComponentInput): Promise<Component> {

  try {

    const formData = new FormData();

    formData.append('company_id', componentData.company_id);

    formData.append('serial_number', componentData.serial);

    formData.append('servicio_principal', componentData.servicio_principal);

    formData.append('fecha', componentData.fecha);

    formData.append('hoja_evaluacion_he', componentData.hoja_evaluacion_he);



    if (componentData.id_cotizacion) {

      formData.append('id_cotizacion', componentData.id_cotizacion);

    }

    if (componentData.solicitud_general) {

      formData.append('solicitud_general', componentData.solicitud_general);

    }

    if (componentData.atencion_persona) {

      formData.append('atencion_persona', componentData.atencion_persona);

    }

    if (componentData.item_nro !== undefined) {

      formData.append('item_nro', String(componentData.item_nro));

    }

    if (componentData.cantidad !== undefined) {

      formData.append('cantidad', String(componentData.cantidad));

    }

    if (componentData.nro_actividad) {

      formData.append('nro_actividad', componentData.nro_actividad);

    }

    if (componentData.descripcion_actividad) {

      formData.append('descripcion_actividad', componentData.descripcion_actividad);

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

  const hasAttachments = (event.fotos?.length ?? 0) > 0 || (event.archivos?.length ?? 0) > 0;



  try {

    if (!hasAttachments) {

      await componentsApi.addEventMetadata(event.component_id, {
        status: event.estado,
        notes: event.nota,
      });

    } else {

      const meta = await componentsApi.addEventMetadata(event.component_id, {

        status: event.estado,

        notes: event.nota,

      });



      const eventId = meta.data?.id as string | undefined;

      if (!eventId) {

        throw new Error('No se recibió el identificador del evento');

      }



      const formData = new FormData();

      event.fotos?.forEach((photo) => formData.append('photos', photo));

      event.archivos?.forEach((file) => formData.append('files', file));



      await postFormDataWithProgress(

        `/api/components/${event.component_id}/events/${eventId}/attachments`,

        formData,

        event.onUploadProgress,

      );

    }



    invalidateComponentDataCaches();

    logger.info('Component event added', {

      componentId: event.component_id,

      status: event.estado,

      createdBy: event.created_by,

      photosCount: event.fotos?.length || 0,

      filesCount: event.archivos?.length || 0,

      twoPhase: hasAttachments,

    });

  } catch (error) {

    logger.error('Error adding component event', { error });

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

