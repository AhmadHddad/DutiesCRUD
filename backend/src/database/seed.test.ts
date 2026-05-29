import { describe, expect, it } from '@jest/globals';

import { DEFAULT_SEED_COUNT, parseSeedCount } from './seed';

describe('seed script argument parsing', () => {
  it('uses the default row count when no override is provided', () => {
    expect(parseSeedCount(['node', 'seed.ts'])).toBe(DEFAULT_SEED_COUNT);
  });

  it('parses a valid explicit count override', () => {
    expect(parseSeedCount(['node', 'seed.ts', '--count=250000'])).toBe(250000);
  });

  it('rejects an empty count override', () => {
    expect(() => parseSeedCount(['node', 'seed.ts', '--count='])).toThrow(
      'Seed count must be provided as --count=<positive integer>.'
    );
  });

  it('rejects non-integer count overrides', () => {
    expect(() => parseSeedCount(['node', 'seed.ts', '--count=1.5'])).toThrow(
      'Seed count must be a positive integer.'
    );
  });

  it('rejects zero and negative-looking count overrides', () => {
    expect(() => parseSeedCount(['node', 'seed.ts', '--count=0'])).toThrow(
      'Seed count must be a positive safe integer.'
    );
    expect(() => parseSeedCount(['node', 'seed.ts', '--count=-5'])).toThrow(
      'Seed count must be a positive integer.'
    );
  });

  it('rejects values larger than Number.MAX_SAFE_INTEGER', () => {
    expect(() => parseSeedCount(['node', 'seed.ts', '--count=9007199254740992'])).toThrow(
      'Seed count must be a positive safe integer.'
    );
  });
});
