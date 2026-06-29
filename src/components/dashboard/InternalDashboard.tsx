'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { PaginationControls } from '../common/PaginationControls';
import { ComponentListSkeleton } from '../common/LoadingStates';
import { useToast } from '../../hooks/useToast';
import {
  User,
  LogOut,
  Search,
  Building2,
  LayoutDashboard,
  Package,
  Plus,
  Eye,
  Calendar,
  Hash,
  Users,
  Settings
} from 'lucide-react';
import {
  type User as UserType,
  type Component,
  type ComponentStatus,
  STATUS_LABELS,
  logout,
} from '../../lib/auth';
import { type User as UserManagementType } from '../../lib/types';
import {
  getComponentsPaginatedWithRetry,
  getComponentStats,
  type PaginatedResponse
} from '../../lib/data-service';
import { getCurrentSessionUser } from '@/features/auth/session';
import { isConnectionApiError, isUnauthorizedApiError } from '@/lib/api-errors';
import { useDebounce } from '../../hooks/useDebounce';
import { logger } from '../../lib/logger';
import { getComponentStatusBadgeClass } from '../../lib/component-status-style';
import { getRoleLabel, shouldShowRoleBadge } from '../../lib/user-display';
import { useIsMobile } from '../ui/use-mobile';
import { useCompaniesCatalog } from '@/features/companies/hooks/useCompaniesCatalog';
import { resolveCompanyName } from '@/features/companies/catalog';
import { useRoleAccess } from '@/features/auth/hooks/useRoleAccess';
import { useVisibilityPolling } from '@/features/shared/hooks/useVisibilityPolling';
import { useComponentRealtime } from '@/features/components/realtime/useComponentRealtime';
import { loadDashboardFiltersPersistent, saveDashboardFilters } from '@/lib/dashboard-filters-storage';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

const UserManagement = dynamic(() => import('../management/UserManagement'), {
  loading: () => (
    <Card>
      <CardContent className="py-12 text-center text-sm text-muted-foreground">
        Cargando gestión de usuarios...
      </CardContent>
    </Card>
  ),
});

const CompanyManagement = dynamic(() => import('../management/CompanyManagement'), {
  loading: () => (
    <Card>
      <CardContent className="py-12 text-center text-sm text-muted-foreground">
        Cargando gestión de empresas...
      </CardContent>
    </Card>
  ),
});

interface InternalDashboardProps {
  user: UserType;
  onLogout: () => void;
  onComponentSelect: (component: Component) => void;
  onIngressClick: () => void;
}

