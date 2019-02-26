import parse from './parser/parser.js';

onmessage = ({ data: sourceCode }) => {
  const { data, errors } = parse(sourceCode);

  postMessage({
    dump: data,
    errors: errors.map(({ message, token, line, column }) => ({ message, row: token ? token.startLine : line, column: token ? token.startColumn : column }))
  });
};
