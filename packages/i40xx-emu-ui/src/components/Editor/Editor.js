import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/ext-searchbox';
import { Button } from 'react-bulma-components';

import OffsetCalculator from './OffsetCalculator/OffsetCalculator.js';
import AssemblyMode from './AssemblyMode/AssemblyMode.js';
import SampleCode from './SampleCode.js';
import setBreakpointsAction from '../../redux/actions/setBreakpoints.js';
import { stepInto, stepOver, continueExec } from '../../services/emulator.js';
import editorStore from '../../stores/editorStore.js';

import './Editor.css';

class Editor extends Component {
  static isDebugMode(emulator) {
    return emulator && emulator.running && emulator.mode === 'debug';
  }

  static #load = () => localStorage.getItem('source_code');

  state = {
    editorRef: React.createRef(),
    executingLine: undefined,
  };

  componentDidMount() {
    editorStore.update((state) => {
      state.editor = this.editor;
    });

    this.setupEditor();
    this.editor.setValue(Editor.#load() || SampleCode, -1);
  }

  shouldComponentUpdate() {
    // Editor have no props or state, except external compilerErrors
    // so we don't want ever to re-render component
    return false;
  }

  handleSave = () => this.#save();

  setupROMOffsets(editor) {
    const offsetCalculator = new OffsetCalculator(editor);
    this.setState({ offsetCalculator });
  }

  setupEditor() {
    const { editor } = this;
    const session = editor.getSession();

    editor.$blockScrolling = Infinity;

    session.setMode(new AssemblyMode());
    session.setTabSize(2);

    editor.on('guttermousedown', (e) => {
      const { offsetCalculator } = this.state;
      const { breakpoints, setBreakpoints } = this.props;

      const { row } = e.getDocumentPosition();
      const offset = offsetCalculator.offset(row);
      if (session.getBreakpoints()[row]) {
        session.clearBreakpoint(row);
        delete breakpoints[offset];
        setBreakpoints(breakpoints);
      } else {
        session.setBreakpoint(row);
        setBreakpoints({ ...breakpoints, [offset]: true });
      }

      return e.preventDefault();
    });

    editor.renderer.setOptions({
      fixedWidthGutter: true,
      showPrintMargin: false,
    });

    this.setupShortcuts(editor);
    this.setupROMOffsets(editor, session);
  }

  setupShortcuts(editor) {
    // ACE editor already have Ctrl+D to remove line, but i prefer Ctrl+Y
    editor.commands.addCommand({
      bindKey: { mac: 'Command-Y', win: 'Ctrl-Y' },
      exec: () => editor.removeLines(),
      multiSelectAction: 'forEachLine',
      name: 'removeline2',
      scrollIntoView: 'cursor',
    });

    editor.commands.addCommand({
      bindKey: { mac: 'F7', win: 'F7' },
      exec: () => {
        const { emulator } = this.props;

        if (Editor.isDebugMode(emulator)) {
          stepInto();
        }
      },
      multiSelectAction: 'forEach',
      name: 'emulatorStepInto',
      readOnly: true,
      scrollIntoView: 'cursor',
    });

    editor.commands.addCommand({
      bindKey: { mac: 'F8', win: 'F8' },
      exec: () => {
        const { emulator } = this.props;

        if (Editor.isDebugMode(emulator)) {
          stepOver();
        }
      },
      multiSelectAction: 'forEach',
      name: 'emulatorStepOver',
      readOnly: true,
      scrollIntoView: 'cursor',
    });

    editor.commands.addCommand({
      bindKey: { mac: 'F9', win: 'F9' },
      exec: () => {
        const { emulator } = this.props;

        if (Editor.isDebugMode(emulator)) {
          continueExec();
        }
      },
      multiSelectAction: 'forEach',
      name: 'emulatorContinue',
      readOnly: true,
    });

    editor.commands.addCommand({
      bindKey: { mac: 'Cmd-S', win: 'Ctrl-S' },
      exec: () => this.handleSave(),
      multiSelectAction: 'forEach',
      name: 'save',
    });
  }

  static getDerivedStateFromProps({ compilerErrors, emulator }, { editorRef, executingLine, offsetCalculator }) {
    const editor = editorRef.current && editorRef.current.editor;
    if (!editor) {
      return null;
    }

    const session = editor.getSession();

    // show compilation errors
    if (compilerErrors && compilerErrors.length) {
      session.setAnnotations(compilerErrors.map((error) => ({ ...error, type: 'error' })));
      return null;
    }

    const debugMode = Editor.isDebugMode(emulator);

    // during debug, editor should be on read-only state
    const currentReadOnly = editor.getReadOnly();
    const expectedReadOnly = debugMode === true;
    if (currentReadOnly !== expectedReadOnly) {
      editor.setReadOnly(expectedReadOnly);
    }

    if (debugMode) {
      const row = offsetCalculator.row(emulator.registers.pc);
      if (!executingLine || executingLine.row !== row) {
        if (executingLine) {
          session.removeMarker(executingLine.id);
        }
        const highlighted = session.highlightLines(row, row);
        editor.moveCursorTo(row, 0);
        editor.clearSelection();
        if (!editor.isRowFullyVisible(row)) {
          editor.scrollToLine(row);
        }
        return { executingLine: { id: highlighted.id, row } };
      }
    } else if (executingLine) {
      session.removeMarker(executingLine.id);
      return { executingLine: null };
    }

    return null;
  }

  get editor() {
    const { editorRef: { current: { editor } } } = this.state;
    return editor;
  }

  #save = () => localStorage.setItem('source_code', this.editor.getValue());

  render() {
    const { editorRef } = this.state;

    return (
      <>
        <AceEditor ref={editorRef} height="1024px" mode="text" name="editor" theme="monokai" width="auto" />
        <div className="buttons">
          <Button color="success" onClick={this.handleSave}>Save</Button>
        </div>
      </>
    );
  }
}

Editor.propTypes = {
  breakpoints: PropTypes.objectOf(PropTypes.bool).isRequired,

  compilerErrors: PropTypes.arrayOf(PropTypes.shape({
    column: PropTypes.number,
    row: PropTypes.number,
    text: PropTypes.string,
  })).isRequired,

  emulator: PropTypes.shape({
    mode: PropTypes.string,
    registers: PropTypes.shape({
      pc: PropTypes.number,
    }),
    running: PropTypes.bool,
  }).isRequired,

  setBreakpoints: PropTypes.func.isRequired,
};

const mapFn = connect(
  ({ breakpoints, compilerErrors, emulator }) => ({ breakpoints, compilerErrors, emulator }),
  { setBreakpoints: setBreakpointsAction },
);

export default mapFn(Editor);
