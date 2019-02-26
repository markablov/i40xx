import parse from './parser/parser.js';

onmessage = ({ data: sourceCode }) => {
  const { data, errors } = parse(sourceCode);

  postMessage({
    dump: data,
    errors: errors.map(({ message, token, line }) => ({ message, row: token ? token.startLine : line }))
  });
};
