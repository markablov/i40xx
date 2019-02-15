class GutterRenderer {
  static getText() {
    return 'X';
  }

  static getWidth(session, lastLineNumber, config) {
    return 2 * config.characterWidth;
  }

  static update(e, { renderer }) {
    renderer.$loop.schedule(renderer.CHANGE_GUTTER);
  }
}

export default GutterRenderer;
