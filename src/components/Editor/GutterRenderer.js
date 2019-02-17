class GutterRenderer {
  constructor(editor) {
    this.editor = editor;
  }

  getText() {
    return 'X';
  }

  getWidth(session, lastLineNumber, config) {
    return 2 * config.characterWidth;
  }

  update() {
    this.editor.renderer.$loop.schedule(this.editor.renderer.CHANGE_GUTTER);
  }
}

export default GutterRenderer;
