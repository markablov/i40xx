import React, { Component } from 'react';
import AceEditor from 'react-ace';
import 'brace/mode/javascript';
import 'brace/theme/monokai';

class Editor extends Component {
  editorRef = React.createRef();

  get editor(){
    return this.editorRef.current.editor;
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
