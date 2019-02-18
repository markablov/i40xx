class HighlightRules extends window.ace.acequire('ace/mode/text_highlight_rules').TextHighlightRules {
  constructor() {
    super();

    this.$rules = {
      start: [
      ]
    };

    this.normalizeRules();
  }
}

export default HighlightRules;
