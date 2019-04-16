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
import { step } from '../../services/emulator.js';

import './Editor.css';

class Editor extends Component {
  state = { executingLine: undefined };

  editorRef = React.createRef();

  get editor(){
    return this.editorRef.current.editor;
  }

  setupROMOffsets(editor, session) {
    const offsetCalculator = this.offsetCalculator = new OffsetCalculator(editor);
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

    editor.commands.addCommand({
      name: 'emulatorStep',
      bindKey: { win: 'F10', mac: 'F10' },
      exec: () => {
        const emulator = this.props.emulator;
        if (emulator && emulator.running && emulator.mode === 'debug')
          step();
      },
      scrollIntoView: 'cursor',
      multiSelectAction: 'forEach',
      readOnly: true
    });

    this.setupROMOffsets(editor, session);
  }

  shouldComponentUpdate({ compilerErrors, emulator }, newState) {
    // ignore all state updates, we are waiting only for props (comes from Redux)
    if (newState !== this.state)
      return false;

    // synchronize ACE editor state with redux state
    // because ACE editor is not react component we should avoid re-rendering and
    // perform all changes via ACE Editor API
    if (this.editor) {
      // show compilation errors
      if (compilerErrors && compilerErrors.length) {
        session.setAnnotations(compilerErrors.map(error => ({ ...error, type: 'error' })));
        return false;
      }

      const debugMode = emulator.running && emulator.mode === 'debug';
      const session = this.editor.getSession();
      const { executingLine } = this.state;

      // during debug editor should be on read-only state
      const currentReadOnly = this.editor.getReadOnly();
      const expectedReadOnly = debugMode === true;
      if (currentReadOnly !== expectedReadOnly)
        this.editor.setReadOnly(expectedReadOnly);

      if (!debugMode && executingLine) {
        session.removeMarker(executingLine);
        this.setState({ executingLine: null });
      }

      if (debugMode) {
        const row = this.offsetCalculator.row(emulator.registers.pc);
        if (executingLine)
          session.removeMarker(executingLine);
        this.setState({ executingLine: session.highlightLines(row, row).id });
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
