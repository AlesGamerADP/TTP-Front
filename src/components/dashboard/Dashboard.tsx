'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ComponentCard } from '../components/ComponentCard';
import { PaginationControls } from '../common/PaginationControls';
import { ComponentCardSkeleton, StatsCardSkeleton } from '../common/LoadingStates';
import { useToast } from '../../hooks/useToast';
import {
  User,
  LogOut,
  Search,
  Filter,
  Building2,
  Package,
  Clock,
  CheckCircle
} from 'lucide-react';
import {
  type User as UserType,
  type Component,
  type ComponentStatus,
  STATUS_LABELS,
  logout
} from '../../lib/auth';
import {
  getComponentsByCompanyPaginated,
  getComponentStats,
  type PaginatedResponse
} from '../../lib/data-service';
import { getCurrentSessionUser } from '@/features/auth/session';
import { isConnectionApiError, isUnauthorizedApiError } from '@/lib/api-errors';
import { useDebounce } from '../../hooks/useDebounce';
import { logger } from '../../lib/logger';
import { getRoleLabel, shouldShowRoleBadge } from '../../lib/user-display';
import { useVisibilityPolling } from '@/features/shared/hooks/useVisibilityPolling';
import { useCompaniesCatalog } from '@/features/companies/hooks/useCompaniesCatalog';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

interface DashboardProps {
  user: UserType;
  onLogout: () => void;
  onComponentSelect: (component: Component) => void;
}

