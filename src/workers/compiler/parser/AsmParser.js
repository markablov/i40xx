import { Parser }  from 'chevrotain';

import { Tokens, allTokens } from './tokens.js';

class AsmParser extends Parser {
  constructor() {
    super(allTokens);

    const $ = this;

    $.RULE('program', () => {
      $.AT_LEAST_ONE_SEP({
        SEP: Tokens.NewLine,
        DEF: () => $.SUBRULE($.instructionWithLabel)
      });
    });

    $.RULE('instructionWithLabel', () => {
      $.OPTION(() => $.SUBRULE($.label));
      $.OPTION2(() => $.SUBRULE($.instruction));
    });

    $.RULE('label', () => {
      $.CONSUME(Tokens.Label);
      $.CONSUME(Tokens.Colon);
    });

    $.RULE('instruction', () => {
      $.OR([
        { ALT: () => $.CONSUME(Tokens.InstructionNOP) },
        { ALT: () => $.CONSUME(Tokens.InstructionRDM) },
        { ALT: () => $.CONSUME(Tokens.InstructionRD0) },
        { ALT: () => $.CONSUME(Tokens.InstructionRD1) },
        { ALT: () => $.CONSUME(Tokens.InstructionRD2) },
        { ALT: () => $.CONSUME(Tokens.InstructionRD3) },
        { ALT: () => $.CONSUME(Tokens.InstructionRDR) },
        { ALT: () => $.CONSUME(Tokens.InstructionWRM) },
        { ALT: () => $.CONSUME(Tokens.InstructionWR0) },
        { ALT: () => $.CONSUME(Tokens.InstructionWR1) },
        { ALT: () => $.CONSUME(Tokens.InstructionWR2) },
        { ALT: () => $.CONSUME(Tokens.InstructionWR3) },
        { ALT: () => $.CONSUME(Tokens.InstructionWRR) },
        { ALT: () => $.CONSUME(Tokens.InstructionWMP) },
        { ALT: () => $.CONSUME(Tokens.InstructionADM) },
        { ALT: () => $.CONSUME(Tokens.InstructionSBM) },
        { ALT: () => $.CONSUME(Tokens.InstructionCLB) },
        { ALT: () => $.CONSUME(Tokens.InstructionCLC) },
        { ALT: () => $.CONSUME(Tokens.InstructionCMC) },
        { ALT: () => $.CONSUME(Tokens.InstructionSTC) },
        { ALT: () => $.CONSUME(Tokens.InstructionCMA) },
        { ALT: () => $.CONSUME(Tokens.InstructionIAC) },
        { ALT: () => $.CONSUME(Tokens.InstructionDAC) },
        { ALT: () => $.CONSUME(Tokens.InstructionRAL) },
        { ALT: () => $.CONSUME(Tokens.InstructionRAR) },
        { ALT: () => $.CONSUME(Tokens.InstructionTCC) },
        { ALT: () => $.CONSUME(Tokens.InstructionDAA) },
        { ALT: () => $.CONSUME(Tokens.InstructionTCS) },
        { ALT: () => $.CONSUME(Tokens.InstructionKBP) },
        { ALT: () => $.CONSUME(Tokens.InstructionDCL) }
      ]);
    });

    $.performSelfAnalysis();
  }
}

export default new AsmParser([]);