export function InternalDashboard({ user, onLogout, onComponentSelect, onIngressClick }: InternalDashboardProps) {
  const access = useRoleAccess(user.role);
  const canAccessComponents = user.role !== 'user_manager';
  const savedFilters = loadDashboardFiltersPersistent('internal');
  const [searchTerm, setSearchTerm] = useState(savedFilters.search ?? '');
  const [selectedCompany, setSelectedCompany] = useState(savedFilters.companyId ?? 'all');
  const [selectedStatus, setSelectedStatus] = useState(savedFilters.status ?? 'all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const isMobileViewport = useIsMobile();
  const [components, setComponents] = useState<PaginatedResponse<Component> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const toast = useToast();

  useEffect(() => {
    saveDashboardFilters('internal', {
      search: searchTerm,
      status: selectedStatus,
      companyId: selectedCompany,
    });
  }, [searchTerm, selectedCompany, selectedStatus]);

  const { companies } = useCompaniesCatalog({ autoLoad: canAccessComponents });

  const getCompanyLabel = useCallback(
    (component: Component) =>
      resolveCompanyName(component.company_id, companies, component.company_name),
    [companies],
  );

  const debouncedSearchTerm = useDebounce(searchTerm, 200);

  const loadComponents = useCallback(async (options?: { suppressErrorToast?: boolean }) => {
    setIsLoading(true);
    try {
      // Las cookies httpOnly se envían automáticamente, no necesitamos verificarlas
      const response = await getComponentsPaginatedWithRetry({
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearchTerm,
        companyId: selectedCompany !== 'all' ? selectedCompany : undefined,
        status: selectedStatus !== 'all' ? selectedStatus as ComponentStatus : undefined,
      });
      logger.debug('Components loaded', {
        count: response.data.length,
        page: currentPage,
        total: response.pagination.total
      });
      setComponents(response);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (isUnauthorizedApiError(error) || isConnectionApiError(error)) {
        logger.warn('Carga de componentes diferida (sesión o red)', {
          userId: user.id,
          error: errorMessage,
        });
      } else {
        logger.error('Error loading components', { error, userId: user.id });
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
  }, [currentPage, itemsPerPage, debouncedSearchTerm, selectedCompany, selectedStatus, toast, user.id]);

  const loadStats = useCallback(async () => {
    try {
      // Las cookies httpOnly se envían automáticamente, no necesitamos verificarlas
      const statsData = await getComponentStats();
      setStats(statsData);
    } catch (error: any) {
      // Si el error es "Missing token", no loguear como error crítico
      if (isUnauthorizedApiError(error) || isConnectionApiError(error)) {
        logger.warn('Estadísticas diferidas (sesión o red)', { userId: user.id });
      } else {
        logger.error('Error loading stats', { error, userId: user.id });
      }
    }
  }, [user.id]);

  useEffect(() => {
    if (!canAccessComponents) return;

    void getComponentStats().then((data) => {
      setStats(data);
    }).catch((err) => {
      logger.error('Error cargando empresas o estadísticas del dashboard', { err });
    });
  }, [canAccessComponents]);

  useEffect(() => {
    if (!canAccessComponents) return;

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
  }, [canAccessComponents, loadComponents]);

  useVisibilityPolling(
    () =>
      Promise.all([
        loadComponents({ suppressErrorToast: true }),
        loadStats(),
      ]).then(() => undefined),
    {
      enabled: canAccessComponents,
    },
  );

  useComponentRealtime({
    enabled: canAccessComponents,
    onEvent: () => {
      void Promise.all([
        loadComponents({ suppressErrorToast: true }),
        loadStats(),
      ]);
    },
  });

  useEffect(() => {
    if (!canAccessComponents) return;
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [canAccessComponents, debouncedSearchTerm, selectedCompany, selectedStatus]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleItemsPerPageChange = useCallback((newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  }, []);

  const router = useRouter();

  const prefetchComponentDetail = useCallback((componentId: string) => {
    router.prefetch(`/components/${componentId}`);
    void import('@/components/hydraulic/ComponentDetail');
  }, [router]);

  const renderComponentListItem = useCallback((component: Component, options?: { showCompany?: boolean }) => {
    const showCompany = options?.showCompany ?? false;

    if (isMobileViewport) {
      return (
        <div
          key={component.id}
          data-testid="component-row"
          className="rounded-xl border border-border/80 p-4 shadow-sm transition-colors hover:bg-muted/30"
        >
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="font-medium leading-tight break-words">{component.servicio_principal}</p>
              <div className="flex items-center text-sm text-muted-foreground">
                <Hash className="mr-1 h-3 w-3 shrink-0" />
                <span className="break-all">{component.serial}</span>
              </div>
            </div>

            {showCompany && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="break-words">
                  {getCompanyLabel(component)}
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Badge className={getComponentStatusBadgeClass(component.estado)}>
                {STATUS_LABELS[component.estado]}
              </Badge>
              <span className="flex items-center text-sm text-muted-foreground">
                <Calendar className="mr-1 h-4 w-4 shrink-0" />
                {new Date(component.fecha).toLocaleDateString('es-ES')}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="detail-view-button w-full justify-center"
              onMouseEnter={() => prefetchComponentDetail(component.id)}
              onClick={() => onComponentSelect(component)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Ver Detalle
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div
        key={component.id}
        data-testid="component-row"
        className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
      >
        <div
          className="grid flex-1 grid-cols-1 gap-4 md:items-center"
          style={{
            gridTemplateColumns: showCompany
              ? 'minmax(0, 1.8fr) minmax(0, 1.2fr) minmax(0, 1.1fr) minmax(0, 1fr) auto'
              : 'minmax(0, 2.2fr) minmax(0, 1.25fr) minmax(0, 1fr) auto',
          }}
        >
          <div className="min-w-0">
            <p className="font-medium">{component.servicio_principal}</p>
            <div className="flex items-center text-sm text-muted-foreground">
              <Hash className="mr-1 h-3 w-3" />
              <span className="truncate">{component.serial}</span>
            </div>
          </div>

          {showCompany && (
            <div className="min-w-0">
              <div className="flex items-center text-sm">
                <Building2 className="mr-1 h-4 w-4 text-muted-foreground" />
                <span className="truncate">
                  {getCompanyLabel(component)}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center">
            <Badge className={getComponentStatusBadgeClass(component.estado)}>
              {STATUS_LABELS[component.estado]}
            </Badge>
          </div>

          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="mr-1 h-4 w-4" />
            {new Date(component.fecha).toLocaleDateString('es-ES')}
          </div>

          <div className="flex items-center justify-end">
            <Button
              variant="outline"
              size="sm"
              className="detail-view-button"
              onMouseEnter={() => prefetchComponentDetail(component.id)}
              onClick={() => onComponentSelect(component)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Ver Detalle
            </Button>
          </div>
        </div>
      </div>
    );
  }, [getCompanyLabel, isMobileViewport, onComponentSelect, prefetchComponentDetail]);

  const componentsByCompany = useMemo(() => {
    if (!components?.data) return {};

    const grouped: Record<string, Component[]> = {};
    components.data.forEach(component => {
      if (component.company_id) {
        if (!grouped[component.company_id]) {
          grouped[component.company_id] = [];
        }
        grouped[component.company_id].push(component);
      }
    });
    return grouped;
  }, [components?.data]);

  const handleLogout = () => {
    logger.info('User logging out from internal dashboard', { userId: user.id });
    logout();
    onLogout();
  };

  const getCompanyStats = (companyId: string) => {
    if (!stats) return { total: 0, inProgress: 0 };
    const total = stats.byCompany[companyId] || 0;
    const companyComponents = componentsByCompany[companyId] || [];
    const inProgress = companyComponents.filter(c => c.estado !== 'despachado').length;
    return { total, inProgress };
  };

  return (
    <div className="app-shell min-h-screen">
      {/* Header */}
      <header role="banner" className="app-header sticky top-0 z-50 border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {isMobileViewport ? (
            <div className="flex flex-col gap-2 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="app-brand-block flex-1">
                  <div className="app-brand-icon">
                    <LayoutDashboard />
                  </div>
                  <h1 className="app-brand-heading text-sm truncate">
                    Panel Administrativo
                  </h1>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <ThemeToggle />
                  <Button
                  onClick={handleLogout}
                  size="sm"
                  aria-label="Cerrar Sesión"
                  title="Cerrar Sesión"
                  className="header-action-button header-action-button--danger h-9 w-9 p-0 rounded-md shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="header-user-chip flex items-center gap-1.5 min-w-0 bg-transparent">
                  <User className="app-brand-text w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="app-brand-text text-sm font-medium truncate">
                    {user.codigo}
                  </span>
                </div>

                {access.canAccessIngress && user.role === 'interno' && (
                  <Button
                    onClick={onIngressClick}
                    size="sm"
                    className="header-action-button header-action-button--warning font-semibold h-9 rounded-md text-xs px-3 shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Nuevo Ingreso
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between h-16 gap-3">
              <div className="app-brand-block flex-1">
                <div className="app-brand-icon">
                  <LayoutDashboard />
                </div>
                <div className="app-brand-copy">
                  <h1 className="app-brand-heading text-lg md:text-xl truncate">
                    Panel Administrativo
                  </h1>
                  <p className="app-brand-muted text-sm truncate">
                    {user.role === 'user_manager'
                      ? 'Gestión de usuarios y empresas'
                      : 'Gestión de componentes hidráulicos'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {access.canAccessIngress && user.role === 'interno' && (
                  <Button
                    onClick={onIngressClick}
                    size="sm"
                    className="header-action-button header-action-button--warning font-semibold h-9 rounded-md px-3 text-sm"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Nuevo Ingreso
                  </Button>
                )}

                <div className="header-user-chip flex items-center gap-2 px-3 py-2 shrink-0 bg-transparent">
                  <User className="app-brand-text w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="app-brand-text text-sm font-medium whitespace-nowrap">
                    {user.codigo}
                  </span>
                  {shouldShowRoleBadge(user.codigo, user.role) && (
                    <Badge variant="outline" className="app-brand-text border-border text-xs font-normal px-2 py-0 hidden xl:inline-flex shrink-0 bg-transparent">
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
                  className="header-action-button header-action-button--danger font-medium px-3 py-2 h-9 rounded-md text-sm"
                >
                  <LogOut className="w-4 h-4 mr-1.5" />
                  Cerrar Sesión
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main id="main-content" className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {canAccessComponents && (
        <Card className="mb-4 sm:mb-6">
          <CardContent className="pt-4 sm:pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder={
                      isMobileViewport
                        ? 'Serie, servicio, HE...'
                        : 'Buscar por serie, servicio principal, HE o Nº de cotización...'
                    }
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="app-filter-control border-transparent pl-10 shadow-sm text-sm sm:text-base"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Empresa</label>
                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                  <SelectTrigger
                    className="app-filter-control border-transparent shadow-sm"
                  >
                    <SelectValue placeholder="Todas las empresas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las empresas</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger
                    className="app-filter-control border-transparent shadow-sm"
                  >
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([status, label]) => (
                      <SelectItem key={status} value={status}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Resultados</label>
                <div
                  className="app-filter-control h-10 flex items-center px-3 bg-muted rounded-md border shadow-sm"
                >
                  <span className="text-sm font-medium">
                    {isLoading ? 'Cargando...' : `${components?.pagination.total || 0} componentes`}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        <Tabs
          defaultValue={user.role === 'user_manager' ? 'users' : access.isInternal ? 'by-company' : 'all-components'}
          className="space-y-6 w-full min-h-[min(65vh,720px)]"
        >
          {user.role === 'user_manager' ? (
            <TabsList
              className="!grid !h-auto !w-full !max-w-full"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                width: '100%',
                maxWidth: '100%',
                gap: '0.25rem'
              }}
            >
              <TabsTrigger value="users" className="h-auto w-full whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm">
                <Users className="h-4 w-4" />
                Gestión de Usuarios
              </TabsTrigger>
              <TabsTrigger value="companies" className="h-auto w-full whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm">
                <Settings className="h-4 w-4" />
                Empresas
              </TabsTrigger>
            </TabsList>
          ) : access.isInternal ? (
            <TabsList
              className="!grid !h-auto !w-full !max-w-full"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                width: '100%',
                maxWidth: '100%',
                gap: '0.25rem'
              }}
            >
              <TabsTrigger value="by-company" className="h-auto w-full whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm">
                <Building2 className="h-4 w-4" />
                Por Empresa
              </TabsTrigger>
              <TabsTrigger value="all-components" className="h-auto w-full whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm">
                <Package className="h-4 w-4" />
                Todos
              </TabsTrigger>
            </TabsList>
          ) : (
            <TabsList
              className="!grid !h-auto !w-full !max-w-full"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                width: '100%',
                maxWidth: '100%',
                gap: '0.25rem'
              }}
            >
              <TabsTrigger value="all-components" className="h-auto w-full whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm">
                <Package className="h-4 w-4" />
                Todos
              </TabsTrigger>
              <TabsTrigger value="users" className="h-auto w-full whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm">
                <Users className="h-4 w-4" />
                Usuarios
              </TabsTrigger>
              <TabsTrigger value="companies" className="h-auto w-full whitespace-normal px-2 py-2 text-center text-xs leading-tight sm:text-sm">
                <Settings className="h-4 w-4" />
                Empresas
              </TabsTrigger>
            </TabsList>
          )}

          {access.isInternal && (
            <TabsContent value="by-company" className="space-y-6">
              {Object.keys(componentsByCompany).length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No se encontraron componentes</h3>
                    <p className="text-muted-foreground">
                      Ajusta los filtros o ingresa nuevos componentes
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {Object.entries(componentsByCompany).map(([companyId, components]) => {
                    const stats = getCompanyStats(companyId);
                    return (
                      <Card key={companyId}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="company-card-icon">
                                <Building2 />
                              </div>
                              <div>
                                <CardTitle className="text-lg">{resolveCompanyName(companyId, companies)}</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                  {stats.total} componentes totales • {stats.inProgress} en proceso
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline">
                              {components.length} mostrados
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {components.map((component) => renderComponentListItem(component))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          )}

          {canAccessComponents && (
          <TabsContent value="all-components">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Lista Completa de Componentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <ComponentListSkeleton count={10} />
                ) : !components?.data.length ? (
                  <div className="py-12 text-center">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No se encontraron componentes</h3>
                    <p className="text-muted-foreground">
                      Ajusta los filtros o ingresa nuevos componentes
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {components.data.map((component) => renderComponentListItem(component, { showCompany: true }))}
                    </div>

                    {/* Pagination for All Components Tab */}
                    {components.pagination.totalPages > 1 && (
                      <div className="mt-6">
                        <PaginationControls
                          currentPage={components.pagination.page}
                          totalPages={components.pagination.totalPages}
                          totalItems={components.pagination.total}
                          itemsPerPage={itemsPerPage}
                          onPageChange={handlePageChange}
                          onItemsPerPageChange={handleItemsPerPageChange}
                          isLoading={isLoading}
                        />
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {/* User Management Tab */}
          {access.canManageUsers && (
            <TabsContent value="users">
              <UserManagement 
                currentUser={{
                  id: user.id,
                  email: user.email || '',
                  full_name: user.codigo || '',
                  role: user.role as UserManagementType['role'],
                  company_id: user.company_id || null,
                  is_active: true,
                  created_at: user.created_at,
                  created_by: 'system',
                } as UserManagementType}
              />
            </TabsContent>
          )}

          {/* Company Management Tab */}
          {access.canManageUsers && (
            <TabsContent value="companies">
              <CompanyManagement 
                currentUser={{
                  id: user.id,
                  email: user.email || '',
                  full_name: user.codigo || '',
                  role: user.role as UserManagementType['role'],
                  company_id: user.company_id || null,
                  is_active: true,
                  created_at: user.created_at,
                  created_by: 'system',
                } as UserManagementType}
              />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}