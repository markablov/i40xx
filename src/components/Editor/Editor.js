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

    const gutterRenderer = new GutterRenderer();

    // we want to show ROM offset for instructions, so need to change
    // gutter with line numbers to custom renderer
    // (gutter annotations / decorations adds just css class, but don't change text)
    editor.renderer.$gutterLayer.$renderer = gutterRenderer;
    editor.on('changeSelection', ev => gutterRenderer.update(ev, editor));
    gutterRenderer.update(null, editor);

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
