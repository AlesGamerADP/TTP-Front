import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button', () => {
  it('debe renderizar el botón con texto', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('debe ejecutar onClick cuando se hace clic', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('debe estar deshabilitado cuando disabled es true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('debe aplicar variantes correctamente', () => {
    const { container } = render(<Button variant="destructive">Delete</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-destructive');
  });

  it('debe aplicar tamaños correctamente', () => {
    const { container } = render(<Button size="sm">Small</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('h-8');
  });
});

