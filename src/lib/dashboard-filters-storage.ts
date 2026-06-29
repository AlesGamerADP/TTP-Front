import { sessionStorage as sessionStore } from './storage';

export interface DashboardFiltersState {
  search?: string;
  status?: string;
  companyId?: string;
}

const STORAGE_KEY = 'dashboardFilters';

export function loadDashboardFilters(scope: 'client' | 'internal'): DashboardFiltersState {
  const ui = sessionStore.getUIState();
  const all = (ui?.filters as Record<string, DashboardFiltersState> | undefined) ?? {};
  return all[scope] ?? {};
}

export function saveDashboardFilters(scope: 'client' | 'internal', filters: DashboardFiltersState): void {
  const ui = sessionStore.getUIState() ?? {};
  const all = (ui.filters as Record<string, DashboardFiltersState> | undefined) ?? {};
  sessionStore.saveUIState({
    ...ui,
    filters: { ...all, [scope]: filters },
  });

  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`${STORAGE_KEY}:${scope}`, JSON.stringify(filters));
    }
  } catch {
    // ignore
  }
}

export function loadDashboardFiltersPersistent(scope: 'client' | 'internal'): DashboardFiltersState {
  const fromSession = loadDashboardFilters(scope);
  if (Object.keys(fromSession).length > 0) return fromSession;

  try {
    if (typeof window === 'undefined') return {};
    const raw = window.localStorage.getItem(`${STORAGE_KEY}:${scope}`);
    return raw ? (JSON.parse(raw) as DashboardFiltersState) : {};
  } catch {
    return {};
  }
}
