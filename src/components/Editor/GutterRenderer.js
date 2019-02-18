class GutterRenderer {
  constructor(editor, offsetCalculator) {
    this.editor = editor;
    this.offsetCalculator = offsetCalculator;
  }

  getText(session, row) {
    return this.offsetCalculator.offset(row).toString();
  }

  getWidth(session, lastLineNumber, config) {
    return 4 * config.characterWidth;
  }

  update() {
    this.editor.renderer.$loop.schedule(this.editor.renderer.CHANGE_GUTTER);
  }
}

export default GutterRenderer;
