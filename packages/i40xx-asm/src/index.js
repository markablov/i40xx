const asmLexer = require('./parser/AsmLexer.js');
const asmParser = require('./parser/AsmParser.js');

const parse = (sourceCode) => {
  const { tokens, errors: lexerErrors } = asmLexer.tokenize(sourceCode.toLowerCase());
  if (lexerErrors.length) {
    return { errors: lexerErrors };
  }

  const data = asmParser.parse(tokens);
  const { functions, labelsOffsets } = asmParser.codeGenerator;
  return {
    data,
    functions: [...functions].map((name) => ({
      name,
      bytecodeOffset: labelsOffsets[name],
      sourceCodeOffset: asmParser.labels.get(name),
    })),
    errors: asmParser.errors,
  };
};

module.exports = parse;
