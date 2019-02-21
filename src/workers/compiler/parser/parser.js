import { Lexer }  from 'chevrotain';

import * as Tokens from './tokens.js';

const AsmLexer = new Lexer(Object.values(Tokens));

const parse = sourceCode => {
  const { tokens } = AsmLexer.tokenize(sourceCode);
  return tokens;
};

export default parse;
