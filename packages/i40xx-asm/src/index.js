const asmLexer = require('./parser/AsmLexer.js');
const asmParser = require('./parser/AsmParser.js');
const { formBlocksFromInstructions } = require('./workers/codeBlocksShaper.js');

/*
 * Compile provided code
 */
const compile = (sourceCode) => {
  const { tokens, errors: lexerErrors } = asmLexer.tokenize(sourceCode.toLowerCase());
  if (lexerErrors.length) {
    return { errors: lexerErrors };
  }

  const parsingResult = asmParser.parse(tokens);
  if (!parsingResult) {
    return { blocks: [], errors: asmParser.errors };
  }

  try {
    const { fixedLocations, instructions } = parsingResult;
    return { blocks: formBlocksFromInstructions(fixedLocations, instructions), errors: [] };
  } catch (err) {
    return { blocks: [], errors: [err] };
  }
};

module.exports = compile;
