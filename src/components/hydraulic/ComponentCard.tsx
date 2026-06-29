import { Card, CardContent, CardHeader } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Calendar, Wrench, FileText } from 'lucide-react';
import { type Component, STATUS_LABELS, STATUS_ORDER } from '../../lib/auth';
import { cn } from '../ui/utils';
import { getComponentStatusBadgeClass } from '../../lib/component-status-style';

interface ComponentCardProps {
  component: Component;
  onClick: () => void;
}

function getProgressPercentage(status: string) {
  const currentIndex = STATUS_ORDER.indexOf(status as any);
  return ((currentIndex + 1) / STATUS_ORDER.length) * 100;
}

export function ComponentCard({ component, onClick }: ComponentCardProps) {
  const progress = getProgressPercentage(component.estado);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  const ariaLabel = `Ver detalles de componente ${component.servicio_principal}, serie ${component.serial}, estado ${STATUS_LABELS[component.estado]}`;
  
  return (
    <Card 
      role="button"
      tabIndex={0}
      className="hover:shadow-lg transition-shadow cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
      onMouseEnter={() => {
        // Prefetch en hover para carga instantánea
        if (typeof window !== 'undefined') {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = `/components/${component.id}`;
          document.head.appendChild(link);
        }
      }}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-medium leading-none">{component.servicio_principal}</h3>
            <p className="text-sm text-muted-foreground">
              Serie: {component.serial}
            </p>
          </div>
          <Badge className={cn("text-xs", getComponentStatusBadgeClass(component.estado))}>
            {STATUS_LABELS[component.estado]}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="w-4 h-4 mr-2" />
          Ingreso: {new Date(component.fecha).toLocaleDateString('es-ES')}
        </div>
        
        {component.solicitud_general && (
          <div className="flex items-start text-sm text-muted-foreground">
            <FileText className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
            <p className="line-clamp-2">{component.solicitud_general}</p>
          </div>
        )}
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progreso</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="progress-track w-full rounded-full h-2" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label={`Progreso del componente: ${Math.round(progress)}%`}>
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          className="detail-view-button w-full"
        >
          <Wrench className="w-4 h-4 mr-2" />
          Ver Detalles
        </Button>
      </CardContent>
    </Card>
  );
}