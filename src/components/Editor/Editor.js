import React, { Component } from 'react';
import AceEditor from 'react-ace';
import 'brace/mode/javascript';
import 'brace/theme/monokai';

class Editor extends Component {
  render(){
    return (
      <>
        <AceEditor mode="javascript" theme="monokai" name="editor" width="auto" />
      </>
    );
  }
}

export default Editor;
