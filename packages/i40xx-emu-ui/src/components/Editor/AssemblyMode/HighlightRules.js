const INTEL_40XX_INSTRUCTIONS = [
  'nop', 'rdm', 'rd0', 'rd1', 'rd2', 'rd3', 'rdr', 'wrm', 'wr0', 'wr1', 'wr2', 'wr3', 'wrr', 'wmp', 'adm', 'sbm', 'clb',
  'clc', 'cmc', 'stc', 'cma', 'iac', 'dac', 'ral', 'rar', 'tcc', 'daa', 'tcs', 'kbp', 'dcl', 'ldm', 'ld', 'xch', 'add',
  'sub', 'inc', 'bbl', 'jin', 'src', 'fin', 'jun', 'jms', 'jcn', 'isz', 'fim', 'wpm', 'hlt', 'bbs', 'lcr', 'or4', 'or5',
  'an6', 'an7', 'db0', 'db1', 'sb0', 'sb1', 'ein', 'din', 'rpm',
];

class HighlightRules extends window.ace.acequire('ace/mode/text_highlight_rules').TextHighlightRules {
  constructor() {
    super();

    this.$rules = {
      start: [
        {
          regex: '(?://|#).*$',
          token: 'comment',
        },
        {
          regex: '^\\w+:',
          token: 'entity.name.function',
        },
        {
          caseInsensitive: true,
          regex: `\\b(?:${INTEL_40XX_INSTRUCTIONS.join('|')})\\b`,
          token: 'keyword.control',
        },
        {
          caseInsensitive: true,
          regex: '\\b(?:r\\d|rr\\d{1,2}|n?(?:z|c|t|zc|zt|ct|zct))\\b',
          token: 'variable',
        },
        {
          regex: '\\b[0-9]+\\b',
          token: 'constant.character.decimal',
        },
        {
          caseInsensitive: true,
          regex: '\\b0x[A-F0-9]+\\b',
          token: 'constant.character.hexadecimal',
        },
      ],
    };

    this.normalizeRules();
  }
}

export default HighlightRules;
