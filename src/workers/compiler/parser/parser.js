import AsmLexer from './AsmLexer.js';
import AsmParser from './AsmParser.js';

const parse = sourceCode => {
  const { tokens } = AsmLexer.tokenize(sourceCode.toLowerCase());
  AsmParser.input = tokens;
  const ast = AsmParser.program();
  return { tokens, ast, errors: AsmParser.errors };
};

export default parse;
