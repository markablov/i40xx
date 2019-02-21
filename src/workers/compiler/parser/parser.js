import AsmLexer from './AsmLexer.js';

const parse = sourceCode => {
  const { tokens } = AsmLexer.tokenize(sourceCode);
  return tokens;
};

export default parse;
