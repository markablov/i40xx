import { compile } from 'i40xx-asm';
import { buildRom } from 'i40xx-link';

onmessage = ({ data: sourceCode }) => {
  const { blocks, errors, symbols: blockAddressedSymbols } = compile(sourceCode);
  if (errors.length) {
    postMessage({
      errors: errors.map(({ column, line, message, token }) => ({
        column: token ? token.startColumn : column,
        row: (token ? token.startLine : line) - 1,
        text: message,
      })),
      roms: null,
    });
    return;
  }

  try {
    const { roms } = buildRom(blocks, blockAddressedSymbols);
    postMessage({ errors: [], roms });
  } catch (err) {
    postMessage({ errors: [{ column: 1, row: 1, text: err.message }], roms: null });
  }
};
