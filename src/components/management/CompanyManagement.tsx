'use client';

import { useState } from 'react';
import { Company, User } from '../../lib/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Building2, Plus, Pencil, Trash2, Users, Package } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ResponsiveTable, ResponsiveTableHeader, ResponsiveTableBody, ResponsiveTableRow, ResponsiveTableCell, ResponsiveTableHead } from '../common/ResponsiveTable';
import { useIsMobile } from '../ui/use-mobile';
import { useCompanyManagementData } from '@/features/companies/hooks/useCompanyManagementData';
import {
  createCompanyMutation,
  deleteCompanyMutation,
  updateCompanyMutation,
  type CompanyMutationPayload,
} from '@/features/companies/mutations';

interface CompanyManagementProps {
  currentUser: User;
}

export default function CompanyManagement({ currentUser }: CompanyManagementProps) {
  const toast = useToast();
  const isMobileViewport = useIsMobile();
  const canViewActivationStatus = currentUser.role === 'admin';
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const { companies, companyStats, loading, reload } = useCompanyManagementData();

  const [formData, setFormData] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      contact_email: '',
      contact_phone: '',
      address: '',
    });
  };

  const handleCreateCompany = async () => {
    try {
      if (!formData.name || !formData.contact_email) {
        toast.error('Nombre y email de contacto son obligatorios');
        return;
      }

      // Preparar datos para el backend
      const companyData: CompanyMutationPayload = {
        name: formData.name,
        contact_email: formData.contact_email,
      };

      // Solo incluir campos opcionales si están presentes
      if (formData.contact_phone) {
        companyData.contact_phone = formData.contact_phone;
      }
      if (formData.address) {
        companyData.address = formData.address;
      }
      
      // Llamar al API para crear la empresa
      await createCompanyMutation(companyData);

      toast.success(`Empresa ${formData.name} creada exitosamente`, 'La empresa ha sido agregada al sistema correctamente.');
      setIsCreateDialogOpen(false);
      resetForm();
      void reload();
    } catch (error: unknown) {
      // Capturar información detallada del error
      let errorMessage = 'Error al crear empresa';
      let errorDetails: Record<string, unknown> | null = null;
      
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
        errorDetails = {
          message: error.message,
          name: error.name,
          stack: error.stack,
          toString: error.toString()
        };
      } else if (error && typeof error === 'object') {
        try {
          const parsedError = JSON.parse(JSON.stringify(error)) as Record<string, unknown>;
          errorDetails = parsedError;
          errorMessage =
            (typeof parsedError.message === 'string' && parsedError.message) ||
            (typeof parsedError.error === 'string' && parsedError.error) ||
            errorMessage;
        } catch {
          errorDetails = { raw: String(error) };
          errorMessage = String(error);
        }
      } else {
        errorMessage = String(error) || errorMessage;
        errorDetails = { raw: error };
      }
      
      console.error('Error creating company:', { 
        error, 
        errorMessage,
        errorDetails,
        formData,
        errorType: typeof error,
        isError: error instanceof Error
      });
      
      toast.error(errorMessage);
    }
  };

  const handleEditCompany = async () => {
    if (!selectedCompany) return;

    try {
      if (!formData.name || !formData.contact_email) {
        toast.error('Nombre y email de contacto son obligatorios');
        return;
      }

      const companyData: CompanyMutationPayload = {
        name: formData.name,
        contact_email: formData.contact_email,
      };

      if (formData.contact_phone) {
        companyData.contact_phone = formData.contact_phone;
      }
      if (formData.address) {
        companyData.address = formData.address;
      }

      await updateCompanyMutation(selectedCompany.id, companyData);
      toast.success('Empresa actualizada exitosamente', 'Los cambios han sido guardados correctamente.');
      setIsEditDialogOpen(false);
      setSelectedCompany(null);
      resetForm();
      void reload();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error al actualizar empresa';
      toast.error(errorMessage);
    }
  };

  const handleDeleteCompany = async () => {
    if (!selectedCompany) return;

    const stats = companyStats[selectedCompany.id];
    if (stats && (stats.users > 0 || stats.components > 0)) {
      toast.error('No se puede eliminar una empresa con usuarios o componentes asociados');
      return;
    }

    try {
      await deleteCompanyMutation(selectedCompany.id);
      toast.success(`Empresa ${selectedCompany.name} eliminada exitosamente`, 'La empresa ha sido eliminada del sistema.');
      setIsDeleteDialogOpen(false);
      setSelectedCompany(null);
      void reload();
    } catch (error: unknown) {
      console.error('Error deleting company:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar empresa';
      toast.error(errorMessage);
    }
  };

  const openEditDialog = (company: Company) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name,
      contact_email: company.contact_email || '',
      contact_phone: company.contact_phone || '',
      address: company.address || '',
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (company: Company) => {
    setSelectedCompany(company);
    setIsDeleteDialogOpen(true);
  };

  const renderCompanyMobileCard = (company: Company) => {
    const stats = companyStats[company.id] || { users: 0, components: 0 };
    const canDelete = stats.users === 0 && stats.components === 0;

    return (
      <Card key={company.id} className="border-border/80 shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="font-medium leading-tight break-words">{company.name}</p>
              <p className="text-sm text-muted-foreground break-all">{company.contact_email}</p>
            </div>
            {canViewActivationStatus && (
              <Badge variant={company.is_active ? 'default' : 'secondary'}>
                {company.is_active ? 'Activa' : 'Inactiva'}
              </Badge>
            )}
          </div>

          {company.address && (
            <p className="text-sm text-muted-foreground break-words">{company.address}</p>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{stats.users} usuarios</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{stats.components} componentes</span>
            </div>
            <div className="col-span-2">
              <span className="font-medium text-foreground">Teléfono:</span>{' '}
              <span>{company.contact_phone || '-'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEditDialog(company)}
              aria-label={`Editar empresa ${company.name}`}
              className="mobile-action-button mobile-action-button--edit justify-center"
            >
              <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDeleteDialog(company)}
              disabled={!canDelete}
              aria-label={`Eliminar empresa ${company.name}`}
              className="mobile-action-button mobile-action-button--delete justify-center"
            >
              <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Eliminar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const emphasizedFieldClassName = 'border-transparent shadow-sm';
  const emphasizedFieldStyle = { borderColor: 'rgba(15, 23, 42, 0.14)' } as const;

  const renderCompanyFields = () => (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre de la Empresa *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Industrias Ejemplo S.A."
          className={emphasizedFieldClassName}
          style={emphasizedFieldStyle}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact_email">Email de Contacto *</Label>
        <Input
          id="contact_email"
          type="email"
          value={formData.contact_email}
          onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
          placeholder="contacto@empresa.com"
          className={emphasizedFieldClassName}
          style={emphasizedFieldStyle}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact_phone">Teléfono</Label>
        <Input
          id="contact_phone"
          value={formData.contact_phone}
          onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
          placeholder="+51912345678"
          className={emphasizedFieldClassName}
          style={emphasizedFieldStyle}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Dirección</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Av. Principal 123, Ciudad"
          className={emphasizedFieldClassName}
          style={emphasizedFieldStyle}
        />
      </div>
    </div>
  );

  const mobileDialogContentClassName =
    'max-w-[calc(100vw-1rem)] p-4 pt-6 max-h-[85vh] overflow-y-auto';

  // Solo admin y user_manager pueden gestionar empresas
  if (currentUser.role !== 'admin' && currentUser.role !== 'user_manager') {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No tienes permisos para gestionar empresas
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="management-card-header">
          <CardTitle className="flex items-center gap-2 text-lg leading-tight sm:text-xl">
            <Building2 className="h-6 w-6" />
            Gestión de Empresas
          </CardTitle>
          <CardDescription className="max-w-2xl text-sm leading-relaxed sm:text-base">
            Administrar empresas cliente del sistema
          </CardDescription>
          {isMobileViewport ? (
            <>
              <div className="management-create-button-wrap">
                <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }} className="management-create-button w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Empresa
                </Button>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className={mobileDialogContentClassName}>
                  <DialogHeader>
                    <DialogTitle>Crear Nueva Empresa</DialogTitle>
                    <DialogDescription>
                      Registrar una nueva empresa cliente
                    </DialogDescription>
                  </DialogHeader>
                  {renderCompanyFields()}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateCompany} className="management-primary-button">Crear Empresa</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <>
              <CardAction className="management-card-action">
                <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }} className="management-create-button shrink-0">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Empresa
                </Button>
              </CardAction>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Crear Nueva Empresa</DialogTitle>
                    <DialogDescription>
                      Registrar una nueva empresa cliente
                    </DialogDescription>
                  </DialogHeader>
                  {renderCompanyFields()}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateCompany} className="management-primary-button">Crear Empresa</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </CardHeader>
      </Card>

      {/* Tabla de Empresas */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div
              className="flex min-h-[420px] items-center justify-center rounded-md border border-dashed border-muted-foreground/25 bg-muted/30 px-4 text-center text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              Cargando empresas...
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay empresas registradas
            </div>
          ) : isMobileViewport ? (
            <div className="space-y-3">
              {companies.map((company) => renderCompanyMobileCard(company))}
            </div>
          ) : (
            <ResponsiveTable aria-label="Tabla de empresas">
              <ResponsiveTableHeader>
                <ResponsiveTableRow>
                  <ResponsiveTableHead>Empresa</ResponsiveTableHead>
                  <ResponsiveTableHead>Contacto</ResponsiveTableHead>
                  <ResponsiveTableHead>Teléfono</ResponsiveTableHead>
                  <ResponsiveTableHead>Usuarios</ResponsiveTableHead>
                  <ResponsiveTableHead>Componentes</ResponsiveTableHead>
                  {canViewActivationStatus && <ResponsiveTableHead>Estado</ResponsiveTableHead>}
                  <ResponsiveTableHead className="text-right">Acciones</ResponsiveTableHead>
                </ResponsiveTableRow>
              </ResponsiveTableHeader>
              <ResponsiveTableBody>
                {companies.map((company) => {
                  const stats = companyStats[company.id] || { users: 0, components: 0 };
                  return (
                    <ResponsiveTableRow key={company.id}>
                      <ResponsiveTableCell>
                        <div>
                          <div>{company.name}</div>
                          {company.address && (
                            <div className="text-sm text-muted-foreground">{company.address}</div>
                          )}
                        </div>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell>{company.contact_email}</ResponsiveTableCell>
                      <ResponsiveTableCell>{company.contact_phone || '-'}</ResponsiveTableCell>
                      <ResponsiveTableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          {stats.users}
                        </div>
                      </ResponsiveTableCell>
                      <ResponsiveTableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          {stats.components}
                        </div>
                      </ResponsiveTableCell>
                      {canViewActivationStatus && (
                        <ResponsiveTableCell>
                          <Badge variant={company.is_active ? 'default' : 'secondary'}>
                            {company.is_active ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </ResponsiveTableCell>
                      )}
                      <ResponsiveTableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(company)}
                            aria-label={`Editar empresa ${company.name}`}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(company)}
                            disabled={stats.users > 0 || stats.components > 0}
                            aria-label={`Eliminar empresa ${company.name}`}
                          >
                            <Trash2 className={`h-4 w-4 ${stats.users > 0 || stats.components > 0 ? 'text-muted-foreground opacity-40' : 'text-red-500'}`} aria-hidden="true" />
                          </Button>
                        </div>
                      </ResponsiveTableCell>
                    </ResponsiveTableRow>
                  );
                })}
              </ResponsiveTableBody>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>

      {isMobileViewport ? (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className={mobileDialogContentClassName}>
            <DialogHeader>
              <DialogTitle>Editar Empresa</DialogTitle>
              <DialogDescription>
                Actualizar información de la empresa
              </DialogDescription>
            </DialogHeader>
            {renderCompanyFields()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditCompany} className="management-primary-button">Guardar Cambios</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Empresa</DialogTitle>
              <DialogDescription>
                Actualizar información de la empresa
              </DialogDescription>
            </DialogHeader>
            {renderCompanyFields()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEditCompany} className="management-primary-button">Guardar Cambios</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteCompany}
        title="¿Eliminar empresa?"
        description={
          selectedCompany && companyStats[selectedCompany.id] && 
          (companyStats[selectedCompany.id].users > 0 || companyStats[selectedCompany.id].components > 0)
            ? `No se puede eliminar la empresa ${selectedCompany.name} porque tiene ${companyStats[selectedCompany.id].users} usuario(s) y ${companyStats[selectedCompany.id].components} componente(s) asociado(s). Primero debe eliminar o reasignar estos elementos.`
            : `Esta acción eliminará permanentemente la empresa ${selectedCompany?.name || ''}. Esta acción no se puede deshacer.`
        }
        confirmText="Eliminar Empresa"
        cancelText="Cancelar"
        variant="destructive"
      />
    </div>
  );
}
