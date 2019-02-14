import React from 'react';
import AceEditor from 'react-ace';
import 'brace/mode/javascript';
import 'brace/theme/monokai';

const Editor = () => (
  <>
    <AceEditor mode="javascript" theme="monokai" name="editor" width="auto" />
  </>
);

export default Editor;
