class HighlightRules extends window.ace.acequire('ace/mode/text_highlight_rules').TextHighlightRules {
  constructor() {
    super();

    this.$rules = {
      start: [
        {
          token: 'comment',
          regex: '(?://|#).*$'
        },
        {
          token: 'entity.name.function',
          regex: '^\\w+:'
        },
        {
          token: 'keyword.control',
          regex: '\\b(?:nop|ldm|ld|xch|add|sub|inc|bbl|jin|src|fin|jun|jms|jcn|isz|fim|rdm|rd0|rd1|rd2|rd3|rdr|wrm|wr0|wr1|wr2|wr3|wrr|wmp|adm|sbm|clb|clc|cmc|stc|cma|iac|dac|ral|rar|tcc|daa|tcs|kbp|dcl)\\b',
          caseInsensitive: true
        },
        {
          token: 'variable',
          regex: '\\b(?:r\\d|rr\\d|n?(?:z|c|t|zc|zt|ct|zct))\\b',
          caseInsensitive: true
        },
        {
          token: 'constant.character.decimal',
          regex: '\\b[0-9]+\\b'
        },
        {
          token: 'constant.character.hexadecimal',
          regex: '\\b0x[A-F0-9]+\\b',
          caseInsensitive: true
        },
      ]
    };

    this.normalizeRules();
  }
}

export default HighlightRules;