export function Dashboard({ user, onLogout, onComponentSelect }: DashboardProps) {
  const companyId = user.company_id ?? '';
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [components, setComponents] = useState<PaginatedResponse<Component> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const toast = useToast();

  const debouncedSearchTerm = useDebounce(searchTerm, 200);
  const { companies } = useCompaniesCatalog();
  const companyName = useMemo(
    () => companies.find((company) => company.id === companyId)?.name ?? 'Empresa no encontrada',
    [companies, companyId],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(max-width: 639px)');
    const updateViewport = (matches: boolean) => setIsMobileViewport(matches);

    updateViewport(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      updateViewport(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const loadComponents = useCallback(async (options?: { suppressErrorToast?: boolean }) => {
    setIsLoading(true);
    try {
      // Las cookies httpOnly se envían automáticamente, no necesitamos verificarlas
      const response = await getComponentsByCompanyPaginated(companyId, {
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearchTerm,
        status: statusFilter !== 'all' ? statusFilter as ComponentStatus : undefined
      });
      logger.debug('Client components loaded', {
        count: response.data.length,
        companyId,
        page: currentPage
      });
      setComponents(response);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (isUnauthorizedApiError(error) || isConnectionApiError(error)) {
        logger.warn('Carga de componentes diferida (sesión o red)', {
          userId: user.id,
          companyId,
          error: errorMessage,
        });
      } else {
        logger.error('Error loading client components', {
          error,
          userId: user.id,
          companyId,
        });
        if (!options?.suppressErrorToast) {
          toast.error(
            'Error al cargar componentes',
            'No se pudieron cargar los componentes. Por favor, intenta recargar la página.',
            { id: 'dashboard-load-components-error' },
          );
        }
        setComponents(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [companyId, currentPage, itemsPerPage, debouncedSearchTerm, statusFilter, toast, user.id]);

  const loadStats = useCallback(async () => {
    try {
      // Las cookies httpOnly se envían automáticamente, no necesitamos verificarlas
      const statsData = await getComponentStats();
      setStats(statsData);
    } catch (error: unknown) {
      if (isUnauthorizedApiError(error) || isConnectionApiError(error)) {
        logger.warn('Estadísticas diferidas (sesión o red)', { userId: user.id });
      } else {
        logger.error('Error loading client stats', { error, userId: user.id });
      }
    }
  }, [user.id]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      try {
        await getCurrentSessionUser();
      } catch {
        // La sesión puede establecerse en el siguiente intento
      }
      if (!cancelled) {
        await loadComponents();
      }
    };

    void boot();

    return () => {
      cancelled = true;
    };
  }, [loadComponents]);

  useVisibilityPolling(
    () =>
      Promise.all([
        loadComponents({ suppressErrorToast: true }),
        loadStats(),
      ]).then(() => undefined),
  );

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [debouncedSearchTerm, statusFilter]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleItemsPerPageChange = useCallback((newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  }, []);

  // Estadísticas de la empresa específica
  const companyStats = stats ? {
    total: stats.byCompany[companyId] || 0,
    inProgress: components?.data.filter(c => c.estado !== 'despachado').length || 0,
    completed: components?.data.filter(c => c.estado === 'despachado').length || 0
  } : null;

  const handleLogout = () => {
    logger.info('User logging out from client dashboard', { userId: user.id });
    logout();
    onLogout();
  };

  return (
    <div className="app-shell min-h-screen">
      {/* Header */}
      <header role="banner" className="app-header sticky top-0 z-50 border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-0 sm:gap-3 py-3 sm:py-0 sm:h-16">
            <div className="app-brand-block flex-1 pr-2">
              <div className="app-brand-icon">
                <Package />
              </div>
              <div className="app-brand-copy flex-1">
                <h1 className="app-brand-heading text-sm sm:text-lg md:text-xl truncate">
                  Portal de Mantenimiento
                </h1>
                <p className="app-brand-muted text-xs sm:text-sm truncate">
                  {companyName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
              <div className="header-user-chip flex items-center gap-1.5 px-2 py-1.5 min-w-0 max-w-[7rem] sm:max-w-none bg-transparent" title={user.codigo}>
                <User className="app-brand-text w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="app-brand-text text-xs sm:text-sm font-medium truncate">
                  {user.codigo}
                </span>
                {shouldShowRoleBadge(user.codigo, user.role) && (
                  <Badge variant="outline" className="app-brand-text border-border text-xs font-normal px-1.5 py-0 hidden lg:inline-flex shrink-0 bg-transparent">
                    {getRoleLabel(user.role)}
                  </Badge>
                )}
              </div>

              <ThemeToggle />

              <Button
                onClick={handleLogout}
                size="sm"
                aria-label="Cerrar Sesión"
                title="Cerrar Sesión"
                className="header-action-button header-action-button--danger font-medium px-2.5 sm:px-3 md:px-4 py-2 h-9 rounded-md active:scale-[0.98] text-xs sm:text-sm shrink-0"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                {!isMobileViewport && <span>Cerrar Sesión</span>}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {!companyStats ? (
            <>
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Componentes</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{companyStats.total}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{companyStats.inProgress}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completados</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{companyStats.completed}</div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filtros de Búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={
                      isMobileViewport
                        ? 'Serie, modelo, ITE...'
                        : 'Buscar por serie, modelo, ITE o número de cotización...'
                    }
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Mis Componentes</h2>
            {components?.pagination && (
              <span className="text-sm text-muted-foreground">
                {components.pagination.total} componentes totales
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: itemsPerPage }).map((_, i) => (
                <ComponentCardSkeleton key={i} />
              ))}
            </div>
          ) : !components?.data.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No se encontraron componentes</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Intenta ajustar los filtros de búsqueda'
                    : 'No tienes componentes registrados en este momento'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {components.data.map((component) => (
                  <ComponentCard
                    key={component.id}
                    component={component}
                    onClick={() => onComponentSelect(component)}
                  />
                ))}
              </div>

              {components.pagination.totalPages > 1 && (
                <PaginationControls
                  currentPage={components.pagination.page}
                  totalPages={components.pagination.totalPages}
                  totalItems={components.pagination.total}
                  itemsPerPage={itemsPerPage}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={handleItemsPerPageChange}
                  isLoading={isLoading}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}