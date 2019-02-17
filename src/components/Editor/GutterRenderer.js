class GutterRenderer {
  getText() {
    return 'X';
  }

  getWidth(session, lastLineNumber, config) {
    return 2 * config.characterWidth;
  }

  update(e, { renderer }) {
    renderer.$loop.schedule(renderer.CHANGE_GUTTER);
  }
}

export default GutterRenderer;
