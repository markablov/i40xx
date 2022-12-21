const DIRECTIVE_START_MARKER = '%';

/*
 * Split source code to directives block and regular instructions
 *
 * Format of code:
 *
 * %directive1
 * %directive2
 * instructions....
 */
export function extractDirectives(codeRaw) {
  let currentPos = 0;
  const directives = [];
  const len = codeRaw.length;

  while (currentPos < len && codeRaw[currentPos] === DIRECTIVE_START_MARKER) {
    const directiveStart = currentPos;
    while (currentPos < len && codeRaw[currentPos] !== '\n') {
      currentPos++;
    }
    directives.push(codeRaw.substring(directiveStart, currentPos));
    currentPos++;
  }

  return { directives, sourceCode: codeRaw.substring(currentPos) };
}
