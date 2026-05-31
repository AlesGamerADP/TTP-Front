import type { UserRole } from '@/lib/auth';

export const DASHBOARD_PREFETCH_ROUTES = ['/dashboard'] as const;

export const INGRESS_REQUIRED_ROLES = ['admin', 'user_manager', 'interno'] as const satisfies readonly UserRole[];
