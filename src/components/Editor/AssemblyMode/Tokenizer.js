class Tokenizer extends window.ace.acequire('ace/tokenizer').Tokenizer {
  constructor(rules, offsetCalculator) {
    super(rules);
    this.offsetCalculator = offsetCalculator;
  }

  getLineTokens(line, startState, row) {
    let { tokens, state } = super.getLineTokens(line, startState, row);
    const { offset, len } = this.offsetCalculator.instr(row);

    // check if we have bank switch here
    if ((offset & 0xF) <= ((offset + len) & 0xF))
      return { tokens, state };

    return { tokens: [...tokens, { type: 'bank_separator', value: '' }], state };
  }
}

export default Tokenizer;
