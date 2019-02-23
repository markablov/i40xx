import parse from './parser/parser.js';

onmessage = ({ data: sourceCode }) => {
  const { data } = parse(sourceCode);
  postMessage({ dump: data });
};
