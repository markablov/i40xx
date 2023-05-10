const { EmbeddedActionsParser, MismatchedTokenException } = require('chevrotain');

const { Tokens, allTokens } = require('./tokens.js');
const { CodeGenerator, AddrType } = require('./CodeGenerator.js');

class AsmParser extends EmbeddedActionsParser {
  throwMismatchError(message, token, previousToken) {
    const errToThrow = new MismatchedTokenException(message, token, previousToken);
    throw this.SAVE_ERROR(errToThrow);
  }

  constructor() {
    super(allTokens, { outputCst: false });

    const $ = this;

    const codeGenerator = new CodeGenerator();
    this.codeGenerator = codeGenerator;

    $.RULE('program', () => {
      $.AT_LEAST_ONE_SEP({
        SEP: Tokens.NewLine,
        DEF: () => $.SUBRULE($.instructionWithLabel),
      });

      try {
        // we expect that program rule should cover whole source code
        if (this.isAtEndOfInput()) {
          return codeGenerator.generate();
        }
      } catch (err) {
        throw $.SAVE_ERROR(new MismatchedTokenException(err.toString()));
      }

      return null;
    });

    $.RULE('instructionWithLabel', () => {
      $.OPTION1(() => $.SUBRULE($.keyword));
      $.OPTION2(() => $.SUBRULE($.label));
      $.OPTION3(() => $.SUBRULE($.instruction));
    });

    $.RULE('keyword', () => {
      $.OR([
        { ALT: () => $.SUBRULE($.keywordLocationShort) },
        { ALT: () => $.SUBRULE($.keywordRomBank) },
      ]);
    });

    $.RULE('keywordLocationShort', () => {
      $.CONSUME(Tokens.KeywordLocationShort);
      $.CONSUME(Tokens.LBracket);
      const address = $.CONSUME(Tokens.ROMAddress);
      $.CONSUME(Tokens.RBracket);

      $.ACTION(() => {
        codeGenerator.addFixedLocation(address.image);
      });
    });

    $.RULE('keywordRomBank', () => {
      $.CONSUME(Tokens.KeywordRomBank);
      $.CONSUME(Tokens.LBracket);
      const bankNo = $.CONSUME(Tokens.Imm);
      $.CONSUME(Tokens.RBracket);

      $.ACTION(() => {
        codeGenerator.setBankNumber(bankNo.image);
      });
    });

    $.RULE('label', () => {
      const labelToken = $.CONSUME(Tokens.Label);
      $.CONSUME(Tokens.Colon);

      $.ACTION(() => {
        if (!codeGenerator.addLabel(labelToken.image)) {
          throw $.SAVE_ERROR(new MismatchedTokenException('Duplicated definition for label', labelToken));
        }
      });
    });

    $.RULE('instruction', () => {
      $.OR([
        { ALT: () => $.SUBRULE($.instructionWithoutArg) },
        { ALT: () => $.SUBRULE($.instructionWithReg) },
        { ALT: () => $.SUBRULE($.instructionWithRegPair) },
        { ALT: () => $.SUBRULE($.instructionWithImm4) },
        { ALT: () => $.SUBRULE($.instructionFIM) },
        { ALT: () => $.SUBRULE($.instructionWithFarAddr) },
        { ALT: () => $.SUBRULE($.instructionISZ) },
        { ALT: () => $.SUBRULE($.instructionJCN) },
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
        { ALT: () => $.CONSUME(Tokens.InstructionDCL) },
        { ALT: () => $.CONSUME(Tokens.InstructionHLT) },
        { ALT: () => $.CONSUME(Tokens.InstructionBBS) },
        { ALT: () => $.CONSUME(Tokens.InstructionLCR) },
        { ALT: () => $.CONSUME(Tokens.InstructionOR4) },
        { ALT: () => $.CONSUME(Tokens.InstructionOR5) },
        { ALT: () => $.CONSUME(Tokens.InstructionAN6) },
        { ALT: () => $.CONSUME(Tokens.InstructionAN7) },
        { ALT: () => $.CONSUME(Tokens.InstructionDB0) },
        { ALT: () => $.CONSUME(Tokens.InstructionDB1) },
        { ALT: () => $.CONSUME(Tokens.InstructionSB0) },
        { ALT: () => $.CONSUME(Tokens.InstructionSB1) },
        { ALT: () => $.CONSUME(Tokens.InstructionEIN) },
        { ALT: () => $.CONSUME(Tokens.InstructionDIN) },
        { ALT: () => $.CONSUME(Tokens.InstructionRPM) },
      ]);

      $.ACTION(() => {
        codeGenerator.pushInstructionWithoutArg(instruction.image, instruction.startLine);
      });
    });

    $.RULE('instructionWithReg', () => {
      const instruction = $.OR([
        { ALT: () => $.CONSUME(Tokens.InstructionLD) },
        { ALT: () => $.CONSUME(Tokens.InstructionXCH) },
        { ALT: () => $.CONSUME(Tokens.InstructionADD) },
        { ALT: () => $.CONSUME(Tokens.InstructionSUB) },
        { ALT: () => $.CONSUME(Tokens.InstructionINC) },
      ]);

      const reg = $.CONSUME(Tokens.Register);

      $.ACTION(() => {
        codeGenerator.pushInstructionWithReg(instruction.image, reg.image, instruction.startLine);
      });
    });

    $.RULE('instructionWithRegPair', () => {
      const instruction = $.OR([
        { ALT: () => $.CONSUME(Tokens.InstructionJIN) },
        { ALT: () => $.CONSUME(Tokens.InstructionSRC) },
        { ALT: () => $.CONSUME(Tokens.InstructionFIN) },
      ]);

      const regPair = $.CONSUME(Tokens.RegisterPair);

      $.ACTION(() => {
        codeGenerator.pushInstructionWithRegPair(instruction.image, regPair.image, instruction.startLine);
      });
    });

    $.RULE('instructionWithImm4', () => {
      const instruction = $.OR([
        { ALT: () => $.CONSUME(Tokens.InstructionBBL) },
        { ALT: () => $.CONSUME(Tokens.InstructionLDM) },
      ]);

      const imm = $.CONSUME(Tokens.Imm);

      $.ACTION(() => {
        try {
          codeGenerator.pushInstructionWithImm4(instruction.image, imm.image, instruction.startLine);
        } catch (err) {
          throw $.SAVE_ERROR(new MismatchedTokenException(err.toString(), imm, instruction));
        }
      });
    });

    $.RULE('instructionFIM', () => {
      const { image: instruction, startLine } = $.CONSUME(Tokens.InstructionFIM);
      const { image: regPair } = $.CONSUME(Tokens.RegisterPair);
      const prevToken = $.CONSUME(Tokens.Comma);
      const { image: imm } = $.CONSUME(Tokens.Imm);

      $.ACTION(() => {
        try {
          codeGenerator.pushInstructionWithRegPairAndImm8(instruction, regPair, imm, startLine);
        } catch (err) {
          throw $.SAVE_ERROR(new MismatchedTokenException(err.toString(), imm, prevToken));
        }
      });
    });

    $.RULE('address', () => $.OR([
      { ALT: () => ({ token: $.CONSUME(Tokens.Label), type: AddrType.Label }) },
      { ALT: () => ({ token: $.CONSUME(Tokens.Imm), type: AddrType.FlatAddress }) },
      { ALT: () => ({ token: $.CONSUME(Tokens.ROMAddress), type: AddrType.ROMAddress }) },
    ]));

    $.RULE('instructionWithFarAddr', () => {
      const instruction = $.OR([
        { ALT: () => $.CONSUME(Tokens.InstructionJUN) },
        { ALT: () => $.CONSUME(Tokens.InstructionJMS) },
      ]);

      const { token: addr, type } = $.SUBRULE($.address);

      $.ACTION(() => {
        codeGenerator.instructionWithFarAddr(instruction.image, addr.image, type, instruction.startLine);
      });
    });

    $.RULE('instructionISZ', () => {
      const instruction = $.CONSUME(Tokens.InstructionISZ);
      const reg = $.CONSUME(Tokens.Register);
      $.CONSUME(Tokens.Comma);
      const { token: addr, type } = $.SUBRULE($.address);

      $.ACTION(() => {
        try {
          codeGenerator.pushISZInstruction(instruction.image, reg.image, addr.image, type, instruction.startLine);
        } catch (err) {
          throw $.SAVE_ERROR(new MismatchedTokenException(err.toString(), addr, reg));
        }
      });
    });

    $.RULE('instructionJCN', () => {
      const instruction = $.CONSUME(Tokens.InstructionJCN);
      const cond = $.CONSUME(Tokens.Cond);
      $.CONSUME(Tokens.Comma);
      const { token: addr, type } = $.SUBRULE($.address);

      $.ACTION(() => {
        try {
          codeGenerator.pushJCNInstruction(instruction.image, cond.image, addr.image, type, instruction.startLine);
        } catch (err) {
          $.throwMismatchError(err.toString(), addr, cond);
        }
      });
    });

    $.performSelfAnalysis();
  }

  parse(input) {
    this.input = input;
    this.codeGenerator.clear();
    return this.program();
  }
}

module.exports = new AsmParser([]);
