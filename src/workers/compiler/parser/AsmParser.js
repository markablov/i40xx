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
        { ALT: () => $.SUBRULE($.instructionWithoutArg) },
        { ALT: () => $.SUBRULE($.instructionWithReg) },
        { ALT: () => $.SUBRULE($.instructionWithRegPair) },
        { ALT: () => $.SUBRULE($.instructionWithData4) },
        { ALT: () => $.SUBRULE($.instructionFIM) },
        { ALT: () => $.SUBRULE($.instructionWithAddr12) },
        { ALT: () => $.SUBRULE($.instructionISZ) }
      ]);
    });

    $.RULE('instructionWithoutArg', () => {
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

    $.RULE('instructionWithReg', () => {
      $.OR([
        { ALT: () => $.CONSUME(Tokens.InstructionLD) },
        { ALT: () => $.CONSUME(Tokens.InstructionXCH) },
        { ALT: () => $.CONSUME(Tokens.InstructionADD) },
        { ALT: () => $.CONSUME(Tokens.InstructionSUB) },
        { ALT: () => $.CONSUME(Tokens.InstructionINC) }
      ]);

      $.CONSUME(Tokens.Register);
    });

    $.RULE('instructionWithRegPair', () => {
      $.OR([
        { ALT: () => $.CONSUME(Tokens.InstructionJIN) },
        { ALT: () => $.CONSUME(Tokens.InstructionSRC) },
        { ALT: () => $.CONSUME(Tokens.InstructionFIN) }
      ]);

      $.CONSUME(Tokens.RegisterPair);
    });

    $.RULE('instructionWithData4', () => {
      $.OR([
        { ALT: () => $.CONSUME(Tokens.InstructionBBL) },
        { ALT: () => $.CONSUME(Tokens.InstructionLDM) }
      ]);

      $.CONSUME(Tokens.Data);
    });

    $.RULE('instructionFIM', () => {
      $.CONSUME(Tokens.InstructionFIM);
      $.CONSUME(Tokens.RegisterPair);
      $.CONSUME(Tokens.Comma);
      $.CONSUME(Tokens.Data);
    });

    $.RULE('instructionWithAddr12', () => {
      $.OR([
        { ALT: () => $.CONSUME(Tokens.InstructionJUN) },
        { ALT: () => $.CONSUME(Tokens.InstructionJMS) }
      ]);

      $.OR2([
        { ALT: () => $.CONSUME(Tokens.Label) },
        { ALT: () => $.CONSUME(Tokens.Data) },
        { ALT: () => $.CONSUME(Tokens.BankAddress) }
      ]);
    });

    $.RULE('instructionISZ', () => {
      $.CONSUME(Tokens.InstructionISZ);
      $.CONSUME(Tokens.Register);
      $.CONSUME(Tokens.Comma);
      $.OR([
        { ALT: () => $.CONSUME(Tokens.Label) },
        { ALT: () => $.CONSUME(Tokens.Data) },
        { ALT: () => $.CONSUME(Tokens.BankAddress) }
      ]);
    });

    $.performSelfAnalysis();
  }
}

export default new AsmParser([]);
