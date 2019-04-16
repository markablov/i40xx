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
import setBreakpoints from '../../redux/actions/setBreakpoints.js';
import { step, continueExec } from '../../services/emulator.js';

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

  isDebugMode(emulator) {
    return emulator && emulator.running && emulator.mode === 'debug';
  }

  setupShortcuts(editor) {
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
        if (this.isDebugMode(this.props.emulator))
          step();
      },
      scrollIntoView: 'cursor',
      multiSelectAction: 'forEach',
      readOnly: true
    });

    editor.commands.addCommand({
      name: 'emulatorContinue',
      bindKey: { win: 'F9', mac: 'F9' },
      exec: () => {
        if (this.isDebugMode(this.props.emulator))
          continueExec();
      },
      scrollIntoView: 'cursor',
      multiSelectAction: 'forEach',
      readOnly: true
    });
  }

  setupEditor() {
    const editor = this.editor, session = editor.getSession();

    editor.$blockScrolling = Infinity;

    session.setMode(new AssemblyMode());
    session.setTabSize(2);

    editor.on('guttermousedown', e => {
      // allow to edit breakpoints only during debug
      if (!this.isDebugMode(this.props.emulator))
        return e.preventDefault();

      const row = e.getDocumentPosition().row;
      const offset = this.offsetCalculator.offset(row);
      if (session.getBreakpoints()[row]) {
        session.clearBreakpoint(row);
        delete this.props.breakpoints[offset];
        this.props.setBreakpoints(this.props.breakpoints);
      } else {
        session.setBreakpoint(row);
        this.props.setBreakpoints({ ...this.props.breakpoints, [offset]: true });
      }

      return e.preventDefault();
    });

    this.setupShortcuts(editor);
    this.setupROMOffsets(editor, session);
  }

  shouldComponentUpdate({ compilerErrors, emulator }) {
    // ignore all updates, except emulator and compilerErrors
    if (emulator === this.props.emulator && compilerErrors === this.props.compilerErrors)
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

      const debugMode = this.isDebugMode(emulator);
      const session = this.editor.getSession();
      const { executingLine } = this.state;

      // during debug editor should be on read-only state
      const currentReadOnly = this.editor.getReadOnly();
      const expectedReadOnly = debugMode === true;
      if (currentReadOnly !== expectedReadOnly)
        this.editor.setReadOnly(expectedReadOnly);

      if (debugMode) {
        const row = this.offsetCalculator.row(emulator.registers.pc);
        if (!executingLine || executingLine.row !== row) {
          if (executingLine)
            session.removeMarker(executingLine.id);
          this.setState({ executingLine: { row, id: session.highlightLines(row, row).id } });
        }
      } else {
        session.clearBreakpoints();
        this.props.setBreakpoints({});
        if (executingLine) {
          session.removeMarker(executingLine.id);
          this.setState({ executingLine: null });
        }
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

export default connect(({ compilerErrors, emulator, breakpoints }) => ({ compilerErrors, emulator, breakpoints }), { setEditorRef, setBreakpoints })(Editor);
