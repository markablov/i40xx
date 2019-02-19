class BankSeparatorRenderer {
  constructor(editor, offsetCalculator) {
    this.editor = editor;
    this.offsetCalculator = offsetCalculator;
    this.prevSeparators = {};
    this.currentSeparators = {};
  }

  getSeparatorsFromCode() {
    let separators = {};

    const offsets = this.offsetCalculator.all();
    for (let i = 0, len = offsets.length; i < len; i++) {
      const { offset, len } = offsets[i];
      if ((offset & 0xF) > ((offset + len) & 0xF))
        separators[i + 1] = true;
    }

    return separators;
  }

  // based on renderer.addToken(), we need to implement it by own, because we also want to remove token
  toggleSeparatorAtEditor(row, show) {
    const { session, renderer } = this.editor;
    // clear token cache
    session.bgTokenizer.lines[row] = null;
    let tokens = session.getTokens(row);

    if (show) {
      // modify token cache for row
      tokens.push({ type: 'bank_separator', value: '' });

      // need to set state of previous row to 'start' to prevent unnecessary updating cached tokens for target row
      // if state for row has changed between renders (for example we typed curvy bracket in C syntax mode)
      // tokenizer wants to re-tokenize next row instead of using cache that we modified
      // it's pretty safe to set state to 'start' for any row because we have no other states for our mode
      if (!session.bgTokenizer.states[row - 1])
        session.bgTokenizer.states[row - 1] = 'start';
    }

    renderer.updateLines(row, row);
  }

  updateSeparatorPositions() {
    this.prevSeparators = this.currentSeparators;
    this.currentSeparators = this.getSeparatorsFromCode();
  }

  updateOnEditorChange({ action, start: { row: startRow }, end: { row: endRow } }) {
    // if user modifies text with separator keeps it shown
    if (startRow === endRow) {
      if (this.currentSeparators[startRow])
        this.toggleSeparatorAtEditor(startRow, true);
      if (this.prevSeparators === this.currentSeparators)
        return;
    }

    // we want to clear previous separators
    for (const separator of Object.keys(this.prevSeparators).map(x => +x)) {
      if (separator < startRow)
        continue;
      if (action === 'remove') {
        if (separator >= startRow && separator <= endRow)
          continue;
        this.toggleSeparatorAtEditor(separator - (endRow - startRow), false);
      } else {
        this.toggleSeparatorAtEditor(separator + (endRow - startRow), false);
      }
    }

    // re-draw current separators
    for (const separator of Object.keys(this.currentSeparators).map(x => +x)) {
      if (separator < startRow)
        continue;
      this.toggleSeparatorAtEditor(separator, true);
    }

    this.prevSeparators = this.currentSeparators;
  }
}

export default BankSeparatorRenderer;
