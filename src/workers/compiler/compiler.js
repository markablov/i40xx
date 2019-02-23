import parse from './parser/parser.js';
import CodeGenerator from './CodeGenerator.js';

onmessage = ({ data: sourceCode }) => {
  const codeGenerator = new CodeGenerator();
  parse(sourceCode, codeGenerator);
  const dump = codeGenerator.generate();
  postMessage({ dump });
};
