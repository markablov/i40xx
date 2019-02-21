import parse from './parser/parser.js';

onmessage = ({ data: sourceCode }) => {
  setTimeout(() => {
    parse(sourceCode);
    postMessage({});
  }, 1000);
};
