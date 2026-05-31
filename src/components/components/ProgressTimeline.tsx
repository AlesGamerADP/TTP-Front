import { CheckCircle, Circle, Clock } from 'lucide-react';
import { STATUS_ORDER, STATUS_LABELS, type ComponentStatus } from '../../lib/auth';
import { cn } from '../ui/utils';

interface ProgressTimelineProps {
  currentStatus: ComponentStatus;
  className?: string;
}

export function ProgressTimeline({ currentStatus, className }: ProgressTimelineProps) {
  const currentIndex = STATUS_ORDER.indexOf(currentStatus);

  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="text-lg font-medium">Progreso del Componente</h3>
      <div className="space-y-3">
        {STATUS_ORDER.map((status, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div key={status} className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {isCompleted ? (
                  isCurrent ? (
                    <Clock className="w-5 h-5 text-blue-600" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )
                ) : (
                  <Circle className="w-5 h-5 timeline-inactive-dot" />
                )}
              </div>
              
              <div className="flex-1">
                <p className={cn(
                  "text-sm",
                  isCompleted ? "text-foreground" : "text-muted-foreground",
                  isCurrent && "font-medium text-blue-600"
                )}>
                  {STATUS_LABELS[status]}
                </p>
              </div>
              
              {isCurrent && (
                <div className="flex-shrink-0">
                  <span className="progress-in-progress-badge inline-flex items-center px-2 py-1 rounded-full text-xs">
                    En progreso
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}