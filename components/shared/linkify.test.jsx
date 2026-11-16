import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Linkify } from '@/components/shared/linkify';

// Proves the Vitest + jsdom + React Testing Library path end to end.
describe('Linkify', () => {
  it('renders plain text with no links', () => {
    render(<p><Linkify>just some plain text</Linkify></p>);
    expect(screen.getByText('just some plain text')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('turns an http URL into a safe new-tab anchor', () => {
    render(<p><Linkify>see https://example.com/docs now</Linkify></p>);
    const link = screen.getByRole('link', { name: 'https://example.com/docs' });
    expect(link).toHaveAttribute('href', 'https://example.com/docs');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('prepends https:// to a bare www. link', () => {
    render(<p><Linkify>visit www.example.org today</Linkify></p>);
    expect(screen.getByRole('link', { name: 'www.example.org' })).toHaveAttribute(
      'href',
      'https://www.example.org',
    );
  });

  it('stops before trailing sentence punctuation', () => {
    render(<p><Linkify>read https://example.com.</Linkify></p>);
    // the full stop is not part of the href
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com');
  });
});
