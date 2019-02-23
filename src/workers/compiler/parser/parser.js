import AsmLexer from './AsmLexer.js';
import AsmParser from './AsmParser.js';

const parse = (sourceCode, codeGenerator) => {
  const { tokens, errors: lexerErrors } = AsmLexer.tokenize(sourceCode.toLowerCase());
  if (lexerErrors.length)
    return { tokens, errors: lexerErrors };

  AsmParser.input = tokens;
  AsmParser.setCodeGenerator(codeGenerator);
  const ast = AsmParser.program();
  return { tokens, ast, errors: AsmParser.errors };
};

export default parse;
