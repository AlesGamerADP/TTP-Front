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
  Hash
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
  modelo: string;
  fecha_ingreso: string;
  ite: string;
  numero_cotizacion: string; // Número de cotización (código/referencia)
  observaciones: string;
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
    modelo: '',
    fecha_ingreso: new Date().toISOString().split('T')[0], // Today's date
    ite: '',
    numero_cotizacion: '', // Número de cotización
    observaciones: ''
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
    if (!formData.modelo.trim()) {
      toast.error('Ingresa el modelo del componente');
      return false;
    }
    if (!formData.fecha_ingreso) {
      toast.error('Selecciona la fecha de ingreso');
      return false;
    }
    if (!formData.ite.trim()) {
      toast.error('Ingresa el código ITE');
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
        modelo: formData.modelo.trim(),
        fecha_ingreso: formData.fecha_ingreso,
        ite: formData.ite.trim(),
        numero_cotizacion: formData.numero_cotizacion.trim() || undefined,
        observaciones: formData.observaciones.trim() || undefined,
        created_by: currentUser?.id || 'unknown'
      };
      
      const newComponent = await createComponentMutation(componentData);
      const companyName = resolveCompanyName(formData.company_id, companies);
      
      toast.success(`Componente ${newComponent.serial} ingresado exitosamente para ${companyName}`);
      
      // Si hay callback para navegar al detalle, llamarlo con el ID del componente creado
      if (onComponentCreated) {
        onComponentCreated(newComponent.id);
      } else {
        // Si no hay callback, resetear el formulario (comportamiento anterior)
        setFormData({
          company_id: '',
          serial: '',
          modelo: '',
          fecha_ingreso: new Date().toISOString().split('T')[0],
          ite: '',
          numero_cotizacion: '',
          observaciones: ''
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
                  <Label htmlFor="fecha_ingreso">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Fecha de Ingreso *
                  </Label>
                  <Input
                    id="fecha_ingreso"
                    type="date"
                    value={formData.fecha_ingreso}
                    onChange={(e) => handleInputChange('fecha_ingreso', e.target.value)}
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

                {/* Modelo */}
                <div className="space-y-2">
                  <Label htmlFor="modelo">
                    <Package className="w-4 h-4 inline mr-2" />
                    Modelo *
                  </Label>
                  <Input
                    id="modelo"
                    type="text"
                    placeholder="Ej: Bomba Centrífuga 200HP"
                    value={formData.modelo}
                    onChange={(e) => handleInputChange('modelo', e.target.value)}
                    required
                  />
                </div>

                {/* ITE */}
                <div className="space-y-2">
                  <Label htmlFor="ite">
                    <FileText className="w-4 h-4 inline mr-2" />
                    ITE *
                  </Label>
                  <Input
                    id="ite"
                    type="text"
                    placeholder="Ej: COT-2024-008"
                    value={formData.ite}
                    onChange={(e) => handleInputChange('ite', e.target.value)}
                    required
                  />
                </div>

                {/* Número de Cotización */}
                <div className="space-y-2">
                  <Label htmlFor="numero_cotizacion">
                    <Hash className="w-4 h-4 inline mr-2" />
                    Número de Cotización
                  </Label>
                  <Input
                    id="numero_cotizacion"
                    type="text"
                    placeholder="Ej: COT-2024-008"
                    value={formData.numero_cotizacion}
                    onChange={(e) => handleInputChange('numero_cotizacion', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Número de referencia asignado a este ingreso
                  </p>
                </div>
              </div>

              {/* Observaciones */}
              <div className="space-y-2">
                <Label htmlFor="observaciones">
                  <FileText className="w-4 h-4 inline mr-2" />
                  Observaciones
                </Label>
                <Textarea
                  id="observaciones"
                  placeholder="Describe el estado del componente, motivo de ingreso, etc..."
                  rows={4}
                  value={formData.observaciones}
                  onChange={(e) => handleInputChange('observaciones', e.target.value)}
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