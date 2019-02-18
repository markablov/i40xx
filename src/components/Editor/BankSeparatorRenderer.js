class BankSeparatorRenderer {
  constructor(editor, offsetCalculator) {
    this.editor = editor;
    this.offsetCalculator = offsetCalculator;
  }

  getSeparators() {
    let separators = [];

    const offsets = this.offsetCalculator.all();
    for (let i = 0, len = offsets.length; i < len; i++) {
      const { offset, len } = offsets[i];
      if ((offset & 0xF) > ((offset + len) & 0xF))
        separators.push(i + 1);
    }

    return separators;
  }

  // based on renderer.addToken(), we need to implement it by own, because we also want to remove token
  update() {
    const { session, renderer } = this.editor;

    for (const row of this.getSeparators()) {
      // clear token cache
      session.bgTokenizer.lines[row] = null;
      let tokens = session.getTokens(row);
      // modify token cache for row
      tokens.push({ type: 'bank_separator', value: '' });

      // need to set state of previous row to 'start' to prevent unnecessary updating cached tokens for target row
      // if state for row has changed between renders (for example we typed curvy bracket in C syntax mode)
      // tokenizer wants to re-tokenize next row instead of using cache that we modified
      // it's pretty safe to set state to 'start' for any row because we have no other states for our mode
      if (!session.bgTokenizer.states[row - 1])
        session.bgTokenizer.states[row - 1] = 'start';

      renderer.updateLines(row, row);
    }
  }
}

export default BankSeparatorRenderer;
