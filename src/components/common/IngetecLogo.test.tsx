import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import { IngetecLogo } from './IngetecLogo';

describe('IngetecLogo', () => {
  it('debe renderizar el logo', () => {
    render(<IngetecLogo />);
    // Buscar por texto alternativo o por rol
    const logo = screen.getByRole('img', { hidden: true }) || 
                 document.querySelector('svg');
    expect(logo).toBeInTheDocument();
  });

  it('debe aplicar className cuando se proporciona', () => {
    const { container } = render(<IngetecLogo className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

