import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import { IngetecLogo } from './IngetecLogo';

describe('IngetecLogo', () => {
  it('debe renderizar el logo', () => {
    const { container } = render(<IngetecLogo />);
    const logo = container.querySelector('svg');
    expect(logo).toBeInTheDocument();
  });

  it('debe aplicar className cuando se proporciona', () => {
    const { container } = render(<IngetecLogo className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

