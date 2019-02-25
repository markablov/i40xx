/* eslint-env jest */

import parse from '../parser/parser.js';

test('RDM instruction', () => {
  const { data } = parse('rdm');
  expect(data.subarray(0, 1)).toEqual(new Uint8Array([0xE9]));
});
