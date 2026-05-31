export type { Company, User, UserRole } from '@/features/auth/model';
export {
  getCurrentSessionUser as getCurrentUser,
  loginSession as login,
  logoutSession as logout,
} from '@/features/auth/session';
export type {
  Component,
  ComponentEvent,
  ComponentStatus,
} from '@/features/components/model';
export {
  STATUS_LABELS,
  STATUS_ORDER,
  canUpdateToStatus,
  getNextStatus,
} from '@/features/components/model';
export {
  addComponentEventMutation as addComponentEvent,
  createComponentMutation as addNewComponent,
  deleteComponentMutation as deleteComponent,
  updateComponentStatusMutation as updateComponentStatus,
} from '@/features/components/mutations';
export {
  getCompanyComponentsQuery as getCompanyComponents,
  getComponentEventsQuery as getComponentEvents,
  getComponentQuery as getComponent,
} from '@/features/components/queries';
export {
  mockCompanies,
  mockComponentEvents,
  mockComponents,
  mockUsers,
} from '@/features/demo/mockData';
export {
  getAllMockComponents as getAllComponents,
  getMockComponentsByCompany as getComponentsByCompany,
} from '@/features/demo/selectors';
export {
  getUserDisplayName as getUserName,
} from '@/features/users/catalog';
export {
  getCompanyNameFromCatalog as getCompanyName,
  loadCompaniesCatalog as loadCompanies,
} from '@/features/companies/catalog';
