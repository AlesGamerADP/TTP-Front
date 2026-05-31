import '@testing-library/jest-dom';
import { createElement, type ImgHTMLAttributes } from 'react';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Limpiar después de cada test
afterEach(() => {
  cleanup();
});

// Mock de next/image
type MockImageProps = ImgHTMLAttributes<HTMLImageElement>;

vi.mock('next/image', () => ({
  default: (props: MockImageProps) => createElement('img', props),
}));

// Mock de Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock de window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock de IntersectionObserver
global.IntersectionObserver = class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: number[] = [];

  disconnect() {}
  observe() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  unobserve() {}
};

