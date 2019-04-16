import React, { Component } from 'react';
import { connect } from 'react-redux';
import AceEditor from 'react-ace';
import 'brace/mode/javascript';
import 'brace/theme/monokai';

import GutterRenderer from './GutterRenderer.js';
import OffsetCalculator from './OffsetCalculator/OffsetCalculator.js';
import AssemblyMode from './AssemblyMode/AssemblyMode.js';
import BankSeparatorRenderer from './BankSeparatorRenderer.js';
import SampleCode from './SampleCode.js';
import setEditorRef from '../../redux/actions/setEditorRef.js';

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

  setupEditor() {
    const editor = this.editor, session = editor.getSession();

    editor.$blockScrolling = Infinity;

    session.setMode(new AssemblyMode());
    session.setTabSize(2);

    // ACE editor already have Ctrl+D to remove line, but i prefer Ctrl+Y
    editor.commands.addCommand({
      name: 'removeline2',
      bindKey: { win: 'Ctrl-Y', mac: 'Command-Y' },
      exec: editor => editor.removeLines(),
      scrollIntoView: 'cursor',
      multiSelectAction: 'forEachLine'
    });

    this.setupROMOffsets(editor, session);
  }

  shouldComponentUpdate({ compilerErrors, emulator }) {
    // synchronize ACE editor state with redux state
    // because ACE editor is not react component we should avoid re-rendering and
    // perform all changes via ACE Editor API
    if (this.editor) {
      // during debug editor should be on read-only state
      const currentReadOnly = this.editor.getReadOnly();
      const expectedReadOnly = emulator.running && emulator.mode === 'debug';
      if (currentReadOnly !== expectedReadOnly)
        this.editor.setReadOnly(expectedReadOnly);

      // show compilation errors
      if (compilerErrors && compilerErrors.length) {
        this.editor.getSession().setAnnotations(compilerErrors.map(error => ({ ...error, type: 'error' })));
        return false;
      }
    }

    // Editor have no props or state, except external compilerErrors
    // so we don't want ever to re-render component
    return false;
  }

  componentDidMount() {
    this.props.setEditorRef(this.editor);
    this.setupEditor();
    this.editor.setValue(SampleCode, -1);
  }

  render(){
    return (
      <>
        <AceEditor mode="text" theme="monokai" name="editor" width="auto" ref={this.editorRef} />
      </>
    );
  }
}

export default connect(({ compilerErrors, emulator }) => ({ compilerErrors, emulator }), { setEditorRef })(Editor);
