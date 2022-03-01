import parse from 'i40xx-asm';

onmessage = ({ data: sourceCode }) => {
  const { data, errors } = parse(sourceCode);

  postMessage({
    dump: data,
    errors: errors.map(({ column, line, message, token }) => ({
      column: token ? token.startColumn : column,
      row: (token ? token.startLine : line) - 1,
      text: message,
    })),
  });
};
