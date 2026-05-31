import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ErrorBoundaryWrapper } from '@/components/common/ErrorBoundaryWrapper';

/**
 * Render helper con providers necesarios
 */
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <ErrorBoundaryWrapper>{children}</ErrorBoundaryWrapper>;
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

