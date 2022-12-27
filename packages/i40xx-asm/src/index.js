const asmLexer = require('./parser/AsmLexer.js');
const asmParser = require('./parser/AsmParser.js');

const MAX_ATTEMPTS_TO_REARRANGE_CODE = 15;

/*
 * Simply compile provided code
 */
const compileOnce = (sourceCode) => {
  const { tokens, errors: lexerErrors } = asmLexer.tokenize(sourceCode.toLowerCase());
  if (lexerErrors.length) {
    return { errors: lexerErrors };
  }

  const data = asmParser.parse(tokens);
  const { functions, labelsOffsets } = asmParser.codeGenerator;
  return {
    data,
    functions: [...functions].filter((name) => labelsOffsets[name]).map((name) => ({
      name,
      bytecodeOffset: labelsOffsets[name],
      sourceCodeOffset: asmParser.labels.get(name),
    })),
    labelsOffsets,
    errors: asmParser.errors,
    sourceCode,
  };
};

/*
 * Compute necessary amount of padding NOPs to satisfy jump limitations
 */
const getPaddingCountToFixJumpIssues = (error, labelsOffsets) => {
  // just shift JCN/ISZ instruction from **:0xFE to **:0x00 location
  if (error.code === 'cond_jump_from_edge') {
    return 0x02;
  }

  const lowestOffset = Math.min(error.offset, labelsOffsets[error.label]);
  // shift either label or jump instruction to next bank (to be in same bank as corresponding jump/label)
  return 0x100 - (lowestOffset & 0xFF);
};

/*
 * Compile provided code with extra options:
 *   - allow to rearrange code to avoid i40xx jump limitations (short jump to another RAM bank, for example)
 */
const compile = (sourceCode, { tryRearrange = false } = {}) => {
  if (tryRearrange === false) {
    return compileOnce(sourceCode);
  }

  let rearrangedCode = sourceCode;

  for (let attempts = 0; attempts < MAX_ATTEMPTS_TO_REARRANGE_CODE - 1; attempts++) {
    const compilerResults = compileOnce(rearrangedCode);
    const { functions, errors, labelsOffsets } = compilerResults;
    const errorCode = errors[0]?.code;
    if (!['cond_jump_from_edge', 'short_jump_another_bank'].includes(errorCode)) {
      return compilerResults;
    }

    const sortedFns = functions.sort((a, b) => a.bytecodeOffset - b.bytecodeOffset);
    const { offset: instrOffset } = errors[0];
    const closesNextFnIdx = sortedFns.findIndex(({ bytecodeOffset }) => bytecodeOffset > instrOffset);
    const closestFn = sortedFns[(closesNextFnIdx === -1) ? (sortedFns.length - 1) : closesNextFnIdx - 1];
    const paddingCount = getPaddingCountToFixJumpIssues(errors[0], labelsOffsets);
    const compilablePart = rearrangedCode.substring(0, closestFn.sourceCodeOffset);
    const paddedPart = rearrangedCode.substring(closestFn.sourceCodeOffset);
    rearrangedCode = `${compilablePart}\n${'  NOP\n'.repeat(paddingCount)}\n${paddedPart}`;
  }

  return compileOnce(rearrangedCode);
};

module.exports = compile;
