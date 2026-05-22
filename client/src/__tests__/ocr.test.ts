import {describe, it, expect} from 'vitest';
import {parseLines} from '../ocr.ts';

describe('parseLines', () => {
  it('trims and drops empty lines', () => {
    expect(parseLines('  The Blue Lotus  \n\n  Tintin \n')).toEqual([
      'The Blue Lotus',
      'Tintin',
    ]);
  });

  it('collapses internal whitespace', () => {
    expect(parseLines('The   Blue\tLotus')).toEqual(['The Blue Lotus']);
  });

  it('drops lines shorter than 2 characters', () => {
    expect(parseLines('A\nOK\n.\nDune')).toEqual(['OK', 'Dune']);
  });

  it('de-duplicates while preserving order', () => {
    expect(parseLines('Tintin\nTintin\nAsterix')).toEqual(['Tintin', 'Asterix']);
  });

  it('returns an empty array for blank input', () => {
    expect(parseLines('   \n  \n')).toEqual([]);
  });
});
