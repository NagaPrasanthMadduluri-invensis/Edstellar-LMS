import { describe, it, expect } from 'vitest';
import { collectHashtags, extractInlineHashtags, normalizeHashtag } from '@/lib/community-hashtags';

// Mirrors server/src/common/community-hashtags.spec.ts.
describe('normalizeHashtag (client mirror)', () => {
  it('collapses #, case and whitespace, keeping first casing as label', () => {
    expect(normalizeHashtag('#Renewables')).toEqual({ tag: 'renewables', label: 'Renewables' });
    expect(normalizeHashtag('  renewables ')).toEqual({ tag: 'renewables', label: 'renewables' });
  });

  it('strips non letter/digit/underscore characters', () => {
    expect(normalizeHashtag('foo-bar!')).toEqual({ tag: 'foobar', label: 'foobar' });
  });

  it('returns null for empty / bare # / non-string', () => {
    expect(normalizeHashtag('')).toBeNull();
    expect(normalizeHashtag('#')).toBeNull();
    expect(normalizeHashtag(42)).toBeNull();
  });
});

describe('extractInlineHashtags / collectHashtags (client mirror)', () => {
  it('extracts inline #tokens', () => {
    expect(extractInlineHashtags('go #Solar and #wind_power')).toEqual(['#Solar', '#wind_power']);
  });

  it('de-duplicates by tag with first label winning', () => {
    expect(collectHashtags(['#Solar', 'solar', ' SOLAR '])).toEqual([{ tag: 'solar', label: 'Solar' }]);
  });

  it('handles a nullish list', () => {
    expect(collectHashtags(undefined)).toEqual([]);
  });
});
