import { Parser, EMPTY_ALT }  from 'chevrotain';

import * as Tokens from './tokens.js';

class AsmParser extends Parser {
  constructor() {
    super(Object.values(Tokens));

    const $ = this;

    $.RULE('program', () => {
      $.AT_LEAST_ONE_SEP({
        SEP: Tokens.NewLine,
        DEF: () => {
          $.OR([
            { ALT: () => $.SUBRULE($.instruction) },
            { ALT: EMPTY_ALT() }
          ]);
        }
      });
    });

    $.RULE('instruction', () => $.CONSUME(Tokens.Text));

    $.performSelfAnalysis();
  }
}

export default new AsmParser([]);
