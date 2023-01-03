const { EmbeddedActionsParser, MismatchedTokenException } = require('chevrotain');

const { Tokens, allTokens } = require('./tokens.js');
const { CodeGenerator, AddrType } = require('./CodeGenerator.js');

class AsmParser extends EmbeddedActionsParser {
  throwMismatchError(message, token, previousToken, extra) {
    const errToThrow = new MismatchedTokenException(message, token, previousToken);
    for (const [key, value] of Object.entries(extra || {})) {
      errToThrow[key] = value;
    }
    throw this.SAVE_ERROR(errToThrow);
  }

  constructor() {
    super(allTokens, { outputCst: false });

    const $ = this;

    const codeGenerator = new CodeGenerator();
    this.codeGenerator = codeGenerator;
    this.labels = new Map();

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
        if (err.meta) {
          const { label } = err.meta;
          const token = $.tokVector.find(
            ({ tokenType: { name }, image }, idx) => (
              name === 'Label' && image === label && $.tokVector[idx + 1].tokenType.name === 'Colon'
            ),
          );

          $.throwMismatchError(err.toString(), token, null, err.meta);
        }
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
      ]);
    });

    $.RULE('keywordLocationShort', () => {
      $.CONSUME(Tokens.KeywordLocationShort);
      $.CONSUME(Tokens.LBracket);
      const offset = $.CONSUME(Tokens.Data);
      $.CONSUME(Tokens.RBracket);

      $.ACTION(() => {
        codeGenerator.addCodePadding(offset.image);
      });
    });

    $.RULE('label', () => {
      const labelToken = $.CONSUME(Tokens.Label);
      $.CONSUME(Tokens.Colon);

      $.ACTION(() => {
        if (!codeGenerator.addLabel(labelToken.image)) {
          throw $.SAVE_ERROR(new MismatchedTokenException('Duplicated definition for label', labelToken));
        }

        this.labels.set(labelToken.image, labelToken.startOffset);
      });
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
        codeGenerator.pushInstructionWithoutArg(instruction.image);
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
        codeGenerator.pushInstructionWithReg(instruction.image, reg.image);
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
        codeGenerator.pushInstructionWithRegPair(instruction.image, regPair.image);
      });
    });

    $.RULE('instructionWithData4', () => {
      const instruction = $.OR([
        { ALT: () => $.CONSUME(Tokens.InstructionBBL) },
        { ALT: () => $.CONSUME(Tokens.InstructionLDM) },
      ]);

      const data = $.CONSUME(Tokens.Data);

      $.ACTION(() => {
        try {
          codeGenerator.pushInstructionWithData4(instruction.image, data.image);
        } catch (err) {
          throw $.SAVE_ERROR(new MismatchedTokenException(err.toString(), data, instruction));
        }
      });
    });

    $.RULE('instructionFIM', () => {
      const instruction = $.CONSUME(Tokens.InstructionFIM);
      const regPair = $.CONSUME(Tokens.RegisterPair);
      const prevToken = $.CONSUME(Tokens.Comma);
      const data = $.CONSUME(Tokens.Data);

      $.ACTION(() => {
        try {
          codeGenerator.pushInstructionWithRegPairAndData8(instruction.image, regPair.image, data.image);
        } catch (err) {
          throw $.SAVE_ERROR(new MismatchedTokenException(err.toString(), data, prevToken));
        }
      });
    });

    $.RULE('address', () => $.OR([
      { ALT: () => ({ token: $.CONSUME(Tokens.Label), type: AddrType.Label }) },
      { ALT: () => ({ token: $.CONSUME(Tokens.Data), type: AddrType.FlatAddress }) },
      { ALT: () => ({ token: $.CONSUME(Tokens.ROMAddress), type: AddrType.ROMAddress }) },
    ]));

    $.RULE('instructionWithAddr12', () => {
      const instruction = $.OR([
        { ALT: () => $.CONSUME(Tokens.InstructionJUN) },
        { ALT: () => $.CONSUME(Tokens.InstructionJMS) },
      ]);

      const { token: addr, type } = $.SUBRULE($.address);

      $.ACTION(() => {
        codeGenerator.pushInstructionWithAddr12(instruction.image, addr.image, type);
      });
    });

    $.RULE('instructionISZ', () => {
      const instruction = $.CONSUME(Tokens.InstructionISZ);
      const reg = $.CONSUME(Tokens.Register);
      $.CONSUME(Tokens.Comma);
      const { token: addr, type } = $.SUBRULE($.address);

      $.ACTION(() => {
        try {
          codeGenerator.pushInstructionWithRegAndAddr8(instruction.image, reg.image, addr.image, type);
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
          codeGenerator.pushInstructionWithCondAndAddr8(instruction.image, cond.image, addr.image, type);
        } catch (err) {
          $.throwMismatchError(err.toString(), addr, cond, err.meta);
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
