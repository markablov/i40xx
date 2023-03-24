import { compile } from 'i40xx-asm';
import { buildRom } from 'i40xx-link';

onmessage = ({ data: sourceCode }) => {
  const { blocks, errors, symbols: blockAddressedSymbols } = compile(sourceCode);
  if (errors.length) {
    postMessage({
      dump: null,
      errors: errors.map(({ column, line, message, token }) => ({
        column: token ? token.startColumn : column,
        row: (token ? token.startLine : line) - 1,
        text: message,
      })),
      sourceMap: [],
    });
    return;
  }

  try {
    const { rom, sourceMap } = buildRom(blocks, blockAddressedSymbols);
    postMessage({ dump: rom, errors: [], sourceMap });
  } catch (err) {
    postMessage({ dump: null, errors: [{ column: 1, row: 1, text: err.message }], sourceMap: [] });
  }
};
