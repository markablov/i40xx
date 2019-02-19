import React, { Component } from 'react';
import AceEditor from 'react-ace';
import 'brace/mode/javascript';
import 'brace/theme/monokai';

import GutterRenderer from './GutterRenderer.js';
import OffsetCalculator from './OffsetCalculator/OffsetCalculator.js';
import AssemblyMode from './AssemblyMode/AssemblyMode.js';
import BankSeparatorRenderer from './BankSeparatorRenderer.js';
import SampleCode from './SampleCode.js';

import './Editor.css';

class Editor extends Component {
  editorRef = React.createRef();

  get editor(){
    return this.editorRef.current.editor;
  }

  setupROMOffsets(editor, session) {
    const offsetCalculator = new OffsetCalculator(editor);
    const gutterRenderer = new GutterRenderer(editor, offsetCalculator);
    const bankSeparatorRenderer = new BankSeparatorRenderer(editor, offsetCalculator);

    // we want to show ROM offset for instructions, so need to change
    // gutter with line numbers to custom renderer
    // (gutter annotations / decorations adds just css class, but don't change text)
    editor.renderer.$gutterLayer.$renderer = gutterRenderer;
    editor.on('changeSelection', () => gutterRenderer.update());
    gutterRenderer.update();

    session.on('change', delta => {
      if (offsetCalculator.update(delta)) {
        bankSeparatorRenderer.updateSeparatorPositions();
        gutterRenderer.update();
      }
      bankSeparatorRenderer.updateOnEditorChange(delta);
    });
  }

  componentDidMount() {
    const editor = this.editor, session = editor.getSession();

    session.setMode(new AssemblyMode());

    this.setupROMOffsets(editor, session);

    editor.setValue(SampleCode, -1);
    session.setTabSize(2);
    // ACE editor already have Ctrl+D to remove line, but i prefer Ctrl+Y
    editor.commands.addCommand({
      name: 'removeline2',
      bindKey: { win: 'Ctrl-Y', mac: 'Command-Y' },
      exec: editor => editor.removeLines(),
      scrollIntoView: 'cursor',
      multiSelectAction: 'forEachLine'
    });
  }

  render(){
    return (
      <>
        <AceEditor mode="text" theme="monokai" name="editor" width="auto" ref={this.editorRef} />
      </>
    );
  }
}

export default Editor;
