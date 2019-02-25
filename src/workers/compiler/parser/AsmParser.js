import { Parser, MismatchedTokenException }  from 'chevrotain';

import { Tokens, allTokens } from './tokens.js';
import CodeGenerator, { AddrType } from './CodeGenerator.js';

class AsmParser extends Parser {
  constructor() {
    super(allTokens, { outputCst: false });

    const $ = this;

    const codeGenerator = this.codeGenerator = new CodeGenerator();

    $.RULE('program', () => {
      $.AT_LEAST_ONE_SEP({
        SEP: Tokens.NewLine,
        DEF: () => $.SUBRULE($.instructionWithLabel)
      });

      try {
        return codeGenerator.generate();
      } catch (err) {
        throw $.SAVE_ERROR(new MismatchedTokenException(err.toString()));
      }
    });

    $.RULE('instructionWithLabel', () => {
      $.OPTION(() => $.SUBRULE($.label));
      $.OPTION2(() => $.SUBRULE($.instruction));
    });

    $.RULE('label', () => {
      const label = $.CONSUME(Tokens.Label);
      $.CONSUME(Tokens.Colon);

      if (!codeGenerator.addLabel(label.image))
        throw $.SAVE_ERROR(new MismatchedTokenException('Duplicated definition for label', label));
    });

    $.RULE('instruction', () => {
      $.OR([
        { ALT: () => $.SUBRULE($.instructionWithoutArg) },
        { ALT: () => $.SUBRULE($.instructionWithReg) },
        { ALT: () => $.SUBRULE($.instructionWithRegPair) },
        { ALT: () => $.SUBRULE($.instructionWithData4) },
        { ALT: () => $.SUBRULE($.instructionFIM) },
        { ALT: () => $.SUBRULE($.instructionWithAddr12) },
        { ALT: () => $.SUBRULE($.instructionISZ) },
        { ALT: () => $.SUBRULE($.instructionJCN) }
      ]);
    });

    $.RULE('instructionWithoutArg', () => {
      const instruction = $.OR([
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
        { ALT: () => $.CONSUME(Tokens.InstructionWPM) },
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

      codeGenerator.pushInstructionWithoutArg(instruction.image);
    });

    $.RULE('instructionWithReg', () => {
      const instruction = $.OR([
        { ALT: () => $.CONSUME(Tokens.InstructionLD) },
        { ALT: () => $.CONSUME(Tokens.InstructionXCH) },
        { ALT: () => $.CONSUME(Tokens.InstructionADD) },
        { ALT: () => $.CONSUME(Tokens.InstructionSUB) },
        { ALT: () => $.CONSUME(Tokens.InstructionINC) }
      ]);

      const reg = $.CONSUME(Tokens.Register);

      codeGenerator.pushInstructionWithReg(instruction.image, reg.image);
    });

    $.RULE('instructionWithRegPair', () => {
      const instruction = $.OR([
        { ALT: () => $.CONSUME(Tokens.InstructionJIN) },
        { ALT: () => $.CONSUME(Tokens.InstructionSRC) },
        { ALT: () => $.CONSUME(Tokens.InstructionFIN) }
      ]);

      const regPair = $.CONSUME(Tokens.RegisterPair);

      codeGenerator.pushInstructionWithRegPair(instruction.image, regPair.image);
    });

    $.RULE('instructionWithData4', () => {
      const instruction = $.OR([
        { ALT: () => $.CONSUME(Tokens.InstructionBBL) },
        { ALT: () => $.CONSUME(Tokens.InstructionLDM) }
      ]);

      const data = $.CONSUME(Tokens.Data);

      try {
        codeGenerator.pushInstructionWithData4(instruction.image, data.image);
      } catch (err) {
        throw $.SAVE_ERROR(new MismatchedTokenException(err.toString(), data, instruction));
      }
    });

    $.RULE('instructionFIM', () => {
      const instruction = $.CONSUME(Tokens.InstructionFIM);
      const regPair = $.CONSUME(Tokens.RegisterPair);
      const prevToken = $.CONSUME(Tokens.Comma);
      const data = $.CONSUME(Tokens.Data);

      try {
        codeGenerator.pushInstructionWithRegPairAndData8(instruction.image, regPair.image, data.image);
      } catch (err) {
        throw $.SAVE_ERROR(new MismatchedTokenException(err.toString(), data, prevToken));
      }
    });

    $.RULE('address', () => {
      return $.OR([
        { ALT: () => ({ token: $.CONSUME(Tokens.Label), type: AddrType.Label }) },
        { ALT: () => ({ token: $.CONSUME(Tokens.Data), type: AddrType.FlatAddress }) },
        { ALT: () => ({ token: $.CONSUME(Tokens.BankAddress), type: AddrType.BankAddress }) }
      ]);
    });

    $.RULE('instructionWithAddr12', () => {
      const instruction = $.OR([
        { ALT: () => $.CONSUME(Tokens.InstructionJUN) },
        { ALT: () => $.CONSUME(Tokens.InstructionJMS) }
      ]);

      const { token: addr, type } = $.SUBRULE($.address);

      try {
        codeGenerator.pushInstructionWithAddr12(instruction.image, addr.image, type);
      } catch (err) {
        throw $.SAVE_ERROR(new MismatchedTokenException(err.toString(), addr, instruction));
      }
    });

    $.RULE('instructionISZ', () => {
      const instruction = $.CONSUME(Tokens.InstructionISZ);
      const reg = $.CONSUME(Tokens.Register);
      $.CONSUME(Tokens.Comma);
      const { token: addr, type } = $.SUBRULE($.address);

      try {
        codeGenerator.pushInstructionWithRegAndAddr8(instruction.image, reg.image, addr.image, type);
      } catch (err) {
        throw $.SAVE_ERROR(new MismatchedTokenException(err.toString(), addr, reg));
      }
    });

    $.RULE('instructionJCN', () => {
      const instruction = $.CONSUME(Tokens.InstructionJCN);
      const cond = $.CONSUME(Tokens.Cond);
      $.CONSUME(Tokens.Comma);
      const { token: addr, type } = $.SUBRULE($.address);

      try {
        codeGenerator.pushInstructionWithCondAndAddr8(instruction.image, cond.image, addr.image, type);
      } catch (err) {
        throw $.SAVE_ERROR(new MismatchedTokenException(err.toString(), addr, cond));
      }
    });

    $.performSelfAnalysis();
  }

  parse(input){
    this.input = input;
    this.codeGenerator.clear();
    return this.program();
  }
}

export default new AsmParser([]);
