import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import { LoadingSpinner, PageLoading } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('debe renderizar el spinner', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByLabelText('Cargando');
    expect(spinner).toBeInTheDocument();
  });

  it('debe mostrar el texto cuando se proporciona', () => {
    render(<LoadingSpinner text="Cargando datos..." />);
    expect(screen.getByText('Cargando datos...')).toBeInTheDocument();
  });

  it('debe aplicar las clases de tamaño correctas', () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    const spinner = container.querySelector('.h-4');
    expect(spinner).toBeInTheDocument();
  });

  it('debe aplicar className personalizada', () => {
    const { container } = render(<LoadingSpinner className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('PageLoading', () => {
  it('debe renderizar el spinner de página completa', () => {
    render(<PageLoading />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('debe tener la clase min-h-screen', () => {
    const { container } = render(<PageLoading />);
    expect(container.firstChild).toHaveClass('min-h-screen');
  });
});

