import { mockComponents, mockUsers } from './mockData';

export function getMockUserName(userId: string): string {
  const user = mockUsers.find((item) => item.id === userId);
  return user?.codigo || '';
}

export function getAllMockComponents() {
  return mockComponents;
}

export function getMockComponentsByCompany(companyId: string) {
  return mockComponents.filter((component) => component.company_id === companyId);
}
