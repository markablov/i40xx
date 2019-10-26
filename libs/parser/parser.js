import AsmLexer from './AsmLexer.js';
import AsmParser from './AsmParser.js';

const parse = sourceCode => {
  const { tokens, errors: lexerErrors } = AsmLexer.tokenize(sourceCode.toLowerCase());
  if (lexerErrors.length)
    return { errors: lexerErrors };

  const data = AsmParser.parse(tokens);
  return { data, errors: AsmParser.errors };
};

export default parse;
