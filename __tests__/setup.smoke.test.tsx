import { render, screen } from '@testing-library/react';

describe('Project setup smoke tests', () => {
  it('Vitest runs a trivial test', () => {
    expect(1 + 1).toBe(2);
  });

  it('React Testing Library renders a basic component', () => {
    function HelloBridget() {
      return <div>Hello Bridget</div>;
    }

    render(<HelloBridget />);
    expect(screen.getByText('Hello Bridget')).toBeInTheDocument();
  });

  it('TypeScript strict mode enforces types', () => {
    function add(a: number, b: number): number {
      return a + b;
    }

    expect(add(2, 3)).toBe(5);
  });
});
