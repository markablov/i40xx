import { Parser, EMPTY_ALT }  from 'chevrotain';

import * as Tokens from './tokens.js';

class AsmParser extends Parser {
  constructor() {
    super(Object.values(Tokens));

    this.RULE('program', () => {
      this.AT_LEAST_ONE_SEP({
        SEP: Tokens.NewLine,
        DEF: () => {
          this.OR([
            { ALT: () => this.SUBRULE(this.instruction) },
            { ALT: EMPTY_ALT() }
          ]);
        }
      });
    });

    this.RULE('instruction', () => this.CONSUME(Tokens.Text));

    this.performSelfAnalysis();
  }
}

export default new AsmParser([]);
