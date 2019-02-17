import React, { Component } from 'react';
import AceEditor from 'react-ace';
import 'brace/mode/javascript';
import 'brace/theme/monokai';

import GutterRenderer from './GutterRenderer.js';
import OffsetCalculator from './OffsetCalculator.js';

class Editor extends Component {
  editorRef = React.createRef();
  offsetCalculator = new OffsetCalculator();

  get editor(){
    return this.editorRef.current.editor;
  }

  componentDidMount() {
    const editor = this.editor, session = editor.getSession();

    // we want to show ROM offset for instructions, so need to change
    // gutter with line numbers to custom renderer
    // (gutter annotations / decorations adds just css class, but don't change text)
    editor.renderer.$gutterLayer.$renderer = GutterRenderer;
    editor.on('changeSelection', GutterRenderer.update);
    GutterRenderer.update(null, editor);

    session.on('change', delta => {
      this.offsetCalculator.update(delta);
    });
  }

  render(){
    return (
      <>
        <AceEditor mode="javascript" theme="monokai" name="editor" width="auto" ref={this.editorRef} />
      </>
    );
  }
}

export default Editor;
