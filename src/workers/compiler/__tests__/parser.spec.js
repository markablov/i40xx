/* eslint-env jest */

import parse from '../parser/parser.js';

const matchParseResults = (source, data, error) => {
  const { errors: parseErrors, data: parseData } = parse(source);
  return error
    ? (expect(parseErrors).toHaveLength(1) && expect(parseErrors[0]).toMatch(error))
    : expect(parseData).toEqual(new Uint8Array(data));
};

test('RDM instruction', () => {
  matchParseResults('rdm', [0xE9]);
});
