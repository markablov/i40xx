const AsmLexer = require('./parser/AsmLexer.js');
const AsmParser = require('./parser/AsmParser.js');

const parse = (sourceCode) => {
  const { tokens, errors: lexerErrors } = AsmLexer.tokenize(sourceCode.toLowerCase());
  if (lexerErrors.length) {
    return { errors: lexerErrors };
  }

  const data = AsmParser.parse(tokens);
  return { data, errors: AsmParser.errors };
};

module.exports = parse;
