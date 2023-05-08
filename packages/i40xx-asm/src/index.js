const asmLexer = require('./parser/AsmLexer.js');
const asmParser = require('./parser/AsmParser.js');
const { formBlocksFromInstructions } = require('./workers/codeBlocksShaper.js');

/*
 * Parse provided code and returns raw array of instructions
 */
const parse = (sourceCode) => {
  const { tokens, errors: lexerErrors } = asmLexer.tokenize(sourceCode.toLowerCase());
  if (lexerErrors.length) {
    return { errors: lexerErrors };
  }

  const parsingResult = asmParser.parse(tokens);
  if (!parsingResult) {
    for (const err of asmParser.errors) {
      if (err.token) {
        err.line = sourceCode.split('\n')[err.token.startLine - 1];
      }
    }

    return { errors: asmParser.errors };
  }

  return parsingResult;
};

/*
 * Compile provided code
 */
const compile = (sourceCode) => {
  const { fixedLocations, instructions, symbols: instructionAddressedSymbols, errors } = parse(sourceCode);
  if (errors) {
    return { blocks: [], errors };
  }

  try {
    const { blocks, symbols } = formBlocksFromInstructions(fixedLocations, instructions, instructionAddressedSymbols);
    return { blocks, symbols, errors: [] };
  } catch (err) {
    return { blocks: [], errors: [err] };
  }
};

module.exports = {
  parse,
  compile,
};
