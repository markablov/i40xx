import React, { Component } from 'react';
import AceEditor from 'react-ace';
import 'brace/mode/javascript';
import 'brace/theme/monokai';

import GutterRenderer from './GutterRenderer.js';

class Editor extends Component {
  editorRef = React.createRef();

  get editor(){
    return this.editorRef.current.editor;
  }

  componentDidMount() {
    const editor = this.editor;

    // we want to show ROM offset for instructions, so need to change
    // gutter with line numbers to custom renderer
    editor.renderer.$gutterLayer.$renderer = GutterRenderer;
    editor.on('changeSelection', GutterRenderer.update);
    GutterRenderer.update(null, editor);
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
