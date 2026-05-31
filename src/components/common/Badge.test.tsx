import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import { Badge } from '../ui/badge';

describe('Badge', () => {
  it('debe renderizar el badge con texto', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  it('debe aplicar variantes correctamente', () => {
    const { container } = render(<Badge variant="destructive">Error</Badge>);
    const badge = container.querySelector('div');
    expect(badge).toHaveClass('bg-destructive');
  });

  it('debe aplicar className personalizada', () => {
    const { container } = render(<Badge className="custom-class">Test</Badge>);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

