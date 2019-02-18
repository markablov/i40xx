class GutterRenderer {
  constructor(editor, offsetCalculator) {
    this.editor = editor;
    this.offsetCalculator = offsetCalculator;
  }

  includeBank() {
    return this.offsetCalculator.offset(this.editor.getSession().getDocument().getLength()) > 255;
  }

  getText(session, row) {
    return ('00' + this.offsetCalculator.offset(row).toString(16).toUpperCase()).substr(-2);
  }

  getWidth(session, lastLineNumber, config) {
    return 4 * config.characterWidth;
  }

  update() {
    this.editor.renderer.$loop.schedule(this.editor.renderer.CHANGE_GUTTER);
  }
}

export default GutterRenderer;
