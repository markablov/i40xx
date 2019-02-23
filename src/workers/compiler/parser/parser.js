import AsmLexer from './AsmLexer.js';
import AsmParser from './AsmParser.js';

const parse = sourceCode => {
  const { tokens, errors: lexerErrors } = AsmLexer.tokenize(sourceCode.toLowerCase());
  if (lexerErrors.length)
    return { tokens, errors: lexerErrors };

  AsmParser.input = tokens;
  const data = AsmParser.program();
  return { tokens, data, errors: AsmParser.errors };
};

export default parse;
