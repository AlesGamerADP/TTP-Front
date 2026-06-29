import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Package,
  Building2,
  Plus,
  Calendar,
  FileText,
  Hash,
  Users
} from 'lucide-react';
import type { User } from '@/features/auth/model';
import { resolveCompanyName } from '@/features/companies/catalog';
import { useCompaniesCatalog } from '@/features/companies/hooks/useCompaniesCatalog';
import { createComponentMutation } from '@/features/components/mutations';
import { useIsMobile } from '../ui/use-mobile';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

interface ComponentIngressProps {
  currentUser: User;
  onBack: () => void;
  onComponentCreated?: (componentId: string) => void;
}

interface ComponentFormData {
  company_id: string;
  serial: string;
  servicio_principal: string;
  fecha: string;
  hoja_evaluacion_he: string;
  id_cotizacion: string;
  solicitud_general: string;
  atencion_persona: string;
  item_nro: string;
  cantidad: string;
  nro_actividad: string;
  descripcion_actividad: string;
}

export function ComponentIngress({ currentUser, onBack, onComponentCreated }: ComponentIngressProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMobile = useIsMobile();
  const {
    companies,
    isLoading: isLoadingCompanies,
  } = useCompaniesCatalog();
  const [formData, setFormData] = useState<ComponentFormData>({
    company_id: '',
    serial: '',
    servicio_principal: '',
    fecha: new Date().toISOString().split('T')[0], // Today's date
    hoja_evaluacion_he: '',
    id_cotizacion: '',
    solicitud_general: '',
    atencion_persona: '',
    item_nro: '1',
    cantidad: '1',
    nro_actividad: '',
    descripcion_actividad: ''
  });

  const handleInputChange = (field: keyof ComponentFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.company_id) {
      toast.error('Selecciona una empresa');
      return false;
    }
    if (!formData.serial.trim()) {
      toast.error('Ingresa el número de serie');
      return false;
    }
    if (!formData.servicio_principal.trim()) {
      toast.error('Ingresa el servicio principal');
      return false;
    }
    if (!formData.fecha) {
      toast.error('Selecciona la fecha de ingreso');
      return false;
    }
    if (!formData.hoja_evaluacion_he.trim()) {
      toast.error('Ingresa la hoja de evaluación HE');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const componentData = {
        company_id: formData.company_id,
        serial: formData.serial.trim(),
        servicio_principal: formData.servicio_principal.trim(),
        fecha: formData.fecha,
        hoja_evaluacion_he: formData.hoja_evaluacion_he.trim(),
        id_cotizacion: formData.id_cotizacion.trim() || undefined,
        solicitud_general: formData.solicitud_general.trim() || undefined,
        atencion_persona: formData.atencion_persona.trim() || undefined,
        item_nro: formData.item_nro ? Number(formData.item_nro) : 1,
        cantidad: formData.cantidad ? Number(formData.cantidad) : 1,
        nro_actividad: formData.nro_actividad.trim() || undefined,
        descripcion_actividad: formData.descripcion_actividad.trim() || undefined,
        created_by: currentUser?.id || 'unknown'
      };
      
      const newComponent = await createComponentMutation(componentData);
      const companyName = resolveCompanyName(formData.company_id, companies);
      
      toast.success(`Componente ${newComponent.serial} ingresado exitosamente para ${companyName}`);
      
      if (onComponentCreated) {
        onComponentCreated(newComponent.id);
      } else {
        setFormData({
          company_id: '',
          serial: '',
          servicio_principal: '',
          fecha: new Date().toISOString().split('T')[0],
          hoja_evaluacion_he: '',
          id_cotizacion: '',
          solicitud_general: '',
          atencion_persona: '',
          item_nro: '1',
          cantidad: '1',
          nro_actividad: '',
          descripcion_actividad: ''
        });
      }
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al ingresar el componente';
      console.error('Error al ingresar componente:', error);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-shell min-h-screen">
      {/* Header */}
      <header className="app-subheader sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isMobile ? (
            <div className="flex flex-col gap-2 py-3">
              <div className="flex items-center justify-between gap-2">
                <Button variant="ghost" size="sm" onClick={onBack} className="back-nav-button shrink-0 px-2">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Volver
                </Button>
                <div className="flex items-center gap-2 shrink-0">
                  <ThemeToggle />
                  <Badge variant="secondary" className="ingress-badge text-xs shrink-0">
                    NUEVO INGRESO
                  </Badge>
                </div>
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold leading-tight">Ingreso de Componentes</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Registrar nuevos componentes en el sistema
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" onClick={onBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <div>
                  <h1 className="text-xl font-semibold">Ingreso de Componentes</h1>
                  <p className="text-sm text-muted-foreground">
                    Registrar nuevos componentes en el sistema
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <ThemeToggle />
                <Badge variant="secondary" className="ingress-badge">
                  NUEVO INGRESO
                </Badge>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              Formulario de Ingreso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Empresa */}
                <div className="space-y-2">
                  <Label htmlFor="company">
                    <Building2 className="w-4 h-4 inline mr-2" />
                    Empresa *
                  </Label>
                  <Select 
                    value={formData.company_id} 
                    onValueChange={(value) => handleInputChange('company_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar empresa..." />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingCompanies ? (
                        <SelectItem value="loading" disabled>
                          Cargando empresas...
                        </SelectItem>
                      ) : companies.length === 0 ? (
                        <SelectItem value="no-companies" disabled>
                          No hay empresas disponibles
                        </SelectItem>
                      ) : (
                        companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {/* Fecha de Ingreso */}
                <div className="space-y-2">
                  <Label htmlFor="fecha">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Fecha de Ingreso *
                  </Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => handleInputChange('fecha', e.target.value)}
                    required
                  />
                </div>

                {/* Número de Serie */}
                <div className="space-y-2">
                  <Label htmlFor="serial">
                    <Hash className="w-4 h-4 inline mr-2" />
                    Número de Serie *
                  </Label>
                  <Input
                    id="serial"
                    type="text"
                    placeholder="Ej: HYD-2024-004"
                    value={formData.serial}
                    onChange={(e) => handleInputChange('serial', e.target.value)}
                    required
                  />
                </div>

                {/* Servicio Principal */}
                <div className="space-y-2">
                  <Label htmlFor="servicio_principal">
                    <Package className="w-4 h-4 inline mr-2" />
                    Servicio Principal *
                  </Label>
                  <Input
                    id="servicio_principal"
                    type="text"
                    placeholder="Ej: Reparación de Bomba Hidráulica"
                    value={formData.servicio_principal}
                    onChange={(e) => handleInputChange('servicio_principal', e.target.value)}
                    required
                  />
                </div>

                {/* Hoja de Evaluación HE */}
                <div className="space-y-2">
                  <Label htmlFor="hoja_evaluacion_he">
                    <FileText className="w-4 h-4 inline mr-2" />
                    Hoja Evaluación HE *
                  </Label>
                  <Input
                    id="hoja_evaluacion_he"
                    type="text"
                    placeholder="Ej: HE-2026-042"
                    value={formData.hoja_evaluacion_he}
                    onChange={(e) => handleInputChange('hoja_evaluacion_he', e.target.value)}
                    required
                  />
                </div>

                {/* Número de Cotización (id_cotizacion) */}
                <div className="space-y-2">
                  <Label htmlFor="id_cotizacion">
                    <Hash className="w-4 h-4 inline mr-2" />
                    Nº de Cotización
                  </Label>
                  <Input
                    id="id_cotizacion"
                    type="text"
                    placeholder="Ej: COT-2026-098"
                    value={formData.id_cotizacion}
                    onChange={(e) => handleInputChange('id_cotizacion', e.target.value)}
                  />
                </div>

                {/* Persona de Atención */}
                <div className="space-y-2">
                  <Label htmlFor="atencion_persona">
                    <Users className="w-4 h-4 inline mr-2" />
                    Atención (Persona de Contacto)
                  </Label>
                  <Input
                    id="atencion_persona"
                    type="text"
                    placeholder="Ej: Ing. Juan Pérez"
                    value={formData.atencion_persona}
                    onChange={(e) => handleInputChange('atencion_persona', e.target.value)}
                  />
                </div>

                {/* Item Nro */}
                <div className="space-y-2">
                  <Label htmlFor="item_nro">
                    <Hash className="w-4 h-4 inline mr-2" />
                    Item Nro
                  </Label>
                  <Input
                    id="item_nro"
                    type="number"
                    min="1"
                    value={formData.item_nro}
                    onChange={(e) => handleInputChange('item_nro', e.target.value)}
                  />
                </div>

                {/* Cantidad */}
                <div className="space-y-2">
                  <Label htmlFor="cantidad">
                    <Hash className="w-4 h-4 inline mr-2" />
                    Cantidad
                  </Label>
                  <Input
                    id="cantidad"
                    type="number"
                    min="1"
                    value={formData.cantidad}
                    onChange={(e) => handleInputChange('cantidad', e.target.value)}
                  />
                </div>

                {/* Nro Actividad */}
                <div className="space-y-2">
                  <Label htmlFor="nro_actividad">
                    <Hash className="w-4 h-4 inline mr-2" />
                    Nro Actividad
                  </Label>
                  <Input
                    id="nro_actividad"
                    type="text"
                    placeholder="Ej: ACT-001"
                    value={formData.nro_actividad}
                    onChange={(e) => handleInputChange('nro_actividad', e.target.value)}
                  />
                </div>

                {/* Descripción Actividad */}
                <div className="space-y-2">
                  <Label htmlFor="descripcion_actividad">
                    <FileText className="w-4 h-4 inline mr-2" />
                    Descripción Actividad
                  </Label>
                  <Input
                    id="descripcion_actividad"
                    type="text"
                    placeholder="Ej: Desmontaje y cambio de sellos"
                    value={formData.descripcion_actividad}
                    onChange={(e) => handleInputChange('descripcion_actividad', e.target.value)}
                  />
                </div>
              </div>

              {/* Solicitud General (observaciones) */}
              <div className="space-y-2">
                <Label htmlFor="solicitud_general">
                  <FileText className="w-4 h-4 inline mr-2" />
                  Solicitud General
                </Label>
                <Textarea
                  id="solicitud_general"
                  placeholder="Describe la solicitud general del servicio..."
                  rows={3}
                  value={formData.solicitud_general}
                  onChange={(e) => handleInputChange('solicitud_general', e.target.value)}
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? (
                    'Ingresando...'
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Ingresar Componente
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium mb-1">Información importante</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Los campos marcados con (*) son obligatorios</li>
                  <li>• El componente se registrará automáticamente en estado &quot;Ingreso&quot;</li>
                  <li>• El código ITE es obligatorio para todos los componentes</li>
                  <li>• Una vez ingresado, el componente aparecerá en el dashboard de la empresa seleccionada</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}