const asmLexer = require('./parser/AsmLexer.js');
const asmParser = require('./parser/AsmParser.js');

const MAX_ATTEMPTS_TO_REARRANGE_CODE = 15;

/*
 * Reflect paddings in source code, based on code generator information
 */
const insertPaddingsIntoSourceCode = (sourceCode, paddings, bytecodeOffsets, sourceCodeOffsets) => {
  const parts = [];
  const labelsForOffset = Object.fromEntries(Object.entries(bytecodeOffsets).map(([k, v]) => [v, k]));

  let currentSourceCodeOffset = 0;

  for (const { offset, paddingCount } of paddings) {
    const label = labelsForOffset[offset];
    if (!label) {
      throw Error('Something wrong happened!');
    }

    const paddingSourceCodeOffset = sourceCodeOffsets.get(label);
    parts.push(sourceCode.substring(currentSourceCodeOffset, paddingSourceCodeOffset));
    parts.push('  NOP\n'.repeat(paddingCount));
    currentSourceCodeOffset = paddingSourceCodeOffset;
  }

  parts.push(sourceCode.substring(currentSourceCodeOffset));

  return parts.join('').replace(/__location_short\(\w+\)\n/g, '');
};

/*
 * Simply compile provided code
 */
const compileOnce = (sourceCode, options = {}) => {
  const { returnSourceCode = true } = options;

  const { tokens, errors: lexerErrors } = asmLexer.tokenize(sourceCode.toLowerCase());
  if (lexerErrors.length) {
    return { errors: lexerErrors };
  }

  const data = asmParser.parse(tokens);
  const { functions, labelsOffsets, paddings } = asmParser.codeGenerator;
  return {
    data,
    functions: [...functions].filter((name) => labelsOffsets[name]).map((name) => ({
      name,
      bytecodeOffset: labelsOffsets[name],
      sourceCodeOffset: asmParser.labels.get(name),
    })),
    labelsOffsets,
    errors: asmParser.errors,
    ...(returnSourceCode && {
      sourceCode: insertPaddingsIntoSourceCode(sourceCode, paddings, labelsOffsets, asmParser.labels),
    }),
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
  // shift either label or jump instruction to next page (to be in same page as corresponding jump/label)
  return 0x100 - (lowestOffset & 0xFF);
};

/*
 * Compile provided code with extra options:
 *   - allow to rearrange code to avoid i40xx jump limitations (short jump to another ROM page, for example)
 */
const compile = (sourceCode, options = {}) => {
  const { tryRearrange = false } = options;

  if (tryRearrange === false) {
    return compileOnce(sourceCode, options);
  }

  let rearrangedCode = sourceCode;

  for (let attempts = 0; attempts < MAX_ATTEMPTS_TO_REARRANGE_CODE - 1; attempts++) {
    const compilerResults = compileOnce(rearrangedCode, options);
    const { functions, errors, labelsOffsets } = compilerResults;
    const errorCode = errors[0]?.code;
    if (!['cond_jump_from_edge', 'short_jump_another_page'].includes(errorCode)) {
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

  return compileOnce(rearrangedCode, options);
};

module.exports = compile;
