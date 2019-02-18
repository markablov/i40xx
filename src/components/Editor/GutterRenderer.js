const toHex = value => ('00' + value.toString(16).toUpperCase()).substr(-2);

class GutterRenderer {
  constructor(editor, offsetCalculator) {
    this.editor = editor;
    this.offsetCalculator = offsetCalculator;
  }

  includeBank() {
    return this.offsetCalculator.offset(this.editor.getSession().getDocument().getLength() - 1) > 255;
  }

  getText(session, row) {
    const offset = this.offsetCalculator.offset(row);
    return this.includeBank() ? `${toHex(offset >> 8)}:${toHex(offset & 0xFF)}` : toHex(offset);
  }

  getWidth(session, lastLineNumber, config) {
    return (this.includeBank() ? 5 : 2) * config.characterWidth;
  }

  update() {
    this.editor.renderer.$loop.schedule(this.editor.renderer.CHANGE_GUTTER);
  }
}

export default GutterRenderer;
