class HighlightRules extends window.ace.acequire('ace/mode/text_highlight_rules').TextHighlightRules {
  constructor() {
    super();

    this.$rules = {
      start: [
        { token: 'comment', regex: '(//|#).*$' },
        { token: 'entity.name.function', regex: '^\\w+:' },
      ]
    };

    this.normalizeRules();
  }
}

export default HighlightRules;
